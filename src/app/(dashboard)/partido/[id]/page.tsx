"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { EventFeed } from "@/components/dashboard/event-feed";
import { useRealtimeEventos } from "@/hooks/use-realtime-eventos";
import { MatchTimer } from "@/components/capture/match-timer";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { Eficacia22Card } from "@/components/dashboard/eficacia-22-card";

type TiempoFilter = "all" | "1T" | "2T";

interface PartidoData {
  id: string;
  division: string;
  rama: string;
  status: string;
  puntos_local: number;
  puntos_visitante: number;
  tiempo_actual: string;
  tiempo_inicio_1t: string | null;
  tiempo_fin_1t: string | null;
  tiempo_inicio_2t: string | null;
  tiempo_fin_2t: string | null;
  equipo_local: { name: string; short_name: string } | null;
  equipo_visitante: { name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
}

export default function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [partido, setPartido] = useState<PartidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedTiempo, setSelectedTiempo] = useState<TiempoFilter>("all");
  const [drillDown, setDrillDown] = useState<"ganados" | "perdidos" | null>(null);
  const realtimeEvents = useRealtimeEventos(id);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("partidos")
      .select(`
        id, division, rama, status, puntos_local, puntos_visitante,
        tiempo_actual, tiempo_inicio_1t, tiempo_fin_1t, tiempo_inicio_2t, tiempo_fin_2t,
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

  // Filter events by selected half
  const filteredEvents = selectedTiempo === "all"
    ? realtimeEvents
    : realtimeEvents.filter((ev) => (ev.tiempo ?? "1T") === selectedTiempo);

  // Compute stats from filtered events
  const stats: Record<string, { propio: number; rival: number }> = {};
  for (const ev of filteredEvents) {
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
      tiempo: ev.tiempo,
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

  // Tiempo filter tabs component
  const TiempoTabs = () => (
    <div className="flex gap-1 mb-4">
      {(["all", "1T", "2T"] as TiempoFilter[]).map((t) => (
        <button
          key={t}
          onClick={() => setSelectedTiempo(t)}
          className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
            selectedTiempo === t
              ? t === "1T" ? "bg-gn text-white"
                : t === "2T" ? "bg-bl text-white"
                : "bg-nv text-white"
              : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"
          }`}
        >
          {t === "all" ? "Todo" : t}
        </button>
      ))}
    </div>
  );

  // Module detail view
  if (selectedModule) {
    const mod = MODULE_CONFIG.find((m) => m.id === selectedModule);
    const moduleEvents = filteredEvents.filter((ev) => ev.modulo === selectedModule);
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
              {localName} vs {visitanteName} — {partido.division} {partido.rama || ""}
            </p>
          </div>
        </div>

        <TiempoTabs />

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

        {/* Donut: Ganados vs Perdidos */}
        {(() => {
          const isDefensa = selectedModule === "DEFENSA";
          const propioEvents = moduleEvents.filter((ev) => isDefensa || ev.perspectiva === "propio");
          const ganados = propioEvents.filter((ev) => {
            const res = (ev.data as Record<string, string>)?.resultado || "";
            if (isDefensa) return res === "recuperada";
            return ["obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado"].includes(res);
          });
          const perdidos = propioEvents.filter((ev) => !ganados.includes(ev));
          const ganadosPct = propioEvents.length > 0 ? Math.round((ganados.length / propioEvents.length) * 100) : 0;

          const drillEvents = drillDown === "ganados" ? ganados : drillDown === "perdidos" ? perdidos : [];
          const drillMotivos: Record<string, number> = {};
          drillEvents.forEach((ev) => {
            const m = (ev.data as Record<string, string>)?.motivo || "?";
            drillMotivos[m] = (drillMotivos[m] || 0) + 1;
          });

          return propioEvents.length > 0 ? (
            <div className="card mb-6">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
                Efectividad — Tocá para ver detalle
              </h3>
              <div className="flex flex-col items-center mb-3">
                <DonutChart
                  segments={[
                    { label: "Ganados", value: ganados.length, color: "#10B981" },
                    { label: "Perdidos", value: perdidos.length, color: "#C8102E" },
                  ]}
                  size={140}
                  strokeWidth={24}
                  centerValue={`${ganadosPct}%`}
                  centerLabel="Efectividad"
                  onSegmentClick={(seg) => {
                    const key = seg.label === "Ganados" ? "ganados" : "perdidos";
                    setDrillDown((prev) => prev === key ? null : key as "ganados" | "perdidos");
                  }}
                />
                <div className="flex gap-4 mt-2">
                  <button
                    onClick={() => setDrillDown((p) => p === "ganados" ? null : "ganados")}
                    className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded ${drillDown === "ganados" ? "bg-gn-bg text-gn-forest" : "text-g-4"}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-gn" /> Ganados: {ganados.length} ({ganadosPct}%)
                  </button>
                  <button
                    onClick={() => setDrillDown((p) => p === "perdidos" ? null : "perdidos")}
                    className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded ${drillDown === "perdidos" ? "bg-rd-bg text-rd" : "text-g-4"}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rd" /> Perdidos: {perdidos.length} ({100 - ganadosPct}%)
                  </button>
                </div>
              </div>

              {/* Drill-down por motivo */}
              {drillDown && Object.keys(drillMotivos).length > 0 && (
                <div className="border-t border-g-2 pt-3 mt-2">
                  <h4 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
                    {drillDown === "ganados" ? "¿Por qué los ganamos?" : "¿Por qué los perdimos?"}
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(drillMotivos)
                      .sort(([, a], [, b]) => b - a)
                      .map(([motivo, count]) => {
                        const drillTotal = Object.values(drillMotivos).reduce((s, v) => s + v, 0);
                        const pct = drillTotal > 0 ? Math.round((count / drillTotal) * 100) : 0;
                        const mLabel = mod?.motivos.find((m) => m.key === motivo)?.label || motivo;
                        return (
                          <div key={motivo}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-semibold text-g-5">{mLabel}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-nv">{count}</span>
                                <span className="text-[10px] text-g-3">{pct}%</span>
                              </div>
                            </div>
                            <div className="h-2 rounded-full bg-g-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${drillDown === "ganados" ? "bg-gn" : "bg-rd"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : null;
        })()}

        {/* Desglose por motivo con anillo verde/rojo */}
        {(() => {
          const isDefensa = selectedModule === "DEFENSA";
          const propioEvents = moduleEvents.filter((ev) => isDefensa || ev.perspectiva === "propio");
          const GREEN_SHADES = ["#10B981", "#059669", "#34D399", "#065F46", "#6EE7B7"];
          const RED_SHADES = ["#C8102E", "#F87171", "#DC2626", "#991B1B", "#FCA5A5"];

          const motivoPositive: Record<string, number> = {};
          const motivoNegative: Record<string, number> = {};

          propioEvents.forEach((ev) => {
            const motivo = (ev.data as Record<string, string>)?.motivo || "?";
            const resultado = (ev.data as Record<string, string>)?.resultado || "";
            const isPos = isDefensa ? resultado === "recuperada" : ["obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado"].includes(resultado);
            if (isPos) motivoPositive[motivo] = (motivoPositive[motivo] || 0) + 1;
            else motivoNegative[motivo] = (motivoNegative[motivo] || 0) + 1;
          });

          const segments: { label: string; value: number; color: string }[] = [];
          const allMotivos = mod?.motivos || [];
          allMotivos.forEach((m, i) => {
            const pos = motivoPositive[m.key] ?? 0;
            const neg = motivoNegative[m.key] ?? 0;
            if (pos > 0) segments.push({ label: `${m.label} ✓`, value: pos, color: GREEN_SHADES[i % GREEN_SHADES.length] });
            if (neg > 0) segments.push({ label: `${m.label} ✗`, value: neg, color: RED_SHADES[i % RED_SHADES.length] });
          });

          const total = segments.reduce((s, seg) => s + seg.value, 0);
          if (total === 0) return null;

          return (
            <div className="card mb-6">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
                Desglose por Motivo
              </h3>
              <div className="flex flex-col items-center">
                <DonutChart segments={segments} size={180} strokeWidth={30} centerValue={total} centerLabel="eventos" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
                  {segments.map((seg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-[10px] text-g-5 font-medium truncate">{seg.label}</span>
                      <span className="text-[10px] font-bold text-nv ml-auto">{seg.value}</span>
                      <span className="text-[9px] text-g-3 w-7 text-right">{Math.round((seg.value / total) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Breakdown original por motivo */}
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Detalle por motivo
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
              {partido.division} {partido.rama || ""}
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
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-nv">{partido.puntos_local}</span>
            <span className="text-g-3">—</span>
            <span className="text-3xl font-extrabold text-nv">{partido.puntos_visitante}</span>
          </div>
          {/* Timer display */}
          {partido.tiempo_inicio_1t && (
            <div className="flex items-center justify-center gap-3 mt-1">
              <div className="text-center">
                <span className="text-[9px] text-g-4">1T</span>
                <div className="text-[10px] text-g-4">
                  <MatchTimer startTime={partido.tiempo_inicio_1t} endTime={partido.tiempo_fin_1t} />
                </div>
              </div>
              {partido.tiempo_inicio_2t && (
                <div className="text-center">
                  <span className="text-[9px] text-g-4">2T</span>
                  <div className="text-[10px] text-g-4">
                    <MatchTimer startTime={partido.tiempo_inicio_2t} endTime={partido.tiempo_fin_2t} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {activeSession?.code && (
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-dk-2 rounded border border-dk-3">
          <span className="text-[10px] text-g-4 font-semibold">Eventos: {realtimeEvents.length}</span>
          <span className="ml-auto font-mono text-[10px] text-g-3">
            Código: <strong className="text-nv">{activeSession.code}</strong>
          </span>
        </div>
      )}

      {/* Tiempo filter tabs */}
      <TiempoTabs />

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

      {/* Eficacia en 22 */}
      <div className="mb-6">
        <Eficacia22Card eventos={filteredEvents} />
      </div>

      {/* Feed */}
      <EventFeed events={mapEvents(filteredEvents.slice(0, 30))} />
    </div>
  );
}
