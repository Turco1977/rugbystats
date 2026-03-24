"use client";
// v3 - auto-load comparador, no demo data
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import type { Division } from "@/lib/types/domain";

interface PartidoHistorial {
  id: string;
  division: Division;
  rama: string;
  puntos_local: number;
  puntos_visitante: number;
  status: string;
  created_at: string;
  equipo_local: { name: string; short_name: string } | null;
  equipo_visitante: { name: string; short_name: string } | null;
  jornada: { name: string; date: string } | null;
}

interface EventoHistorial {
  id: string;
  modulo: string;
  perspectiva: string;
  data: Record<string, string>;
  session: { partido_id: string } | null;
}

const DIVISIONS = ["M19", "M17", "M16", "M15"] as const;
const RAMAS = ["Todos", "A", "B", "C"] as const;

export default function HistorialPage() {
  const [selectedDivision, setSelectedDivision] = useState<string>("M19");
  const [selectedRama, setSelectedRama] = useState<string>("Todos");
  const [partidos, setPartidos] = useState<PartidoHistorial[]>([]);
  const [eventos, setEventos] = useState<EventoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
    async function fetchHistorial() {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from("partidos")
        .select(`
          id, division, rama, puntos_local, puntos_visitante, status, created_at,
          equipo_local:teams!equipo_local_id(name, short_name),
          equipo_visitante:teams!equipo_visitante_id(name, short_name),
          jornada:jornadas!jornada_id(name, date)
        `)
        .eq("status", "finished")
        .order("created_at", { ascending: false });

      query = query.eq("division", selectedDivision);
      if (selectedRama !== "Todos") {
        query = query.eq("rama", selectedRama);
      }

      const { data } = await query;
      const matchData = (data || []) as unknown as PartidoHistorial[];
      setPartidos(matchData);

      // Fetch eventos for these partidos
      if (matchData.length > 0) {
        const partidoIds = matchData.map((p) => p.id);
        // Try direct partido_id first, then fallback to session_id
        const { data: evDirect } = await supabase
          .from("eventos")
          .select("id, modulo, perspectiva, data")
          .in("partido_id", partidoIds);

        if (evDirect && evDirect.length > 0) {
          setEventos(evDirect as unknown as EventoHistorial[]);
        } else {
          // Fallback: through sessions
          const { data: sessions } = await supabase
            .from("sessions")
            .select("id")
            .in("partido_id", partidoIds);
          if (sessions && sessions.length > 0) {
            const { data: evData } = await supabase
              .from("eventos")
              .select("id, modulo, perspectiva, data")
              .in("session_id", sessions.map((s: { id: string }) => s.id));
            if (evData) setEventos(evData as unknown as EventoHistorial[]);
          } else {
            setEventos([]);
          }
        }
      } else {
        setEventos([]);
      }

      setLoading(false);
    }
    fetchHistorial();
  }, [selectedDivision, selectedRama]);

  // Filter by date
  const filteredPartidos = searchDate
    ? partidos.filter((p) => p.jornada?.date?.includes(searchDate))
    : partidos;

  // Compute module stats from eventos
  const moduleStats: Record<string, { propio: number; rival: number }> = {};
  for (const ev of eventos) {
    if (!moduleStats[ev.modulo]) moduleStats[ev.modulo] = { propio: 0, rival: 0 };
    if (ev.perspectiva === "propio" || ev.perspectiva === "rival") {
      moduleStats[ev.modulo][ev.perspectiva]++;
    } else {
      // Default to propio for modules without perspective
      moduleStats[ev.modulo].propio++;
    }
  }

  // Win/loss/draw counts
  const wins = filteredPartidos.filter((p) => p.puntos_local > p.puntos_visitante).length;
  const losses = filteredPartidos.filter((p) => p.puntos_local < p.puntos_visitante).length;
  const draws = filteredPartidos.filter((p) => p.puntos_local === p.puntos_visitante).length;
  const totalPF = filteredPartidos.reduce((s, p) => s + p.puntos_local, 0);
  const totalPC = filteredPartidos.reduce((s, p) => s + p.puntos_visitante, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-nv dark:text-white">Historial de Temporada</h2>
          <p className="text-xs text-g-4 mt-0.5">Torneo Apertura 2026</p>
        </div>
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="text-xs px-3 py-1.5 rounded border border-dk-3 bg-dk-2 text-white"
        />
      </div>

      {/* Division filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {DIVISIONS.map((div) => (
          <button
            key={div}
            onClick={() => { setSelectedDivision(div); setSelectedRama("Todos"); }}
            className={`text-xs font-bold px-4 py-2 rounded-md whitespace-nowrap transition-colors ${
              div === selectedDivision
                ? "bg-nv text-white"
                : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"
            }`}
          >
            {div}
          </button>
        ))}
      </div>

      {/* Rama filter (A/B/C) */}
      <div className="flex gap-2 mb-4">
        {RAMAS.map((rama) => (
          <button
            key={rama}
            onClick={() => setSelectedRama(rama)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
              rama === selectedRama
                ? "bg-gn text-white"
                : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"
            }`}
          >
            {rama === "Todos" ? "Todos" : `${selectedDivision} ${rama}`}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        <div className="card-compact text-center">
          <p className="text-[10px] text-g-4 font-semibold uppercase">PJ</p>
          <p className="text-xl font-extrabold text-nv dark:text-white">{filteredPartidos.length}</p>
        </div>
        <div className="card-compact text-center">
          <p className="text-[10px] text-gn font-semibold uppercase">G</p>
          <p className="text-xl font-extrabold text-gn">{wins}</p>
        </div>
        <div className="card-compact text-center">
          <p className="text-[10px] text-rd font-semibold uppercase">P</p>
          <p className="text-xl font-extrabold text-rd">{losses}</p>
        </div>
        <div className="card-compact text-center">
          <p className="text-[10px] text-g-4 font-semibold uppercase">PF</p>
          <p className="text-xl font-extrabold text-nv dark:text-white">{totalPF}</p>
        </div>
        <div className="card-compact text-center">
          <p className="text-[10px] text-g-4 font-semibold uppercase">PC</p>
          <p className="text-xl font-extrabold text-nv dark:text-white">{totalPC}</p>
        </div>
      </div>

      {/* Results table */}
      <div className="card !p-0 overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-dk-2">
              <th className="text-left text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">División</th>
              <th className="text-left text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">Rival</th>
              <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">Res.</th>
              <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">Score</th>
              <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">Fecha</th>
              <th className="text-[10px] py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-g-4 animate-pulse">
                  Cargando historial...
                </td>
              </tr>
            ) : filteredPartidos.length > 0 ? (
              filteredPartidos.map((p) => {
                const isWin = p.puntos_local > p.puntos_visitante;
                const isDraw = p.puntos_local === p.puntos_visitante;
                const rival = p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—";
                const dateStr = p.jornada?.date
                  ? new Date(p.jornada.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                  : new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                return (
                  <tr key={p.id} className="border-t border-dk-3 hover:bg-dk-2 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="text-xs font-bold text-nv dark:text-white">{p.division} {p.rama || ""}</span>
                    </td>
                    <td className="py-2.5 px-3 text-xs font-semibold text-g-5 dark:text-dk-4">{rival}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isWin ? "bg-gn/20 text-gn" : isDraw ? "bg-yellow-500/20 text-yellow-400" : "bg-rd/20 text-rd"
                      }`}>
                        {isWin ? "G" : isDraw ? "E" : "P"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs font-bold text-white">
                      {p.puntos_local} - {p.puntos_visitante}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[10px] text-g-4">{dateStr}</td>
                    <td className="py-2.5 px-3 text-right">
                      <a href={`/partido/${p.id}`} className="text-[10px] text-bl hover:underline">
                        Ver →
                      </a>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-g-4">
                  No hay partidos finalizados para {selectedDivision}{selectedRama !== "Todos" ? ` ${selectedRama}` : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Accumulated module stats */}
      <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
        Acumulado por Módulo — {selectedDivision}{selectedRama !== "Todos" ? ` ${selectedRama}` : ""}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {MODULE_CONFIG.map((mod) => {
          const data = moduleStats[mod.id] || { propio: 0, rival: 0 };
          const total = data.propio + data.rival;
          const propioPercent = total > 0 ? Math.round((data.propio / total) * 100) : 50;

          return (
            <a
              key={mod.id}
              href={`/${mod.id === "SALIDA" ? "salidas" : mod.id.toLowerCase()}`}
              className="card-compact hover:ring-2 hover:ring-nv transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{mod.icon}</span>
                <span className="text-[10px] font-bold text-g-4 uppercase tracking-wider">{mod.label}</span>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-dk-3 mb-2">
                <div className="bg-gn rounded-l-full" style={{ width: `${propioPercent}%` }} />
                <div className="bg-rd rounded-r-full" style={{ width: `${100 - propioPercent}%` }} />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="font-bold text-gn">P: {data.propio}</span>
                <span className="font-bold text-rd">R: {data.rival}</span>
              </div>
              <p className="text-[10px] text-g-3 mt-1">Total: {total}</p>
            </a>
          );
        })}
      </div>

      {/* Comparador */}
      <Comparador division={selectedDivision} />
    </div>
  );
}

// --- Comparador Component (auto-loads) ---
function Comparador({ division }: { division: string }) {
  const [ramaA, setRamaA] = useState("A");
  const [ramaB, setRamaB] = useState("B");
  const [statsA, setStatsA] = useState<Record<string, { propio: number; rival: number }>>({});
  const [statsB, setStatsB] = useState<Record<string, { propio: number; rival: number }>>({});
  const [summaryA, setSummaryA] = useState({ pj: 0, g: 0, p: 0, pf: 0, pc: 0 });
  const [summaryB, setSummaryB] = useState({ pj: 0, g: 0, p: 0, pf: 0, pc: 0 });
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchRamaStats = useCallback(async (rama: string) => {
    const supabase = createClient();

    const { data: partidos } = await supabase
      .from("partidos")
      .select("id, puntos_local, puntos_visitante")
      .eq("division", division)
      .eq("rama", rama)
      .eq("status", "finished");

    const matches = partidos || [];
    const summary = {
      pj: matches.length,
      g: matches.filter((p: { puntos_local: number; puntos_visitante: number }) => p.puntos_local > p.puntos_visitante).length,
      p: matches.filter((p: { puntos_local: number; puntos_visitante: number }) => p.puntos_local < p.puntos_visitante).length,
      pf: matches.reduce((s: number, p: { puntos_local: number }) => s + p.puntos_local, 0),
      pc: matches.reduce((s: number, p: { puntos_visitante: number }) => s + p.puntos_visitante, 0),
    };

    const partidoIds = matches.map((p: { id: string }) => p.id);
    const moduleStats: Record<string, { propio: number; rival: number }> = {};

    if (partidoIds.length > 0) {
      // Try direct partido_id
      const { data: evDirect } = await supabase
        .from("eventos")
        .select("modulo, perspectiva")
        .in("partido_id", partidoIds);

      const evList = evDirect && evDirect.length > 0 ? evDirect : [];

      if (evList.length === 0) {
        // Fallback: through sessions
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id")
          .in("partido_id", partidoIds);

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map((s: { id: string }) => s.id);
          const { data: eventos } = await supabase
            .from("eventos")
            .select("modulo, perspectiva")
            .in("session_id", sessionIds);

          if (eventos) {
            for (const ev of eventos) {
              if (!moduleStats[ev.modulo]) moduleStats[ev.modulo] = { propio: 0, rival: 0 };
              const persp: "propio" | "rival" = ev.perspectiva === "rival" ? "rival" : "propio";
              moduleStats[ev.modulo][persp]++;
            }
          }
        }
      } else {
        for (const ev of evList) {
          if (!moduleStats[ev.modulo]) moduleStats[ev.modulo] = { propio: 0, rival: 0 };
          const persp: "propio" | "rival" = ev.perspectiva === "rival" ? "rival" : "propio";
          moduleStats[ev.modulo][persp]++;
        }
      }
    }

    return { stats: moduleStats, summary };
  }, [division]);

  const handleCompare = useCallback(async () => {
    if (ramaA === ramaB) return;
    setLoadingCompare(true);
    const [resultA, resultB] = await Promise.all([
      fetchRamaStats(ramaA),
      fetchRamaStats(ramaB),
    ]);
    setStatsA(resultA.stats);
    setStatsB(resultB.stats);
    setSummaryA(resultA.summary);
    setSummaryB(resultB.summary);
    setLoadingCompare(false);
    setLoaded(true);
  }, [ramaA, ramaB, fetchRamaStats]);

  // Auto-load on mount and when division changes
  useEffect(() => {
    setLoaded(false);
    handleCompare();
  }, [division]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-2">
      <h3 className="text-sm font-bold text-nv dark:text-white mb-3 flex items-center gap-2">
        <span>📊</span> Comparador de Ramas
      </h3>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={ramaA}
          onChange={(e) => setRamaA(e.target.value)}
          className="text-xs px-3 py-2 rounded-md bg-dk-2 border border-dk-3 text-white font-bold"
        >
          <option value="A">{division} A</option>
          <option value="B">{division} B</option>
          <option value="C">{division} C</option>
        </select>

        <span className="text-sm text-g-4 font-extrabold">VS</span>

        <select
          value={ramaB}
          onChange={(e) => setRamaB(e.target.value)}
          className="text-xs px-3 py-2 rounded-md bg-dk-2 border border-dk-3 text-white font-bold"
        >
          <option value="A">{division} A</option>
          <option value="B">{division} B</option>
          <option value="C">{division} C</option>
        </select>

        <button
          onClick={handleCompare}
          disabled={ramaA === ramaB || loadingCompare}
          className="text-xs font-bold px-5 py-2 rounded-md bg-gn text-white hover:bg-gn-dark disabled:opacity-40 transition-colors"
        >
          {loadingCompare ? "Cargando..." : "Comparar"}
        </button>
      </div>

      {ramaA === ramaB && (
        <p className="text-xs text-g-4 mb-4">Seleccioná dos ramas diferentes para comparar.</p>
      )}

      {loaded && ramaA !== ramaB && (
        <div className="space-y-4">
          {/* Summary comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-compact border-l-4 border-l-nv">
              <p className="text-xs font-bold text-nv dark:text-white mb-2">{division} {ramaA}</p>
              <div className="grid grid-cols-5 gap-1 text-center">
                <div><p className="text-[9px] text-g-4">PJ</p><p className="text-sm font-bold dark:text-white">{summaryA.pj}</p></div>
                <div><p className="text-[9px] text-gn">G</p><p className="text-sm font-bold text-gn">{summaryA.g}</p></div>
                <div><p className="text-[9px] text-rd">P</p><p className="text-sm font-bold text-rd">{summaryA.p}</p></div>
                <div><p className="text-[9px] text-g-4">PF</p><p className="text-sm font-bold dark:text-white">{summaryA.pf}</p></div>
                <div><p className="text-[9px] text-g-4">PC</p><p className="text-sm font-bold dark:text-white">{summaryA.pc}</p></div>
              </div>
            </div>
            <div className="card-compact border-l-4 border-l-bl">
              <p className="text-xs font-bold text-bl mb-2">{division} {ramaB}</p>
              <div className="grid grid-cols-5 gap-1 text-center">
                <div><p className="text-[9px] text-g-4">PJ</p><p className="text-sm font-bold dark:text-white">{summaryB.pj}</p></div>
                <div><p className="text-[9px] text-gn">G</p><p className="text-sm font-bold text-gn">{summaryB.g}</p></div>
                <div><p className="text-[9px] text-rd">P</p><p className="text-sm font-bold text-rd">{summaryB.p}</p></div>
                <div><p className="text-[9px] text-g-4">PF</p><p className="text-sm font-bold dark:text-white">{summaryB.pf}</p></div>
                <div><p className="text-[9px] text-g-4">PC</p><p className="text-sm font-bold dark:text-white">{summaryB.pc}</p></div>
              </div>
            </div>
          </div>

          {/* Module-by-module comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULE_CONFIG.map((mod) => {
              const a = statsA[mod.id] || { propio: 0, rival: 0 };
              const b = statsB[mod.id] || { propio: 0, rival: 0 };
              const totalA = a.propio + a.rival;
              const totalB = b.propio + b.rival;
              const effA = totalA > 0 ? Math.round((a.propio / totalA) * 100) : 0;
              const effB = totalB > 0 ? Math.round((b.propio / totalB) * 100) : 0;
              const better = effA > effB ? "A" : effB > effA ? "B" : "=";

              return (
                <div key={mod.id} className="card-compact">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-3 h-3 rounded-full ${mod.color}`} />
                    <span className="text-[11px] font-bold text-g-4 uppercase flex-1">{mod.label}</span>
                    {better !== "=" && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        better === "A" ? "bg-nv/20 text-nv dark:text-white" : "bg-bl/20 text-bl"
                      }`}>
                        {better === "A" ? ramaA : ramaB} mejor
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className={`text-2xl font-extrabold ${better === "A" ? "text-gn" : "text-white"}`}>{effA}%</p>
                      <p className="text-[9px] text-g-4">{division} {ramaA}</p>
                      <p className="text-[9px] text-g-3">({totalA} ev)</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-g-3 text-xs font-bold">VS</span>
                    </div>
                    <div>
                      <p className={`text-2xl font-extrabold ${better === "B" ? "text-gn" : "text-white"}`}>{effB}%</p>
                      <p className="text-[9px] text-g-4">{division} {ramaB}</p>
                      <p className="text-[9px] text-g-3">({totalB} ev)</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {summaryA.pj === 0 && summaryB.pj === 0 && (
            <p className="text-center text-xs text-g-4 py-4">
              No hay partidos finalizados para comparar en {division} {ramaA} vs {division} {ramaB}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
