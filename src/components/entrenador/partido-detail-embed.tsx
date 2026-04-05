"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { useRealtimeEventos } from "@/hooks/use-realtime-eventos";
import { DonutChart } from "@/components/dashboard/donut-chart";

type TiempoFilter = "all" | "1T" | "2T";

interface PartidoData {
  id: string;
  division: string;
  rama: string;
  status: string;
  puntos_local: number;
  puntos_visitante: number;
  tiempo_actual: string;
  equipo_local: { name: string; short_name: string } | null;
  equipo_visitante: { name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
  jornada?: { name: string; date: string } | null;
}

interface Props {
  partidoId: string;
  onBack: () => void;
}

const POSITIVE_RESULTS = new Set([
  "obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado",
]);

function isPositiveResult(resultado: string, modulo: string): boolean {
  if (modulo === "DEFENSA") return resultado === "recuperada";
  if (modulo === "PENALES") return true;
  return POSITIVE_RESULTS.has(resultado);
}

export function PartidoDetailEmbed({ partidoId, onBack }: Props) {
  const [partido, setPartido] = useState<PartidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedTiempo, setSelectedTiempo] = useState<TiempoFilter>("all");
  const [drillDown, setDrillDown] = useState<"ganados" | "perdidos" | null>(null);
  const [motivoDrill, setMotivoDrill] = useState<string | null>(null);
  const realtimeEvents = useRealtimeEventos(partidoId);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("partidos")
      .select(`
        id, division, rama, status, puntos_local, puntos_visitante, tiempo_actual,
        equipo_local:teams!equipo_local_id(name, short_name),
        equipo_visitante:teams!equipo_visitante_id(name, short_name),
        sessions(code, is_active),
        jornada:jornadas!jornada_id(name, date)
      `)
      .eq("id", partidoId)
      .single()
      .then(({ data }) => {
        if (data) setPartido(data as unknown as PartidoData);
        setLoading(false);
      });

