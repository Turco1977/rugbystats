"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG } from "@/lib/constants/modules";
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

const POSITIVE_RESULTS = new Set([
  "obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado",
]);

function isPositiveResult(resultado: string, modulo: string): boolean {
  if (modulo === "DEFENSA") return resultado === "recuperada";
  return POSITIVE_RESULTS.has(resultado);
}

export default function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [partido, setPartido] = useState<PartidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedTiempo, setSelectedTiempo] = useState<TiempoFilter>("all");
  const [drillDown, setDrillDown] = useState<"ganados" | "perdidos" | null>(null);
  const [motivoDrill, setMotivoDrill] = useState<string | null>(null);
  const [showIncForm, setShowIncForm] = useState(false);
  const [editingIncId, setEditingIncId] = useState<string | null>(null);
  const [incTipo, setIncTipo] = useState("");
  const [incNombre, setIncNombre] = useState("");
  const [incDesc, setIncDesc] = useState("");
  const [incTiempo, setIncTiempo] = useState<"1T" | "2T">("1T");
  const [incSaving, setIncSaving] = useState(false);
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

  // Reset drill-downs when changing module
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

  const TiempoTabs = () => (
    <div className="flex gap-1 mb-4">
      {(["all", "1T", "2T"] as TiempoFilter[]).map((t) => (
        <button
          key={t}
          onClick={() => setSelectedTiempo(t)}
          className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
            selectedTiempo === t
              ? t === "1T" ? "bg-gn text-white" : t === "2T" ? "bg-bl text-white" : "bg-nv text-white"
              : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"
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

    // For modules without perspective (ATAQUE, DEFENSA, PIE), use all events
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

    // Drill-down data for effectiveness
    const drillEvents = drillDown === "ganados" ? ganados : drillDown === "perdidos" ? perdidos : [];
    const drillMotivos: Record<string, number> = {};
    drillEvents.forEach((ev) => {
      const m = (ev.data as Record<string, string>)?.motivo || "?";
      drillMotivos[m] = (drillMotivos[m] || 0) + 1;
    });

    // Motivo donut data
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

    // Motivo drill-down: when clicking a motivo segment, show resultado breakdown
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
        {propioEvents.length > 0 && (
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
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded ${drillDown === "ganados" ? "bg-gn-bg text-gn-forest" : "text-g-4"}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-gn" /> Ganados: {ganados.length} ({ganadosPct}%)
                </button>
                <button
                  onClick={() => setDrillDown((p) => p === "perdidos" ? null : "perdidos")}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded ${drillDown === "perdidos" ? "bg-rd-bg text-rd" : "text-g-4"}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-rd" /> Perdidos: {perdidos.length} ({100 - ganadosPct}%)
                </button>
              </div>
            </div>

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
        )}

        {/* Desglose por motivo — clickeable */}
        {motivoTotal > 0 && (
          <div className="card mb-6">
            <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
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
                      motivoDrill === seg.motivo ? "bg-g-1" : "hover:bg-g-1/50"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-[10px] text-g-5 font-medium truncate">{seg.label}</span>
                    <span className="text-[10px] font-bold text-nv ml-auto">{seg.value}</span>
                    <span className="text-[9px] text-g-3 w-7 text-right">{Math.round((seg.value / motivoTotal) * 100)}%</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Motivo drill-down: resultado breakdown */}
            {motivoDrill && Object.keys(motivoDrillResultados).length > 0 && (
              <div className="border-t border-g-2 pt-3 mt-4">
                <h4 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
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
                            <span className="text-xs font-semibold text-g-5 capitalize">{resultado.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-nv">{count}</span>
                              <span className="text-[10px] text-g-3">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-g-1 overflow-hidden">
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
                {total > 0 ? (
                  <>
                    <div className="text-center mb-2">
                      <span className="text-lg font-extrabold text-nv">{total}</span>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-g-1 mb-2">
                      <div className="bg-gn rounded-l-full transition-all" style={{ width: `${propioPercent}%` }} />
                      <div className="bg-rd rounded-r-full transition-all" style={{ width: `${100 - propioPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="font-bold text-gn-dark">P: {data.propio}</span>
                      <span className="font-bold text-rd">R: {data.rival}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[9px] text-g-3 text-center py-2">Sin datos</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Eficacia en 22 — bigger */}
      <div className="mb-6">
        <Eficacia22Card eventos={filteredEvents} />
      </div>

      {/* Incidencias */}
      {(() => {
        const incidencias = filteredEvents.filter((ev) => ev.modulo === "INCIDENCIA");

        const INCIDENCIA_TYPES = [
          { key: "tarjeta_roja", label: "Tarjeta Roja", icon: "🟥", color: "border-rd bg-rd/10" },
          { key: "tarjeta_amarilla", label: "Tarjeta Amarilla", icon: "🟨", color: "border-yl bg-yl/10" },
          { key: "lesion", label: "Lesión", icon: "🏥", color: "border-bl bg-bl-bg" },
          { key: "publico", label: "Público", icon: "👥", color: "border-g-3 bg-g-1" },
          { key: "disciplina", label: "Disciplina", icon: "⚠️", color: "border-yl bg-yl/10" },
        ];
        const typeMap = Object.fromEntries(INCIDENCIA_TYPES.map((t) => [t.key, t]));

        const resetIncForm = () => {
          setShowIncForm(false);
          setEditingIncId(null);
          setIncTipo("");
          setIncNombre("");
          setIncDesc("");
          setIncTiempo("1T");
        };

        const startEdit = (ev: typeof incidencias[0]) => {
          const data = ev.data as Record<string, string>;
          setEditingIncId(ev.id);
          setIncTipo(data?.tipo || data?.motivo || "");
          setIncNombre(data?.nombre || "");
          setIncDesc(data?.descripcion || "");
          setIncTiempo(ev.tiempo || "1T");
          setShowIncForm(true);
        };

        const saveIncidencia = async () => {
          if (!incTipo) return;
          setIncSaving(true);
          const supabase = createClient();
          const incData = {
            tipo: incTipo,
            motivo: incTipo,
            resultado: incDesc || incTipo,
            ...(incNombre ? { nombre: incNombre } : {}),
            ...(incDesc ? { descripcion: incDesc } : {}),
          };

          if (editingIncId) {
            await supabase
              .from("eventos")
              .update({ data: incData, tiempo: incTiempo })
              .eq("id", editingIncId);
          } else {
            // Get next numero
            const existingCount = incidencias.length;
            await supabase.from("eventos").insert({
              partido_id: id,
              modulo: "INCIDENCIA",
              perspectiva: "propio",
              numero: existingCount + 1,
              data: incData,
              tiempo: incTiempo,
              cargado_por: "Post-partido",
            });
          }
          setIncSaving(false);
          resetIncForm();
        };

        const deleteIncidencia = async (incId: string) => {
          const supabase = createClient();
          await supabase.from("eventos").delete().eq("id", incId);
        };

        return (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider">
                Incidencias {incidencias.length > 0 ? `(${incidencias.length})` : ""}
              </h3>
              {!showIncForm && (
                <button
                  onClick={() => { resetIncForm(); setShowIncForm(true); }}
                  className="text-[10px] font-bold text-bl hover:text-bl-dark flex items-center gap-1"
                >
                  + Agregar incidencia
                </button>
              )}
            </div>

            {/* Formulario agregar/editar */}
            {showIncForm && (
              <div className="card mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-g-4 uppercase">
                    {editingIncId ? "Editar incidencia" : "Nueva incidencia"}
                  </h4>
                  <button onClick={resetIncForm} className="text-[10px] text-g-4 hover:text-nv">✕</button>
                </div>

                {/* Tipo */}
                <div className="grid grid-cols-5 gap-1.5 mb-3">
                  {INCIDENCIA_TYPES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setIncTipo(t.key)}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded border text-center transition-all ${
                        incTipo === t.key
                          ? "ring-2 ring-nv border-nv"
                          : "border-g-2 hover:border-g-3"
                      }`}
                    >
                      <span className="text-base">{t.icon}</span>
                      <span className="text-[8px] font-semibold text-g-5 leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Nombre */}
                <input
                  type="text"
                  value={incNombre}
                  onChange={(e) => setIncNombre(e.target.value)}
                  placeholder="Nombre del jugador (opcional)"
                  className="w-full rounded border border-g-2 bg-white px-3 py-2 text-xs text-nv placeholder:text-g-3 mb-2 focus:border-bl focus:outline-none"
                />

                {/* Descripción */}
                <textarea
                  value={incDesc}
                  onChange={(e) => setIncDesc(e.target.value)}
                  placeholder="Descripción (ej: Esguince tobillo izquierdo)"
                  rows={2}
                  className="w-full rounded border border-g-2 bg-white px-3 py-2 text-xs text-nv placeholder:text-g-3 mb-2 focus:border-bl focus:outline-none resize-none"
                />

                {/* Tiempo */}
                <div className="flex gap-2 mb-3">
                  {(["1T", "2T"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setIncTiempo(t)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded ${
                        incTiempo === t
                          ? t === "1T" ? "bg-gn text-white" : "bg-bl text-white"
                          : "bg-g-1 border border-g-2 text-g-4"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Guardar */}
                <button
                  onClick={saveIncidencia}
                  disabled={!incTipo || incSaving}
                  className="w-full rounded bg-nv text-white text-xs font-bold py-2.5 disabled:opacity-30 hover:bg-nv-light transition-colors"
                >
                  {incSaving ? "Guardando..." : editingIncId ? "Guardar cambios" : "Agregar incidencia"}
                </button>
              </div>
            )}

            {/* Lista o vacío */}
            {incidencias.length === 0 && !showIncForm ? (
              <div className="card text-center py-6">
                <span className="text-lg">✅</span>
                <p className="text-sm font-semibold text-gn-dark mt-1">Sin incidencias</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incidencias.map((ev) => {
                  const data = ev.data as Record<string, string>;
                  const tipo = data?.tipo || data?.motivo || "otro";
                  const nombre = data?.nombre || "";
                  const descripcion = data?.descripcion || data?.resultado || "";
                  const t = typeMap[tipo];
                  const icon = t?.icon || "📋";
                  const colorClass = t?.color || "border-g-2 bg-g-1";
                  const time = new Date(ev.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });

                  return (
                    <div key={ev.id} className={`rounded-md border px-4 py-3 ${colorClass}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-nv capitalize">
                              {tipo.replace(/_/g, " ")}
                            </span>
                            {nombre && (
                              <span className="text-xs font-semibold text-g-5">— {nombre}</span>
                            )}
                            {ev.tiempo && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                ev.tiempo === "1T" ? "bg-gn/20 text-gn" : "bg-bl/20 text-bl"
                              }`}>
                                {ev.tiempo}
                              </span>
                            )}
                          </div>
                          {descripcion && descripcion !== tipo && (
                            <p className="text-[11px] text-g-4 mt-0.5">{descripcion}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[10px] text-g-3">{time}</span>
                          <button
                            onClick={() => startEdit(ev)}
                            className="text-[10px] text-bl hover:text-bl-dark font-semibold"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteIncidencia(ev.id)}
                            className="text-[10px] text-rd hover:text-rd-light font-semibold"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
