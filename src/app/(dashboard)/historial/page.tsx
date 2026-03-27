"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { Eficacia22Card } from "@/components/dashboard/eficacia-22-card";
import { TrendChart } from "@/components/dashboard/trend-chart";
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
  partido_id: string;
  modulo: string;
  perspectiva: string;
  data: Record<string, string>;
  tiempo: string;
}

const DIVISIONS = ["M19", "M17", "M16", "M15"] as const;

const POSITIVE_RESULTS = new Set([
  "obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado",
]);

function isPositiveResult(resultado: string, modulo: string): boolean {
  if (modulo === "DEFENSA") return resultado === "recuperada";
  if (modulo === "PENALES") return true; // all propio events are positive (scored)
  return POSITIVE_RESULTS.has(resultado);
}

export default function HistorialPage() {
  const [selectedDivision, setSelectedDivision] = useState<string>("M19");
  const [selectedRama, setSelectedRama] = useState<string>("Todas");
  const [allPartidos, setAllPartidos] = useState<PartidoHistorial[]>([]);
  const [allEventos, setAllEventos] = useState<EventoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [drillDown, setDrillDown] = useState<"ganados" | "perdidos" | null>(null);
  const [motivoDrill, setMotivoDrill] = useState<string | null>(null);

  // Fetch ALL finished partidos for the selected division (no rama filter in query)
  useEffect(() => {
    async function fetchHistorial() {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .from("partidos")
        .select(`
          id, division, rama, puntos_local, puntos_visitante, status, created_at,
          equipo_local:teams!equipo_local_id(name, short_name),
          equipo_visitante:teams!equipo_visitante_id(name, short_name),
          jornada:jornadas!jornada_id(name, date)
        `)
        .eq("status", "finished")
        .eq("division", selectedDivision)
        .order("created_at", { ascending: false });

      const matchData = (data || []) as unknown as PartidoHistorial[];
      setAllPartidos(matchData);

      // Fetch ALL eventos for these partidos
      if (matchData.length > 0) {
        const partidoIds = matchData.map((p) => p.id);
        const { data: evData } = await supabase
          .from("eventos")
          .select("id, partido_id, modulo, perspectiva, data, tiempo")
          .in("partido_id", partidoIds);
        setAllEventos((evData || []) as unknown as EventoHistorial[]);
      } else {
        setAllEventos([]);
      }

      setLoading(false);
    }
    fetchHistorial();
  }, [selectedDivision]);

  // Reset on filter change
  useEffect(() => { setDrillDown(null); setMotivoDrill(null); }, [selectedModule]);

  // Available ramas from data
  const availableRamas = [...new Set(allPartidos.map((p) => p.rama).filter(Boolean))].sort();

  // Client-side filter by rama
  const partidos = selectedRama === "Todas"
    ? allPartidos
    : allPartidos.filter((p) => p.rama === selectedRama);

  const partidoIds = new Set(partidos.map((p) => p.id));
  const eventos = allEventos.filter((ev) => partidoIds.has(ev.partido_id));

  // Module stats
  const moduleStats: Record<string, { propio: number; rival: number }> = {};
  for (const ev of eventos) {
    if (ev.modulo === "INCIDENCIA") continue;
    if (!moduleStats[ev.modulo]) moduleStats[ev.modulo] = { propio: 0, rival: 0 };
    if (ev.perspectiva === "propio" || ev.perspectiva === "rival") {
      moduleStats[ev.modulo][ev.perspectiva]++;
    } else {
      moduleStats[ev.modulo].propio++;
    }
  }

  // Summary
  const wins = partidos.filter((p) => p.puntos_local > p.puntos_visitante).length;
  const losses = partidos.filter((p) => p.puntos_local < p.puntos_visitante).length;
  const totalPF = partidos.reduce((s, p) => s + p.puntos_local, 0);
  const totalPC = partidos.reduce((s, p) => s + p.puntos_visitante, 0);

  // ========== MODULE DETAIL VIEW ==========
  if (selectedModule) {
    const mod = MODULE_CONFIG.find((m) => m.id === selectedModule);
    const moduleEvents = eventos.filter((ev) => ev.modulo === selectedModule);
    const hasPerspective = mod?.hasPerspective !== false;
    const propioEvents = hasPerspective ? moduleEvents.filter((ev) => ev.perspectiva === "propio") : moduleEvents;
    const rivalEvents = hasPerspective ? moduleEvents.filter((ev) => ev.perspectiva === "rival") : [];
    const totalPropio = propioEvents.length;
    const totalRival = rivalEvents.length;
    const totalAll = moduleEvents.length;

    const ganados = propioEvents.filter((ev) => isPositiveResult(ev.data?.resultado || "", selectedModule));
    const perdidos = propioEvents.filter((ev) => !ganados.includes(ev));
    const ganadosPct = propioEvents.length > 0 ? Math.round((ganados.length / propioEvents.length) * 100) : 0;

    const drillEvents = drillDown === "ganados" ? ganados : drillDown === "perdidos" ? perdidos : [];
    const drillMotivos: Record<string, number> = {};
    drillEvents.forEach((ev) => { const m = ev.data?.motivo || "?"; drillMotivos[m] = (drillMotivos[m] || 0) + 1; });

    const GREEN_SHADES = ["#10B981", "#059669", "#34D399", "#065F46", "#6EE7B7"];
    const RED_SHADES = ["#C8102E", "#F87171", "#DC2626", "#991B1B", "#FCA5A5"];
    const motivoPositive: Record<string, number> = {};
    const motivoNegative: Record<string, number> = {};
    propioEvents.forEach((ev) => {
      const motivo = ev.data?.motivo || "?";
      const resultado = ev.data?.resultado || "";
      if (isPositiveResult(resultado, selectedModule)) motivoPositive[motivo] = (motivoPositive[motivo] || 0) + 1;
      else motivoNegative[motivo] = (motivoNegative[motivo] || 0) + 1;
    });
    const motivoSegments: { label: string; value: number; color: string; motivo: string }[] = [];
    (mod?.motivos || []).forEach((m, i) => {
      const pos = motivoPositive[m.key] ?? 0;
      const neg = motivoNegative[m.key] ?? 0;
      if (pos > 0) motivoSegments.push({ label: `${m.label} ✓`, value: pos, color: GREEN_SHADES[i % GREEN_SHADES.length], motivo: m.key });
      if (neg > 0) motivoSegments.push({ label: `${m.label} ✗`, value: neg, color: RED_SHADES[i % RED_SHADES.length], motivo: m.key });
    });
    const motivoTotal = motivoSegments.reduce((s, seg) => s + seg.value, 0);

    const motivoDrillEvents = motivoDrill ? propioEvents.filter((ev) => ev.data?.motivo === motivoDrill) : [];
    const motivoDrillResultados: Record<string, number> = {};
    motivoDrillEvents.forEach((ev) => { const r = ev.data?.resultado || "?"; motivoDrillResultados[r] = (motivoDrillResultados[r] || 0) + 1; });

    // Progression by match
    const matchMap = new Map<string, { fechaNumero: number; rivalName: string; ganados: number; total: number }>();
    propioEvents.forEach((ev) => {
      const p = partidos.find((p) => p.id === ev.partido_id);
      const pid = ev.partido_id;
      if (!matchMap.has(pid)) {
        matchMap.set(pid, {
          fechaNumero: matchMap.size + 1,
          rivalName: p?.equipo_visitante?.short_name || p?.equipo_visitante?.name || "Rival",
          ganados: 0, total: 0,
        });
      }
      const m = matchMap.get(pid)!;
      m.total++;
      if (isPositiveResult(ev.data?.resultado || "", selectedModule)) m.ganados++;
    });
    const perMatchData = Array.from(matchMap.values()).map((m) => ({
      label: `#${m.fechaNumero} ${m.rivalName}`,
      value: m.total > 0 ? Math.round((m.ganados / m.total) * 100) : 0,
    }));

    return (
      <div>
        <button onClick={() => setSelectedModule(null)} className="text-xs text-g-4 hover:text-nv mb-4 flex items-center gap-1">
          ← Volver al Historial
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{mod?.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-nv">Total de {mod?.label}</h2>
            <p className="text-xs text-g-4">Acumulado {selectedDivision}{selectedRama !== "Todas" ? ` ${selectedRama}` : ""} — {partidos.length} partidos</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-compact text-center"><p className="text-[10px] text-g-4 font-semibold uppercase">Total</p><p className="text-2xl font-extrabold text-nv">{totalAll}</p></div>
          <div className="card-compact text-center"><p className="text-[10px] text-gn font-semibold uppercase">Propio</p><p className="text-2xl font-extrabold text-gn">{totalPropio}</p></div>
          <div className="card-compact text-center"><p className="text-[10px] text-rd font-semibold uppercase">Rival</p><p className="text-2xl font-extrabold text-rd">{totalRival}</p></div>
        </div>

        {/* Donut: Efectividad */}
        {propioEvents.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">Efectividad — Tocá para ver detalle</h3>
            <div className="flex flex-col items-center mb-3">
              <DonutChart segments={[{ label: "Ganados", value: ganados.length, color: "#10B981" }, { label: "Perdidos", value: perdidos.length, color: "#C8102E" }]} size={160} strokeWidth={28} centerValue={`${ganadosPct}%`} centerLabel="Efectividad" onSegmentClick={(seg) => { const key = seg.label === "Ganados" ? "ganados" : "perdidos"; setDrillDown((prev) => prev === key ? null : key as "ganados" | "perdidos"); }} />
              <div className="flex gap-4 mt-3">
                <button onClick={() => setDrillDown((p) => p === "ganados" ? null : "ganados")} className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded ${drillDown === "ganados" ? "bg-gn-bg text-gn-forest" : "text-g-4"}`}><span className="w-2.5 h-2.5 rounded-full bg-gn" /> Ganados: {ganados.length} ({ganadosPct}%)</button>
                <button onClick={() => setDrillDown((p) => p === "perdidos" ? null : "perdidos")} className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded ${drillDown === "perdidos" ? "bg-rd-bg text-rd" : "text-g-4"}`}><span className="w-2.5 h-2.5 rounded-full bg-rd" /> Perdidos: {perdidos.length} ({100 - ganadosPct}%)</button>
              </div>
            </div>
            {drillDown && Object.keys(drillMotivos).length > 0 && (
              <div className="border-t border-g-2 pt-3 mt-2">
                <h4 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">{drillDown === "ganados" ? "¿Por qué los ganamos?" : "¿Por qué los perdimos?"}</h4>
                <div className="space-y-2">
                  {Object.entries(drillMotivos).sort(([, a], [, b]) => b - a).map(([motivo, count]) => {
                    const drillTotal = Object.values(drillMotivos).reduce((s, v) => s + v, 0);
                    const pct = drillTotal > 0 ? Math.round((count / drillTotal) * 100) : 0;
                    const mLabel = mod?.motivos.find((m) => m.key === motivo)?.label || motivo;
                    return (<div key={motivo}><div className="flex items-center justify-between mb-0.5"><span className="text-xs font-semibold text-g-5">{mLabel}</span><div className="flex items-center gap-2"><span className="text-xs font-bold text-nv">{count}</span><span className="text-[10px] text-g-3">{pct}%</span></div></div><div className="h-2 rounded-full bg-g-1 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${drillDown === "ganados" ? "bg-gn" : "bg-rd"}`} style={{ width: `${pct}%` }} /></div></div>);
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desglose por motivo */}
        {motivoTotal > 0 && (
          <div className="card mb-6">
            <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">Desglose por Motivo — Tocá para detalle</h3>
            <div className="flex flex-col items-center">
              <DonutChart segments={motivoSegments} size={200} strokeWidth={32} centerValue={motivoTotal} centerLabel="eventos" onSegmentClick={(seg) => { const key = motivoSegments.find((ms) => ms.label === seg.label)?.motivo || null; setMotivoDrill((prev) => prev === key ? null : key); }} />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
                {motivoSegments.map((seg, i) => (
                  <button key={i} onClick={() => setMotivoDrill((prev) => prev === seg.motivo ? null : seg.motivo)} className={`flex items-center gap-2 px-1 py-0.5 rounded transition-colors text-left ${motivoDrill === seg.motivo ? "bg-g-1" : "hover:bg-g-1/50"}`}>
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} /><span className="text-[10px] text-g-5 font-medium truncate">{seg.label}</span><span className="text-[10px] font-bold text-nv ml-auto">{seg.value}</span><span className="text-[9px] text-g-3 w-7 text-right">{Math.round((seg.value / motivoTotal) * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>
            {motivoDrill && Object.keys(motivoDrillResultados).length > 0 && (
              <div className="border-t border-g-2 pt-3 mt-4">
                <h4 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">{mod?.motivos.find((m) => m.key === motivoDrill)?.label || motivoDrill} — Detalle por resultado</h4>
                <div className="space-y-2">
                  {Object.entries(motivoDrillResultados).sort(([, a], [, b]) => b - a).map(([resultado, count]) => {
                    const resTotal = Object.values(motivoDrillResultados).reduce((s, v) => s + v, 0);
                    const pct = resTotal > 0 ? Math.round((count / resTotal) * 100) : 0;
                    const isPos = isPositiveResult(resultado, selectedModule);
                    return (<div key={resultado}><div className="flex items-center justify-between mb-0.5"><span className="text-xs font-semibold text-g-5 capitalize">{resultado.replace(/_/g, " ")}</span><div className="flex items-center gap-2"><span className="text-xs font-bold text-nv">{count}</span><span className="text-[10px] text-g-3">{pct}%</span></div></div><div className="h-2 rounded-full bg-g-1 overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${isPos ? "bg-gn" : "bg-rd"}`} style={{ width: `${pct}%` }} /></div></div>);
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progresión por fecha */}
        {perMatchData.length > 0 && (
          <div className="mb-6">
            <TrendChart data={perMatchData} colorClass={mod?.color} />
          </div>
        )}
      </div>
    );
  }

  // ========== MAIN HISTORIAL VIEW ==========
  return (
    <div>
      {/* 1. Title + Torneo */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-nv dark:text-white">Historial de Temporada</h2>
        <p className="text-xs text-g-4 mt-0.5">Torneo Nivelación - Mendoza</p>
      </div>

      {/* 2. Division tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {DIVISIONS.map((div) => (
          <button key={div} onClick={() => { setSelectedDivision(div); setSelectedRama("Todas"); setSelectedModule(null); }}
            className={`text-xs font-bold px-4 py-2 rounded-md whitespace-nowrap transition-colors ${div === selectedDivision ? "bg-nv text-white" : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"}`}>
            {div}
          </button>
        ))}
      </div>

      {/* 3. Rama tabs: Todas | M19 A | M19 B | M19 C */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setSelectedRama("Todas")}
          className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${selectedRama === "Todas" ? "bg-gn text-white" : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"}`}>
          Todas
        </button>
        {(availableRamas.length > 0 ? availableRamas : ["A", "B", "C"]).map((rama) => (
          <button key={rama} onClick={() => setSelectedRama(rama)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${rama === selectedRama ? "bg-gn text-white" : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"}`}>
            {selectedDivision} {rama}
          </button>
        ))}
      </div>

      {/* 4. Summary: PJ G P PF PC */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        <div className="card-compact text-center"><p className="text-[10px] text-g-4 font-semibold uppercase">PJ</p><p className="text-xl font-extrabold text-nv dark:text-white">{partidos.length}</p></div>
        <div className="card-compact text-center"><p className="text-[10px] text-gn font-semibold uppercase">G</p><p className="text-xl font-extrabold text-gn">{wins}</p></div>
        <div className="card-compact text-center"><p className="text-[10px] text-rd font-semibold uppercase">P</p><p className="text-xl font-extrabold text-rd">{losses}</p></div>
        <div className="card-compact text-center"><p className="text-[10px] text-g-4 font-semibold uppercase">PF</p><p className="text-xl font-extrabold text-nv dark:text-white">{totalPF}</p></div>
        <div className="card-compact text-center"><p className="text-[10px] text-g-4 font-semibold uppercase">PC</p><p className="text-xl font-extrabold text-nv dark:text-white">{totalPC}</p></div>
      </div>

      {/* 5. Acumulado por módulo — clickable */}
      <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">Acumulado por Módulo — Tocá para ver detalle</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {MODULE_CONFIG.map((mod) => {
          const data = moduleStats[mod.id] || { propio: 0, rival: 0 };
          const total = data.propio + data.rival;
          const propioPercent = total > 0 ? Math.round((data.propio / total) * 100) : 50;
          return (
            <button key={mod.id} onClick={() => setSelectedModule(mod.id)} className="card-compact text-left hover:ring-2 hover:ring-nv transition-all cursor-pointer">
              <div className="flex items-center gap-2 mb-2"><span className="text-base">{mod.icon}</span><span className="text-[10px] font-bold text-g-4 uppercase tracking-wider">{mod.label}</span></div>
              {total > 0 ? (<><div className="text-center mb-2"><span className="text-lg font-extrabold text-nv dark:text-white">{total}</span></div><div className="flex gap-1 h-2 rounded-full overflow-hidden bg-dk-3 mb-2"><div className="bg-gn rounded-l-full" style={{ width: `${propioPercent}%` }} /><div className="bg-rd rounded-r-full" style={{ width: `${100 - propioPercent}%` }} /></div><div className="flex justify-between text-[10px]"><span className="font-bold text-gn">P: {data.propio}</span><span className="font-bold text-rd">R: {data.rival}</span></div></>) : (<p className="text-[9px] text-g-3 text-center py-2">Sin datos</p>)}
            </button>
          );
        })}
      </div>

      {/* 6. Eficacia en 22 */}
      <div className="mb-6"><Eficacia22Card eventos={eventos} /></div>

      {/* 7. Comparador de ramas */}
      <div className="mb-6"><Comparador division={selectedDivision} /></div>

      {/* 8. Incidencias — scroll max 3 visible */}
      {(() => {
        const incidencias = eventos.filter((ev) => ev.modulo === "INCIDENCIA");
        const ICON_MAP: Record<string, string> = { tarjeta_roja: "🟥", tarjeta_amarilla: "🟨", lesion: "🏥", publico: "👥", disciplina: "⚠️" };
        return (
          <div className="mb-6">
            <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">Incidencias {incidencias.length > 0 ? `(${incidencias.length})` : ""}</h3>
            {incidencias.length === 0 ? (
              <div className="card text-center py-6"><span className="text-lg">✅</span><p className="text-sm font-semibold text-gn-dark mt-1">Sin incidencias</p></div>
            ) : (
              <div className="max-h-[180px] overflow-y-auto space-y-2 pr-1">
                {incidencias.map((ev) => {
                  const tipo = ev.data?.tipo || ev.data?.motivo || "otro";
                  const nombre = ev.data?.nombre || "";
                  const desc = ev.data?.descripcion || "";
                  return (
                    <div key={ev.id} className="card-compact flex items-center gap-2">
                      <span className="text-lg">{ICON_MAP[tipo] || "📋"}</span>
                      <div className="flex-1"><span className="text-xs font-bold text-nv capitalize">{tipo.replace(/_/g, " ")}</span>{nombre && <span className="text-xs text-g-5"> — {nombre}</span>}{desc && <p className="text-[10px] text-g-4">{desc}</p>}</div>
                      {ev.tiempo && (<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ev.tiempo === "1T" ? "bg-gn/20 text-gn" : "bg-bl/20 text-bl"}`}>{ev.tiempo}</span>)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* 9. Partidos — scroll max 3 visible, clickeable */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Partidos {partidos.length > 0 ? `(${partidos.length})` : ""}
        </h3>
        {loading ? (
          <div className="card text-center py-8"><p className="text-sm text-g-4 animate-pulse">Cargando historial...</p></div>
        ) : partidos.length === 0 ? (
          <div className="card text-center py-6"><p className="text-xs text-g-4">No hay partidos finalizados para {selectedDivision}{selectedRama !== "Todas" ? ` ${selectedRama}` : ""}</p></div>
        ) : (
          <div className="max-h-[200px] overflow-y-auto pr-1 space-y-2">
            {partidos.map((p) => {
              const isWin = p.puntos_local > p.puntos_visitante;
              const isDraw = p.puntos_local === p.puntos_visitante;
              const rival = p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—";
              const dateStr = p.jornada?.date
                ? new Date(p.jornada.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                : new Date(p.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
              return (
                <a key={p.id} href={`/partido/${p.id}`} className="card-compact flex items-center gap-3 hover:ring-2 hover:ring-nv transition-all cursor-pointer">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isWin ? "bg-gn/20 text-gn" : isDraw ? "bg-yellow-500/20 text-yellow-400" : "bg-rd/20 text-rd"}`}>
                    {isWin ? "G" : isDraw ? "E" : "P"}
                  </span>
                  <div className="flex-1">
                    <span className="text-xs font-bold text-nv dark:text-white">{p.division} {p.rama || ""}</span>
                    <span className="text-xs text-g-5 ml-2">vs {rival}</span>
                  </div>
                  <span className="text-xs font-bold text-white">{p.puntos_local} - {p.puntos_visitante}</span>
                  <span className="text-[10px] text-g-4">{dateStr}</span>
                  <span className="text-[10px] text-bl">→</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Comparador ---
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
    const { data: partidos } = await supabase.from("partidos").select("id, puntos_local, puntos_visitante").eq("division", division).eq("rama", rama).eq("status", "finished");
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
      const { data: evData } = await supabase.from("eventos").select("modulo, perspectiva").in("partido_id", partidoIds);
      for (const ev of evData || []) { if (!moduleStats[ev.modulo]) moduleStats[ev.modulo] = { propio: 0, rival: 0 }; const persp: "propio" | "rival" = ev.perspectiva === "rival" ? "rival" : "propio"; moduleStats[ev.modulo][persp]++; }
    }
    return { stats: moduleStats, summary };
  }, [division]);

  const handleCompare = useCallback(async () => {
    if (ramaA === ramaB) return;
    setLoadingCompare(true);
    const [resultA, resultB] = await Promise.all([fetchRamaStats(ramaA), fetchRamaStats(ramaB)]);
    setStatsA(resultA.stats); setStatsB(resultB.stats); setSummaryA(resultA.summary); setSummaryB(resultB.summary);
    setLoadingCompare(false); setLoaded(true);
  }, [ramaA, ramaB, fetchRamaStats]);

  useEffect(() => { setLoaded(false); handleCompare(); }, [division]); // eslint-disable-line

  return (
    <div>
      <h3 className="text-sm font-bold text-nv dark:text-white mb-3 flex items-center gap-2"><span>📊</span> Comparador de Ramas</h3>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={ramaA} onChange={(e) => setRamaA(e.target.value)} className="text-xs px-3 py-2 rounded-md bg-dk-2 border border-dk-3 text-white font-bold"><option value="A">{division} A</option><option value="B">{division} B</option><option value="C">{division} C</option></select>
        <span className="text-sm text-g-4 font-extrabold">VS</span>
        <select value={ramaB} onChange={(e) => setRamaB(e.target.value)} className="text-xs px-3 py-2 rounded-md bg-dk-2 border border-dk-3 text-white font-bold"><option value="A">{division} A</option><option value="B">{division} B</option><option value="C">{division} C</option></select>
        <button onClick={handleCompare} disabled={ramaA === ramaB || loadingCompare} className="text-xs font-bold px-5 py-2 rounded-md bg-gn text-white hover:bg-gn-dark disabled:opacity-40 transition-colors">{loadingCompare ? "Cargando..." : "Comparar"}</button>
      </div>
      {ramaA === ramaB && <p className="text-xs text-g-4 mb-4">Seleccioná dos ramas diferentes para comparar.</p>}
      {loaded && ramaA !== ramaB && (
        <div className="space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULE_CONFIG.map((mod) => {
              const a = statsA[mod.id] || { propio: 0, rival: 0 }; const b = statsB[mod.id] || { propio: 0, rival: 0 };
              const totalA = a.propio + a.rival; const totalB = b.propio + b.rival;
              const effA = totalA > 0 ? Math.round((a.propio / totalA) * 100) : 0; const effB = totalB > 0 ? Math.round((b.propio / totalB) * 100) : 0;
              const better = effA > effB ? "A" : effB > effA ? "B" : "=";
              return (
                <div key={mod.id} className="card-compact">
                  <div className="flex items-center gap-2 mb-3"><span className={`w-3 h-3 rounded-full ${mod.color}`} /><span className="text-[11px] font-bold text-g-4 uppercase flex-1">{mod.label}</span>{better !== "=" && (<span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${better === "A" ? "bg-nv/20 text-nv dark:text-white" : "bg-bl/20 text-bl"}`}>{better === "A" ? ramaA : ramaB} mejor</span>)}</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className={`text-2xl font-extrabold ${better === "A" ? "text-gn" : "text-white"}`}>{effA}%</p><p className="text-[9px] text-g-4">{division} {ramaA}</p><p className="text-[9px] text-g-3">({totalA} ev)</p></div>
                    <div className="flex items-center justify-center"><span className="text-g-3 text-xs font-bold">VS</span></div>
                    <div><p className={`text-2xl font-extrabold ${better === "B" ? "text-gn" : "text-white"}`}>{effB}%</p><p className="text-[9px] text-g-4">{division} {ramaB}</p><p className="text-[9px] text-g-3">({totalB} ev)</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