    const channel = supabase
      .channel(`partido:${partidoId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "partidos", filter: `id=eq.${partidoId}` }, (payload) => {
        setPartido((prev) => prev ? { ...prev, ...payload.new } as unknown as PartidoData : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partidoId]);

  useEffect(() => {
    setDrillDown(null);
    setMotivoDrill(null);
  }, [selectedModule]);

  const filteredEvents = selectedTiempo === "all"
    ? realtimeEvents
    : realtimeEvents.filter((ev) => (ev.tiempo ?? "1T") === selectedTiempo);

  const stats: Record<string, { propio: number; rival: number }> = {};
  for (const ev of filteredEvents) {
    if (!stats[ev.modulo]) stats[ev.modulo] = { propio: 0, rival: 0 };
    stats[ev.modulo][ev.perspectiva]++;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-dk-4 text-sm animate-pulse">Cargando partido...</p>
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="text-center py-20">
        <p className="text-rd font-semibold">Partido no encontrado</p>
        <button onClick={onBack} className="text-bl text-xs hover:underline mt-2">← Volver</button>
      </div>
    );
  }

  const localName = partido.equipo_local?.short_name || partido.equipo_local?.name || "Local";
  const visitanteName = partido.equipo_visitante?.short_name || partido.equipo_visitante?.name || "Visitante";
  const isLive = partido.status === "live";

  const TiempoTabs = () => (
    <div className="flex gap-1 mb-4">
      {(["all", "1T", "2T"] as TiempoFilter[]).map((t) => (
        <button
          key={t}
          onClick={() => setSelectedTiempo(t)}
          className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
            selectedTiempo === t
              ? t === "1T" ? "bg-gn text-white" : t === "2T" ? "bg-bl text-white" : "bg-nv text-white"
              : "bg-dk-2 border border-white/10 text-dk-4 hover:bg-dk-3"
          }`}
        >
          {t === "all" ? "Todo" : t}
        </button>
      ))}
    </div>
  );

  // ========== MODULE DETAIL VIEW ==========
  if (selectedModule) {
    const mod = MODULE_CONFIG.find((m) => m.id === selectedModule);
    const moduleEvents = filteredEvents.filter((ev) => ev.modulo === selectedModule);
    const modStats = stats[selectedModule] || { propio: 0, rival: 0 };

    const hasPerspective = mod?.hasPerspective !== false;
    const propioEvents = hasPerspective
      ? moduleEvents.filter((ev) => ev.perspectiva === "propio")
      : moduleEvents;

    const ganados = propioEvents.filter((ev) => {
      const res = (ev.data as Record<string, string>)?.resultado || "";
      return isPositiveResult(res, selectedModule);
    });
    const perdidos = propioEvents.filter((ev) => !ganados.includes(ev));
    const ganadosPct = propioEvents.length > 0 ? Math.round((ganados.length / propioEvents.length) * 100) : 0;

    const drillEvents = drillDown === "ganados" ? ganados : drillDown === "perdidos" ? perdidos : [];
    const drillMotivos: Record<string, number> = {};
    drillEvents.forEach((ev) => {
      const m = (ev.data as Record<string, string>)?.motivo || "?";
      drillMotivos[m] = (drillMotivos[m] || 0) + 1;
    });

    const GREEN_SHADES = ["#10B981", "#059669", "#34D399", "#065F46", "#6EE7B7"];
    const RED_SHADES = ["#C8102E", "#F87171", "#DC2626", "#991B1B", "#FCA5A5"];
    const motivoPositive: Record<string, number> = {};
    const motivoNegative: Record<string, number> = {};
    propioEvents.forEach((ev) => {
      const motivo = (ev.data as Record<string, string>)?.motivo || "?";
      const resultado = (ev.data as Record<string, string>)?.resultado || "";
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

    const motivoDrillEvents = motivoDrill
      ? propioEvents.filter((ev) => (ev.data as Record<string, string>)?.motivo === motivoDrill)
      : [];
    const motivoDrillResultados: Record<string, number> = {};
    motivoDrillEvents.forEach((ev) => {
      const res = (ev.data as Record<string, string>)?.resultado || "?";
      motivoDrillResultados[res] = (motivoDrillResultados[res] || 0) + 1;
    });

    return (
      <div>
        <button
          onClick={() => setSelectedModule(null)}
          className="text-xs text-dk-4 hover:text-white mb-4 flex items-center gap-1"
        >
          ← Volver al partido
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{mod?.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-white">{mod?.label}</h2>
            <p className="text-xs text-dk-4">
              {localName} vs {visitanteName} — {partido.division} {partido.rama || ""}
            </p>
          </div>
        </div>

        <TiempoTabs />

        {/* Module summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3 text-center">
            <p className="text-[10px] text-dk-4 font-semibold uppercase">Total</p>
            <p className="text-2xl font-extrabold text-white">{modStats.propio + modStats.rival}</p>
          </div>
          <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3 text-center">
            <p className="text-[10px] text-gn font-semibold uppercase">Propio</p>
            <p className="text-2xl font-extrabold text-gn">{modStats.propio}</p>
          </div>
          <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3 text-center">
            <p className="text-[10px] text-rd font-semibold uppercase">Rival</p>
            <p className="text-2xl font-extrabold text-rd">{modStats.rival}</p>
          </div>
        </div>

        {/* Donut: Ganados vs Perdidos */}
        {propioEvents.length > 0 && (
          <div className="bg-dk-2 rounded-lg border border-white/10 p-4 mb-6">
            <h3 className="text-[10px] font-bold text-dk-4 uppercase tracking-wider mb-3">
              Efectividad — Tocá para ver detalle
            </h3>
            <div className="flex flex-col items-center mb-3">
              <DonutChart
                segments={[
                  { label: "Ganados", value: ganados.length, color: "#10B981" },
                  { label: "Perdidos", value: perdidos.length, color: "#C8102E" },
                ]}
                size={160}
                strokeWidth={28}
                centerValue={`${ganadosPct}%`}
                centerLabel="Efectividad"
                onSegmentClick={(seg) => {
                  const key = seg.label === "Ganados" ? "ganados" : "perdidos";
                  setDrillDown((prev) => prev === key ? null : key as "ganados" | "perdidos");
                }}
              />
              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => setDrillDown((p) => p === "ganados" ? null : "ganados")}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded ${drillDown === "ganados" ? "bg-gn/20 text-gn" : "text-dk-4"}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-gn" /> Ganados: {ganados.length} ({ganadosPct}%)
                </button>
                <button
                  onClick={() => setDrillDown((p) => p === "perdidos" ? null : "perdidos")}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded ${drillDown === "perdidos" ? "bg-rd/20 text-rd" : "text-dk-4"}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rd" /> Perdidos: {perdidos.length} ({100 - ganadosPct}%)
                </button>
              </div>
            </div>

            {drillDown && Object.keys(drillMotivos).length > 0 && (
              <div className="border-t border-white/10 pt-3 mt-2">
                <h4 className="text-[10px] font-bold text-dk-4 uppercase tracking-wider mb-3">
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
                            <span className="text-xs font-semibold text-white">{mLabel}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{count}</span>
                              <span className="text-[10px] text-dk-4">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-dk-3 overflow-hidden">
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
        )}

        {/* Desglose por motivo */}
        {motivoTotal > 0 && (
          <div className="bg-dk-2 rounded-lg border border-white/10 p-4 mb-6">
            <h3 className="text-[10px] font-bold text-dk-4 uppercase tracking-wider mb-3">
              Desglose por Motivo — Tocá para detalle
            </h3>
            <div className="flex flex-col items-center">
              <DonutChart
                segments={motivoSegments}
                size={200}
                strokeWidth={32}
                centerValue={motivoTotal}
                centerLabel="eventos"
                onSegmentClick={(seg) => {
                  const s = seg as { label: string; value: number; color: string; motivo?: string };
                  const key = (s as unknown as { motivo: string }).motivo ||
                    motivoSegments.find((ms) => ms.label === seg.label)?.motivo || null;
                  setMotivoDrill((prev) => prev === key ? null : key);
                }}
              />
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
                {motivoSegments.map((seg, i) => (
                  <button
                    key={i}
                    onClick={() => setMotivoDrill((prev) => prev === seg.motivo ? null : seg.motivo)}
                    className={`flex items-center gap-2 px-1 py-0.5 rounded transition-colors text-left ${
                      motivoDrill === seg.motivo ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-[10px] text-white font-medium truncate">{seg.label}</span>
                    <span className="text-[10px] font-bold text-white ml-auto">{seg.value}</span>
                    <span className="text-[9px] text-dk-4 w-7 text-right">{Math.round((seg.value / motivoTotal) * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>

            {motivoDrill && Object.keys(motivoDrillResultados).length > 0 && (
              <div className="border-t border-white/10 pt-3 mt-4">
                <h4 className="text-[10px] font-bold text-dk-4 uppercase tracking-wider mb-3">
                  {mod?.motivos.find((m) => m.key === motivoDrill)?.label || motivoDrill} — Detalle por resultado
                </h4>
                <div className="space-y-2">
                  {Object.entries(motivoDrillResultados)
                    .sort(([, a], [, b]) => b - a)
                    .map(([resultado, count]) => {
                      const resTotal = Object.values(motivoDrillResultados).reduce((s, v) => s + v, 0);
                      const pct = resTotal > 0 ? Math.round((count / resTotal) * 100) : 0;
                      const isPos = isPositiveResult(resultado, selectedModule);
                      return (
                        <div key={resultado}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-semibold text-white capitalize">{resultado.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{count}</span>
                              <span className="text-[10px] text-dk-4">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-dk-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isPos ? "bg-gn" : "bg-rd"}`}
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
        )}
      </div>
    );
  }

  // ========== MAIN PARTIDO VIEW ==========
  return (
    <div>
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-xs text-dk-4 hover:text-white mb-4 flex items-center gap-1"
      >
        ← Volver al Fixture
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            {localName} vs {visitanteName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-nv text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
              {partido.division} {partido.rama || ""}
            </span>
            {isLive && (
              <span className="text-[10px] font-semibold text-gn flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
                En vivo
              </span>
            )}
            {partido.status === "finished" && (
              <span className="text-[10px] font-semibold text-dk-4">Finalizado</span>
            )}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-white">{partido.puntos_local}</span>
            <span className="text-dk-4">—</span>
            <span className="text-3xl font-extrabold text-white">{partido.puntos_visitante}</span>
          </div>
        </div>
      </div>

      {/* Jornada info */}
      {partido.jornada && (
        <div className="text-[10px] text-dk-4 mb-4">
          {partido.jornada.name} — {new Date(partido.jornada.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      )}

      <TiempoTabs />

      {/* Clickable module cards */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-dk-4 uppercase tracking-wider mb-3">
          Estadísticas por Módulo — Tocá para ver detalle
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {MODULE_CONFIG.map((mod) => {
            const data = stats[mod.id] || { propio: 0, rival: 0 };
            const total = data.propio + data.rival;
            const propioPercent = total > 0 ? Math.round((data.propio / total) * 100) : 0;

            return (
              <button
                key={mod.id}
                onClick={() => setSelectedModule(mod.id)}
                className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3 text-left hover:ring-2 hover:ring-gn transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{mod.icon}</span>
                  <span className="text-[10px] font-bold text-dk-4 uppercase tracking-wider">
                    {mod.label}
                  </span>
                </div>
                {total > 0 ? (
                  <>
                    <div className="text-center mb-2">
                      <span className="text-lg font-extrabold text-white">{total}</span>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-dk-3 mb-2">
                      <div className="bg-gn rounded-l-full transition-all" style={{ width: `${propioPercent}%` }} />
                      <div className="bg-rd rounded-r-full transition-all" style={{ width: `${100 - propioPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold text-gn">P: {data.propio}</span>
                      <span className="font-bold text-rd">R: {data.rival}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[9px] text-dk-3 text-center py-2">Sin datos</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
