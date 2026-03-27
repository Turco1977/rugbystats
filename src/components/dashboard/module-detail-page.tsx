"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG, MODULE_SLUG_MAP } from "@/lib/constants/modules";
import { DonutChart } from "./donut-chart";
import { TrendChart } from "./trend-chart";

interface ModuleDetailPageProps {
  moduleSlug: string;
}

interface RawEvento {
  id: string;
  partido_id: string;
  modulo: string;
  perspectiva: string;
  data: Record<string, string>;
  tiempo: string;
  partidos: {
    id: string;
    division: string;
    rama: string;
    fecha_numero: number;
    equipo_visitante: { short_name: string; name: string } | null;
    jornadas: { date: string } | null;
  } | null;
}

const POSITIVE_RESULTS = new Set([
  "obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado",
]);

function isPositiveResult(resultado: string, modulo: string): boolean {
  if (modulo === "DEFENSA") return resultado === "recuperada";
  return POSITIVE_RESULTS.has(resultado);
}

const DIVISIONS = ["M19", "M17", "M16", "M15"];

export function ModuleDetailPage({ moduleSlug }: ModuleDetailPageProps) {
  const [selectedDivision, setSelectedDivision] = useState("M19");
  const [eventos, setEventos] = useState<RawEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<"ganados" | "perdidos" | null>(null);
  const [motivoDrill, setMotivoDrill] = useState<string | null>(null);

  const moduloType = MODULE_SLUG_MAP[moduleSlug];
  const moduleConfig = MODULE_CONFIG.find((m) => m.id === moduloType);

  useEffect(() => {
    if (!moduleConfig) return;

    async function fetchData() {
      setLoading(true);
      const supabase = createClient();

      // Fetch all eventos for this module with partido info
      const { data } = await supabase
        .from("eventos")
        .select(`
          id, partido_id, modulo, perspectiva, data, tiempo,
          partidos!inner(
            id, division, rama, fecha_numero,
            equipo_visitante:teams!equipo_visitante_id(short_name, name),
            jornadas!inner(date)
          )
        `)
        .eq("modulo", moduloType)
        .eq("partidos.status", "finished")
        .order("created_at", { ascending: true });

      setEventos((data || []) as unknown as RawEvento[]);
      setLoading(false);
    }

    fetchData();
  }, [moduloType, moduleConfig]);

  // Reset drills on filter change
  useEffect(() => { setDrillDown(null); setMotivoDrill(null); }, [selectedDivision]);

  if (!moduleConfig) {
    return <p className="text-sm text-rd">Módulo no encontrado: {moduleSlug}</p>;
  }

  // Filter by division only (all ramas combined)
  const filtered = eventos.filter((e) => {
    if (!e.partidos) return false;
    return e.partidos.division === selectedDivision;
  });

  // Basic stats
  const hasPerspective = moduleConfig.hasPerspective !== false;
  const propioEvents = hasPerspective ? filtered.filter((e) => e.perspectiva === "propio") : filtered;
  const rivalEvents = hasPerspective ? filtered.filter((e) => e.perspectiva === "rival") : [];
  const totalAll = filtered.length;
  const totalPropio = propioEvents.length;
  const totalRival = rivalEvents.length;

  // Ganados / Perdidos
  const ganados = propioEvents.filter((e) => isPositiveResult(e.data?.resultado || "", moduloType));
  const perdidos = propioEvents.filter((e) => !ganados.includes(e));
  const ganadosPct = propioEvents.length > 0 ? Math.round((ganados.length / propioEvents.length) * 100) : 0;

  // Drill-down effectiveness
  const drillEvents = drillDown === "ganados" ? ganados : drillDown === "perdidos" ? perdidos : [];
  const drillMotivos: Record<string, number> = {};
  drillEvents.forEach((e) => { const m = e.data?.motivo || "?"; drillMotivos[m] = (drillMotivos[m] || 0) + 1; });

  // Motivo donut
  const GREEN_SHADES = ["#10B981", "#059669", "#34D399", "#065F46", "#6EE7B7"];
  const RED_SHADES = ["#C8102E", "#F87171", "#DC2626", "#991B1B", "#FCA5A5"];
  const motivoPositive: Record<string, number> = {};
  const motivoNegative: Record<string, number> = {};
  propioEvents.forEach((e) => {
    const motivo = e.data?.motivo || "?";
    const resultado = e.data?.resultado || "";
    if (isPositiveResult(resultado, moduloType)) motivoPositive[motivo] = (motivoPositive[motivo] || 0) + 1;
    else motivoNegative[motivo] = (motivoNegative[motivo] || 0) + 1;
  });
  const motivoSegments: { label: string; value: number; color: string; motivo: string }[] = [];
  moduleConfig.motivos.forEach((m, i) => {
    const pos = motivoPositive[m.key] ?? 0;
    const neg = motivoNegative[m.key] ?? 0;
    if (pos > 0) motivoSegments.push({ label: `${m.label} ✓`, value: pos, color: GREEN_SHADES[i % GREEN_SHADES.length], motivo: m.key });
    if (neg > 0) motivoSegments.push({ label: `${m.label} ✗`, value: neg, color: RED_SHADES[i % RED_SHADES.length], motivo: m.key });
  });
  const motivoTotal = motivoSegments.reduce((s, seg) => s + seg.value, 0);

  // Motivo drill-down
  const motivoDrillEvents = motivoDrill ? propioEvents.filter((e) => e.data?.motivo === motivoDrill) : [];
  const motivoDrillResultados: Record<string, number> = {};
  motivoDrillEvents.forEach((e) => { const r = e.data?.resultado || "?"; motivoDrillResultados[r] = (motivoDrillResultados[r] || 0) + 1; });

  // Progression by match (per-match effectiveness)
  const matchMap = new Map<string, { fechaNumero: number; rivalName: string; ganados: number; total: number }>();
  propioEvents.forEach((e) => {
    const pid = e.partido_id;
    if (!matchMap.has(pid)) {
      matchMap.set(pid, {
        fechaNumero: e.partidos?.fecha_numero || 0,
        rivalName: e.partidos?.equipo_visitante?.short_name || e.partidos?.equipo_visitante?.name || "Rival",
        ganados: 0,
        total: 0,
      });
    }
    const m = matchMap.get(pid)!;
    m.total++;
    if (isPositiveResult(e.data?.resultado || "", moduloType)) m.ganados++;
  });
  const perMatchData = Array.from(matchMap.values())
    .sort((a, b) => a.fechaNumero - b.fechaNumero)
    .map((m) => ({
      label: `#${m.fechaNumero} ${m.rivalName}`,
      value: m.total > 0 ? Math.round((m.ganados / m.total) * 100) : 0,
    }));

  // Rama comparison
  const ramaStats: Record<string, { ganados: number; total: number }> = {};
  eventos.filter((e) => e.partidos?.division === selectedDivision).forEach((e) => {
    const rama = e.partidos?.rama || "?";
    if (!ramaStats[rama]) ramaStats[rama] = { ganados: 0, total: 0 };
    const resultado = e.data?.resultado || "";
    ramaStats[rama].total++;
    if (isPositiveResult(resultado, moduloType)) ramaStats[rama].ganados++;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{moduleConfig.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-nv">{moduleConfig.label}</h2>
            <p className="text-[10px] text-g-4">
              Rendimiento global {selectedDivision} — Sumatoria de todas las ramas
            </p>
          </div>
        </div>
      </div>

      <div className={`h-1 rounded-full ${moduleConfig.color} mb-4`} />

      {/* Division tabs */}
      <div className="flex gap-2 mb-3">
        {DIVISIONS.map((div) => (
          <button
            key={div}
            onClick={() => { setSelectedDivision(div); }}
            className={`text-xs font-bold px-4 py-2 rounded-md transition-colors ${
              div === selectedDivision ? "bg-nv text-white" : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"
            }`}
          >
            {div}
          </button>
        ))}
      </div>

      {/* No rama tabs — modules show ALL ramas combined */}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-g-3 animate-pulse">Cargando estadísticas...</div>
        </div>
      ) : totalAll === 0 ? (
        <div className="card text-center py-12">
          <p className="text-sm text-g-4">Sin datos de {moduleConfig.label} para {selectedDivision}</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="card-compact text-center">
              <p className="text-[10px] text-g-4 font-semibold uppercase">Total de {moduleConfig.label}</p>
              <p className="text-2xl font-extrabold text-nv">{totalAll}</p>
            </div>
            <div className="card-compact text-center">
              <p className="text-[10px] text-gn font-semibold uppercase">Propio</p>
              <p className="text-2xl font-extrabold text-gn">{totalPropio}</p>
            </div>
            <div className="card-compact text-center">
              <p className="text-[10px] text-rd font-semibold uppercase">Rival</p>
              <p className="text-2xl font-extrabold text-rd">{totalRival}</p>
            </div>
          </div>

          {/* Donut: Efectividad */}
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
                    {Object.entries(drillMotivos).sort(([, a], [, b]) => b - a).map(([motivo, count]) => {
                      const drillTotal = Object.values(drillMotivos).reduce((s, v) => s + v, 0);
                      const pct = drillTotal > 0 ? Math.round((count / drillTotal) * 100) : 0;
                      const mLabel = moduleConfig.motivos.find((m) => m.key === motivo)?.label || motivo;
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
                            <div className={`h-full rounded-full transition-all duration-500 ${drillDown === "ganados" ? "bg-gn" : "bg-rd"}`} style={{ width: `${pct}%` }} />
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
                    const key = motivoSegments.find((ms) => ms.label === seg.label)?.motivo || null;
                    setMotivoDrill((prev) => prev === key ? null : key);
                  }}
                />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
                  {motivoSegments.map((seg, i) => (
                    <button
                      key={i}
                      onClick={() => setMotivoDrill((prev) => prev === seg.motivo ? null : seg.motivo)}
                      className={`flex items-center gap-2 px-1 py-0.5 rounded transition-colors text-left ${motivoDrill === seg.motivo ? "bg-g-1" : "hover:bg-g-1/50"}`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-[10px] text-g-5 font-medium truncate">{seg.label}</span>
                      <span className="text-[10px] font-bold text-nv ml-auto">{seg.value}</span>
                      <span className="text-[9px] text-g-3 w-7 text-right">{Math.round((seg.value / motivoTotal) * 100)}%</span>
                    </button>
                  ))}
                </div>
              </div>
              {motivoDrill && Object.keys(motivoDrillResultados).length > 0 && (
                <div className="border-t border-g-2 pt-3 mt-4">
                  <h4 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
                    {moduleConfig.motivos.find((m) => m.key === motivoDrill)?.label || motivoDrill} — Detalle
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(motivoDrillResultados).sort(([, a], [, b]) => b - a).map(([resultado, count]) => {
                      const resTotal = Object.values(motivoDrillResultados).reduce((s, v) => s + v, 0);
                      const pct = resTotal > 0 ? Math.round((count / resTotal) * 100) : 0;
                      const isPos = isPositiveResult(resultado, moduloType);
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
                            <div className={`h-full rounded-full transition-all duration-500 ${isPos ? "bg-gn" : "bg-rd"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Progresión por fecha */}
          {perMatchData.length > 1 && (
            <div className="mb-6">
              <TrendChart data={perMatchData} colorClass={moduleConfig.color} />
            </div>
          )}

          {/* Comparativa entre ramas */}
          {Object.keys(ramaStats).length > 1 && (
            <div className="card mb-6">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-4">
                Comparativa por Rama — {moduleConfig.label}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(ramaStats).sort(([a], [b]) => a.localeCompare(b)).map(([rama, rs]) => {
                  const eff = rs.total > 0 ? Math.round((rs.ganados / rs.total) * 100) : 0;
                  return (
                    <div key={rama} className="text-center">
                      <DonutChart
                        segments={[
                          { label: "Ganados", value: rs.ganados, color: "#10B981" },
                          { label: "Perdidos", value: rs.total - rs.ganados, color: "#C8102E" },
                        ]}
                        size={100}
                        strokeWidth={16}
                        centerValue={`${eff}%`}
                        centerLabel=""
                      />
                      <p className="text-xs font-bold text-nv mt-2">{selectedDivision} {rama}</p>
                      <p className="text-[9px] text-g-3">{rs.total} eventos</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-match detail table */}
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-g-2">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider">
                Detalle por Partido
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-g-1">
                    <th className="text-left text-[10px] font-bold text-g-4 uppercase py-2 px-3">Fecha</th>
                    <th className="text-left text-[10px] font-bold text-g-4 uppercase py-2 px-3">Rival</th>
                    <th className="text-center text-[10px] font-bold text-g-4 uppercase py-2 px-3">Total</th>
                    <th className="text-center text-[10px] font-bold text-g-4 uppercase py-2 px-3">Eff%</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(matchMap.entries()).sort(([, a], [, b]) => a.fechaNumero - b.fechaNumero).map(([pid, m]) => {
                    const eff = m.total > 0 ? Math.round((m.ganados / m.total) * 100) : 0;
                    return (
                      <tr key={pid} className="border-t border-g-2 hover:bg-g-1 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-semibold text-nv">#{m.fechaNumero}</td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-g-5">{m.rivalName}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-bold text-nv">{m.total}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`badge ${eff >= 60 ? "bg-gn-bg text-gn-forest" : eff >= 40 ? "bg-yl/10 text-yl-dark" : "bg-rd-bg text-rd"}`}>
                            {eff}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {matchMap.size === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-xs text-g-3">Sin partidos registrados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
