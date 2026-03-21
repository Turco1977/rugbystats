"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { EventFeed } from "@/components/dashboard/event-feed";
import { useRealtimeEventos } from "@/hooks/use-realtime-eventos";

interface PartidoData {
  id: string;
  division: string;
  status: string;
  puntos_local: number;
  puntos_visitante: number;
  equipo_local: { name: string; short_name: string } | null;
  equipo_visitante: { name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
}

const INC_TYPES: { key: string; label: string; icon: string; fields: string[] }[] = [
  { key: "tarjeta_roja", label: "Tarjeta Roja", icon: "\u{1F7E5}", fields: ["nombre"] },
  { key: "tarjeta_amarilla", label: "Tarjeta Amarilla", icon: "\u{1F7E8}", fields: ["nombre"] },
  { key: "lesion", label: "Lesión", icon: "\u{1F3E5}", fields: ["nombre", "descripcion"] },
  { key: "publico", label: "Público", icon: "\u{1F465}", fields: ["descripcion"] },
  { key: "disciplina", label: "Disciplina", icon: "\u26A0\uFE0F", fields: ["descripcion"] },
];

export default function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [partido, setPartido] = useState<PartidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const realtimeEvents = useRealtimeEventos(id);

  // Edit score state
  const [editingScore, setEditingScore] = useState(false);
  const [editLocal, setEditLocal] = useState(0);
  const [editVisitante, setEditVisitante] = useState(0);

  // Incidencia state
  const [showIncForm, setShowIncForm] = useState(false);
  const [incTipo, setIncTipo] = useState("");
  const [incNombre, setIncNombre] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [incSaving, setIncSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("partidos")
      .select(`
        id, division, status, puntos_local, puntos_visitante,
        equipo_local:teams!equipo_local_id(name, short_name),
        equipo_visitante:teams!equipo_visitante_id(name, short_name),
        sessions(code, is_active)
      `)
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setPartido(data as unknown as PartidoData);
        setLoading(false);
      });

    const channel = supabase
      .channel(`partido:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "partidos", filter: `id=eq.${id}` }, (payload) => {
        setPartido((prev) => prev ? { ...prev, ...payload.new } as unknown as PartidoData : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const saveScore = async () => {
    const supabase = createClient();
    await supabase.from("partidos").update({
      puntos_local: editLocal,
      puntos_visitante: editVisitante,
    }).eq("id", id);
    setPartido((prev) => prev ? { ...prev, puntos_local: editLocal, puntos_visitante: editVisitante } : prev);
    setEditingScore(false);
  };

  const openEditScore = () => {
    if (partido) {
      setEditLocal(partido.puntos_local);
      setEditVisitante(partido.puntos_visitante);
      setEditingScore(true);
    }
  };

  const submitIncidencia = async () => {
    if (!incTipo) return;
    const cfg = INC_TYPES.find((t) => t.key === incTipo);
    if (cfg?.fields.includes("nombre") && !incNombre.trim()) return;
    if (cfg?.fields.includes("descripcion") && !incDesc.trim()) return;

    setIncSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("eventos").insert({
      partido_id: id,
      modulo: "INCIDENCIA",
      perspectiva: "propio",
      numero: 0,
      data: {
        motivo: incTipo,
        resultado: incTipo,
        tipo: incTipo,
        nombre: incNombre.trim() || null,
        descripcion: incDesc.trim() || null,
      },
      cargado_por: "Director",
    });
    if (error) console.error("Error:", error);
    setIncSaving(false);
    setShowIncForm(false);
    setIncTipo("");
    setIncNombre("");
    setIncDesc("");
  };

  // Compute stats from realtime events
  const stats: Record<string, { propio: number; rival: number }> = {};
  for (const ev of realtimeEvents) {
    if (!stats[ev.modulo]) stats[ev.modulo] = { propio: 0, rival: 0 };
    stats[ev.modulo][ev.perspectiva]++;
  }

  // Map events for feed
  const mapEvents = (events: typeof realtimeEvents) =>
    events.map((ev) => ({
      id: ev.id,
      modulo: ev.modulo,
      perspectiva: ev.perspectiva,
      motivo: (ev.data as Record<string, string>)?.motivo || "",
      resultado: (ev.data as Record<string, string>)?.resultado || (ev.data as Record<string, string>)?.detalle || "",
      numero: ev.numero,
      cargadoPor: ev.cargado_por,
      timestamp: ev.timestamp,
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-g-4 text-sm animate-pulse">Cargando partido...</p>
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="text-center py-20">
        <p className="text-rd font-semibold">Partido no encontrado</p>
        <a href="/director" className="text-bl text-xs hover:underline mt-2 block">← Volver</a>
      </div>
    );
  }

  const localName = partido.equipo_local?.short_name || partido.equipo_local?.name || "Local";
  const visitanteName = partido.equipo_visitante?.short_name || partido.equipo_visitante?.name || "Visitante";
  const activeSession = partido.sessions?.find((s) => s.is_active);
  const isLive = partido.status === "live";

  // Module detail view
  if (selectedModule) {
    const mod = MODULE_CONFIG.find((m) => m.id === selectedModule);
    const moduleEvents = realtimeEvents.filter((ev) => ev.modulo === selectedModule);
    const modStats = stats[selectedModule] || { propio: 0, rival: 0 };

    return (
      <div>
        <button
          onClick={() => setSelectedModule(null)}
          className="text-xs text-g-4 hover:text-nv mb-4 flex items-center gap-1"
        >
          ← Volver al partido
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{mod?.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-nv">{mod?.label}</h2>
            <p className="text-xs text-g-4">
              {localName} vs {visitanteName} — {partido.division}
            </p>
          </div>
        </div>

        {/* Module summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-compact text-center">
            <p className="text-[10px] text-g-4 font-semibold uppercase">Total</p>
            <p className="text-2xl font-extrabold text-nv">{modStats.propio + modStats.rival}</p>
          </div>
          <div className="card-compact text-center">
            <p className="text-[10px] text-gn font-semibold uppercase">Propio</p>
            <p className="text-2xl font-extrabold text-gn">{modStats.propio}</p>
          </div>
          <div className="card-compact text-center">
            <p className="text-[10px] text-rd font-semibold uppercase">Rival</p>
            <p className="text-2xl font-extrabold text-rd">{modStats.rival}</p>
          </div>
        </div>

        {/* Breakdown by motivo */}
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Desglose por motivo
        </h3>
        <div className="space-y-2 mb-6">
          {Object.entries(
            moduleEvents.reduce<Record<string, { count: number; results: Record<string, number> }>>((acc, ev) => {
              const motivo = (ev.data as Record<string, string>)?.motivo || "—";
              const resultado = (ev.data as Record<string, string>)?.resultado || "—";
              if (!acc[motivo]) acc[motivo] = { count: 0, results: {} };
              acc[motivo].count++;
              acc[motivo].results[resultado] = (acc[motivo].results[resultado] || 0) + 1;
              return acc;
            }, {})
          ).map(([motivo, data]) => (
            <div key={motivo} className="card-compact">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-nv uppercase">{motivo}</span>
                <span className="text-xs font-bold text-g-4">{data.count}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(data.results).map(([res, count]) => (
                  <span key={res} className="text-[10px] bg-dk-2 text-g-4 px-2 py-0.5 rounded">
                    {res}: {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {moduleEvents.length === 0 && (
            <p className="text-g-3 text-xs text-center py-4">Sin eventos en este módulo</p>
          )}
        </div>

        {/* Module events feed */}
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Eventos de {mod?.label}
        </h3>
        <EventFeed events={mapEvents(moduleEvents)} />
      </div>
    );
  }

  // Main partido view
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <a href="/director" className="text-[10px] text-g-4 hover:text-nv">
            ← Volver a Director
          </a>
          <h2 className="text-lg font-bold text-nv mt-1">
            {localName} vs {visitanteName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-nv text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
              {partido.division}
            </span>
            {isLive && (
              <span className="badge bg-gn-bg text-gn-forest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
                En vivo
              </span>
            )}
            {partido.status === "finished" && (
              <span className="badge bg-g-1 text-g-4">Finalizado</span>
            )}
          </div>
        </div>

        <div className="text-center">
          {editingScore ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={editLocal}
                onChange={(e) => setEditLocal(Number(e.target.value))}
                className="w-14 text-center text-2xl font-extrabold rounded border border-g-2 dark:border-dk-3 bg-white dark:bg-dk-2 text-nv dark:text-white py-1"
              />
              <span className="text-g-3">—</span>
              <input
                type="number"
                value={editVisitante}
                onChange={(e) => setEditVisitante(Number(e.target.value))}
                className="w-14 text-center text-2xl font-extrabold rounded border border-g-2 dark:border-dk-3 bg-white dark:bg-dk-2 text-nv dark:text-white py-1"
              />
              <div className="flex flex-col gap-1 ml-1">
                <button onClick={saveScore} className="text-[10px] font-bold bg-gn text-white px-2 py-0.5 rounded hover:bg-gn-dark">✓</button>
                <button onClick={() => setEditingScore(false)} className="text-[10px] font-bold bg-g-2 dark:bg-dk-3 text-g-4 px-2 py-0.5 rounded hover:bg-g-3">✗</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-nv dark:text-white">{partido.puntos_local}</span>
                <span className="text-g-3">—</span>
                <span className="text-3xl font-extrabold text-nv dark:text-white">{partido.puntos_visitante}</span>
              </div>
              <button
                onClick={openEditScore}
                className="text-[10px] text-g-4 hover:text-nv dark:hover:text-white mt-1"
                title="Editar score"
              >
                ✏️ Editar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons for finished matches */}
      {partido.status === "finished" && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setShowIncForm(!showIncForm); setIncTipo(""); }}
            className="text-xs font-bold px-4 py-2 rounded-md bg-or text-white hover:opacity-90 transition-colors"
          >
            🚨 + Incidencia
          </button>
        </div>
      )}

      {/* Inline incidencia form */}
      {showIncForm && (
        <div className="card mb-4 border-or/40">
          <h3 className="text-sm font-bold text-nv dark:text-white mb-3">Nueva Incidencia</h3>
          {!incTipo ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INC_TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setIncTipo(t.key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md bg-dk-2 border border-dk-3 hover:bg-dk-3 transition-colors text-left"
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="text-xs font-bold text-white">{t.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => setIncTipo("")} className="text-dk-4 hover:text-white text-sm">←</button>
                <span className="text-lg">{INC_TYPES.find((t) => t.key === incTipo)?.icon}</span>
                <span className="text-sm font-bold text-white">{INC_TYPES.find((t) => t.key === incTipo)?.label}</span>
              </div>
              {INC_TYPES.find((t) => t.key === incTipo)?.fields.includes("nombre") && (
                <input
                  type="text"
                  value={incNombre}
                  onChange={(e) => setIncNombre(e.target.value)}
                  placeholder="Nombre del jugador"
                  autoFocus
                  className="w-full rounded border border-dk-3 bg-dk-2 px-3 py-2 text-sm text-white placeholder:text-dk-4 focus:border-bl focus:outline-none"
                />
              )}
              {INC_TYPES.find((t) => t.key === incTipo)?.fields.includes("descripcion") && (
                <textarea
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  placeholder={incTipo === "lesion" ? "Tipo de lesión" : "Descripción"}
                  rows={2}
                  className="w-full rounded border border-dk-3 bg-dk-2 px-3 py-2 text-sm text-white placeholder:text-dk-4 focus:border-bl focus:outline-none resize-none"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={submitIncidencia}
                  disabled={
                    incSaving ||
                    (INC_TYPES.find((t) => t.key === incTipo)?.fields.includes("nombre") && !incNombre.trim()) ||
                    (INC_TYPES.find((t) => t.key === incTipo)?.fields.includes("descripcion") && !incDesc.trim())
                  }
                  className="text-xs font-bold px-4 py-2 rounded-md bg-or text-white hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {incSaving ? "Guardando..." : "Guardar"}
                </button>
                <button
                  onClick={() => setShowIncForm(false)}
                  className="text-xs font-bold px-4 py-2 rounded-md bg-dk-2 border border-dk-3 text-g-4 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSession?.code && (
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-dk-2 rounded border border-dk-3">
          <span className="text-[10px] text-g-4 font-semibold">Eventos: {realtimeEvents.length}</span>
          <span className="ml-auto font-mono text-[10px] text-g-3">
            Código: <strong className="text-nv">{activeSession.code}</strong>
          </span>
        </div>
      )}

      {/* Clickable module cards */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Estadísticas por Módulo — Tocá para ver detalle
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {MODULE_CONFIG.map((mod) => {
            const data = stats[mod.id] || { propio: 0, rival: 0 };
            const total = data.propio + data.rival;
            const propioPercent = total > 0 ? Math.round((data.propio / total) * 100) : 0;

            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                className="card-compact text-left hover:ring-2 hover:ring-nv transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{mod.icon}</span>
                  <span className="text-[10px] font-bold text-g-4 uppercase tracking-wider">
                    {mod.label}
                  </span>
                </div>
                <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-g-1 mb-2">
                  <div className="bg-gn rounded-l-full transition-all" style={{ width: `${propioPercent}%` }} />
                  <div className="bg-rd rounded-r-full transition-all" style={{ width: `${100 - propioPercent}%` }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-gn-dark">P: {data.propio}</span>
                  <span className="font-bold text-rd">R: {data.rival}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed */}
      <EventFeed events={mapEvents(realtimeEvents.slice(0, 30))} />
    </div>
  );
}
