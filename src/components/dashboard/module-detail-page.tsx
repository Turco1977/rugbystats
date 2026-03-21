"use client";

import { useEffect, useState } from "react";
import { MODULE_CONFIG, PLANTEL_MAP, MODULE_SLUG_MAP } from "@/lib/constants/modules";
import { getEventosByModulo } from "@/lib/supabase/queries";
import { aggregateStats, type AggregatedStats } from "@/lib/utils/aggregate-stats";
import { MotivoBreakdown } from "./motivo-breakdown";
import { TrendChart } from "./trend-chart";
import { TrendIndicator } from "./trend-indicator";
import { BestWorstStrip } from "./best-worst-strip";
import { SetPieceKPIs } from "./set-piece-kpis";
import { SalidaKPIs } from "./salida-kpis";
import { ScoringKPIs } from "./scoring-kpis";
import { PieKPIs } from "./pie-kpis";

interface ModuleDetailPageProps {
  moduleSlug: string;
}

export function ModuleDetailPage({ moduleSlug }: ModuleDetailPageProps) {
  const [selectedPlantel, setSelectedPlantel] = useState("Todos");
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);

  const moduloType = MODULE_SLUG_MAP[moduleSlug];
  const moduleConfig = MODULE_CONFIG.find((m) => m.id === moduloType);

  useEffect(() => {
    if (!moduleConfig) return;

    async function fetchData() {
      setLoading(true);
      try {
        const eventos = await getEventosByModulo(moduloType, "2026");
        const agg = aggregateStats(eventos ?? [], selectedPlantel, moduleConfig!);
        setStats(agg);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [moduloType, selectedPlantel, moduleConfig]);

  if (!moduleConfig) {
    return <p className="text-sm text-rd">Módulo no encontrado: {moduleSlug}</p>;
  }

  const modId = moduleConfig.id;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{moduleConfig.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-nv dark:text-white">{moduleConfig.label}</h2>
            <p className="text-[10px] text-g-4 dark:text-dk-4">
              Temporada 2026 — {selectedPlantel === "Todos" ? "Rendimiento Grupal (A+B+C)" : PLANTEL_MAP[selectedPlantel].label}
            </p>
          </div>
        </div>

        {/* Plantel tabs */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedPlantel("Todos")}
            className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
              selectedPlantel === "Todos"
                ? "bg-gn text-white"
                : "bg-g-1 dark:bg-dk-3 border border-g-2 dark:border-dk-3 text-g-5 dark:text-dk-4 hover:bg-g-2"
            }`}
          >
            Todos
          </button>
          {Object.entries(PLANTEL_MAP).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSelectedPlantel(key)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
                selectedPlantel === key
                  ? "bg-nv text-white"
                  : "bg-g-1 dark:bg-dk-3 border border-g-2 dark:border-dk-3 text-g-5 dark:text-dk-4 hover:bg-g-2"
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Module color bar */}
      <div className={`h-1 rounded-full ${moduleConfig.color} mb-6`} />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-g-3 dark:text-dk-4 animate-pulse">Cargando estadísticas...</div>
        </div>
      ) : stats ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {/* Total P/R */}
            <div className="card">
              <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-2">
                Total Eventos
              </p>
              <span className="text-2xl font-extrabold text-nv dark:text-white">
                {stats.totalPropio + stats.totalRival}
              </span>
              <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-g-1 dark:bg-dk-3 mt-3 mb-2">
                <div
                  className="bg-gn rounded-l-full transition-all"
                  style={{
                    width: `${
                      stats.totalPropio + stats.totalRival > 0
                        ? Math.round((stats.totalPropio / (stats.totalPropio + stats.totalRival)) * 100)
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-rd rounded-r-full transition-all"
                  style={{
                    width: `${
                      stats.totalPropio + stats.totalRival > 0
                        ? Math.round((stats.totalRival / (stats.totalPropio + stats.totalRival)) * 100)
                        : 50
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="font-bold text-gn-dark">Propio: {stats.totalPropio}</span>
                <span className="font-bold text-rd">Rival: {stats.totalRival}</span>
              </div>
            </div>

            {/* Effectiveness + Trend */}
            <div className="card">
              <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-2">
                Efectividad Propia
              </p>
              <div className="flex items-center justify-between">
                <span
                  className={`text-3xl font-extrabold ${
                    stats.effectiveness >= 60 ? "text-gn-dark" : stats.effectiveness >= 40 ? "text-yl-dark" : "text-rd"
                  }`}
                >
                  {stats.effectiveness}%
                </span>
                <TrendIndicator
                  trend={stats.trend}
                  last3={stats.last3Effectiveness}
                  season={stats.effectiveness}
                />
              </div>
              <div className="h-2.5 rounded-full bg-g-1 dark:bg-dk-3 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.effectiveness >= 60 ? "bg-gn" : stats.effectiveness >= 40 ? "bg-yl" : "bg-rd"
                  }`}
                  style={{ width: `${stats.effectiveness}%` }}
                />
              </div>
            </div>

            {/* 3rd card: module-specific KPI */}
            <div className="card">
              {(modId === "LINE" || modId === "SCRUM") && (
                <>
                  <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-2">Dominio Set Piece</p>
                  <span className="text-3xl font-extrabold text-bl">{stats.moduleSpecific.dominanceIndex ?? 0}%</span>
                  <div className="flex justify-between text-[10px] mt-2">
                    <span className="text-gn font-bold">Robos: {stats.roboCount}</span>
                    <span className="text-rd font-bold">Nos roban: {stats.moduleSpecific.lossToStealRate ?? 0}%</span>
                  </div>
                </>
              )}
              {modId === "SALIDA" && (
                <>
                  <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-2">Recuperos</p>
                  <span className="text-3xl font-extrabold text-bl">{stats.recuperoCount}</span>
                  <p className="text-[10px] text-g-4 dark:text-dk-4 mt-1">
                    Errores: {stats.moduleSpecific.errorRate ?? 0}%
                  </p>
                </>
              )}
              {modId === "ATAQUE" && (
                <>
                  <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-2">Puntos Anotados</p>
                  <span className="text-3xl font-extrabold text-gn">{stats.moduleSpecific.totalPuntos ?? 0}</span>
                  <p className="text-[10px] text-g-4 dark:text-dk-4 mt-1">
                    {stats.moduleSpecific.pointsPerMatch ?? 0} pts/partido
                  </p>
                </>
              )}
              {modId === "DEFENSA" && (
                <>
                  <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-2">Puntos Recibidos</p>
                  <span className="text-3xl font-extrabold text-rd">{stats.moduleSpecific.totalPuntos ?? 0}</span>
                  <p className="text-[10px] text-g-4 dark:text-dk-4 mt-1">
                    {stats.moduleSpecific.pointsPerMatch ?? 0} pts/partido
                  </p>
                </>
              )}
              {modId === "PIE" && (
                <>
                  <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-2">Eficiencia Territorial</p>
                  <span className="text-3xl font-extrabold text-bl">
                    {Math.round(((stats.moduleSpecific.penFkEfficiency ?? 0) + (stats.moduleSpecific.tacticoWinRate ?? 0)) / 2)}%
                  </span>
                  <p className="text-[10px] text-g-4 dark:text-dk-4 mt-1">
                    PEN/FK: {stats.moduleSpecific.penFkEfficiency ?? 0}% · Táctico: {stats.moduleSpecific.tacticoWinRate ?? 0}%
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Best/Worst strip */}
          <div className="mb-6">
            <BestWorstStrip best={stats.bestMatch} worst={stats.worstMatch} />
          </div>

          {/* Module-specific KPI section */}
          <div className="card mb-6">
            <h3 className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-widest mb-4">
              {modId === "LINE" || modId === "SCRUM" ? "Análisis Set Piece" :
               modId === "SALIDA" ? "Análisis de Salidas" :
               modId === "ATAQUE" ? "Análisis de Ataque" :
               modId === "DEFENSA" ? "Análisis de Defensa" :
               "Análisis de Juego al Pie"}
            </h3>
            {(modId === "LINE" || modId === "SCRUM") && (
              <SetPieceKPIs stats={stats.moduleSpecific} moduleConfig={moduleConfig} />
            )}
            {modId === "SALIDA" && <SalidaKPIs stats={stats} />}
            {modId === "ATAQUE" && <ScoringKPIs stats={stats.moduleSpecific} isDefensa={false} />}
            {modId === "DEFENSA" && <ScoringKPIs stats={stats.moduleSpecific} isDefensa={true} />}
            {modId === "PIE" && <PieKPIs stats={stats.moduleSpecific} />}
          </div>

          {/* Motivo + Resultado breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <MotivoBreakdown
              breakdown={stats.motivoBreakdown}
              motivos={moduleConfig.motivos}
              colorClass={moduleConfig.color}
            />

            <div className="card">
              <h3 className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider mb-4">
                Desglose por Resultado
              </h3>
              {(() => {
                const total = Object.values(stats.resultadoBreakdown).reduce((sum, v) => sum + v, 0);
                if (total === 0)
                  return <p className="text-xs text-g-3 dark:text-dk-4">Sin datos de resultados</p>;

                // Get all resultado keys including motivoResultados
                const allResultados = moduleConfig.motivoResultados
                  ? Array.from(
                      new Set(
                        Object.values(moduleConfig.motivoResultados).flatMap((arr) =>
                          arr.map((r) => ({ key: r.key, label: r.label }))
                        )
                      )
                    ).filter(
                      (v, i, a) => a.findIndex((t) => t.key === v.key) === i
                    )
                  : moduleConfig.resultados;

                return (
                  <div className="space-y-3">
                    {allResultados.map((r) => {
                      const count = stats.resultadoBreakdown[r.key] ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      const isPositive = ["obtenido", "obtenida", "exitosa", "puntos", "eficiente", "ganado", "recuperada"].includes(r.key);

                      return (
                        <div key={r.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-g-5 dark:text-white">{r.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-nv dark:text-white">{count}</span>
                              <span className="text-[10px] text-g-3 dark:text-dk-4 w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-2.5 rounded-full bg-g-1 dark:bg-dk-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isPositive ? "bg-gn" : "bg-rd"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Trend chart */}
          <div className="mb-6">
            <TrendChart
              data={stats.perMatchStats.map((m) => ({
                label: `#${m.fechaNumero}`,
                value: m.effectiveness,
              }))}
              colorClass={moduleConfig.color}
            />
          </div>

          {/* Points trend (ATAQUE/DEFENSA only) */}
          {(modId === "ATAQUE" || modId === "DEFENSA") && stats.moduleSpecific.perMatchPuntos && (
            <div className="mb-6">
              <TrendChart
                data={stats.moduleSpecific.perMatchPuntos.map((m) => ({
                  label: `#${m.fechaNumero}`,
                  value: m.puntos,
                }))}
                colorClass={modId === "ATAQUE" ? "bg-gn" : "bg-rd"}
              />
            </div>
          )}

          {/* Per-match detail table */}
          <div className="card !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-g-2 dark:border-dk-3">
              <h3 className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider">
                Detalle por Partido
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-g-1 dark:bg-dk-3">
                    <th className="text-left text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">Fecha</th>
                    <th className="text-left text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">Rival</th>
                    <th className="text-center text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">P</th>
                    <th className="text-center text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">R</th>
                    <th className="text-center text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">Neto</th>
                    <th className="text-center text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">Eff%</th>
                    {(modId === "ATAQUE" || modId === "DEFENSA") && (
                      <th className="text-center text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">Pts</th>
                    )}
                    <th className="text-left text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-wider py-2 px-3">Motivos</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perMatchStats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-g-3 dark:text-dk-4">
                        Sin partidos registrados
                      </td>
                    </tr>
                  ) : (
                    stats.perMatchStats.map((m) => {
                      const net = m.propioCount - m.rivalCount;
                      return (
                        <tr key={m.partidoId} className="border-t border-g-2 dark:border-dk-3 hover:bg-g-1 dark:hover:bg-dk-3 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="text-xs font-semibold text-nv dark:text-white">#{m.fechaNumero}</span>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-semibold text-g-5 dark:text-dk-4">{m.rivalName}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-xs font-bold text-gn-dark">{m.propioCount}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-xs font-bold text-rd">{m.rivalCount}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-xs font-bold ${net > 0 ? "text-gn" : net < 0 ? "text-rd" : "text-g-4"}`}>
                              {net > 0 ? "+" : ""}{net}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`badge ${
                                m.effectiveness >= 60
                                  ? "bg-gn-bg text-gn-forest"
                                  : m.effectiveness >= 40
                                  ? "bg-yl/10 text-yl-dark"
                                  : "bg-rd-bg text-rd"
                              }`}
                            >
                              {m.effectiveness}%
                            </span>
                          </td>
                          {(modId === "ATAQUE" || modId === "DEFENSA") && (
                            <td className="py-2.5 px-3 text-center">
                              <span className="text-xs font-bold text-nv dark:text-white">{m.puntos ?? 0}</span>
                            </td>
                          )}
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {moduleConfig.motivos.map((mot) => {
                                const c = m.motivoBreakdown[mot.key] ?? 0;
                                if (c === 0) return null;
                                return (
                                  <span key={mot.key} className="text-[9px] font-semibold text-g-5 dark:text-dk-4 bg-g-1 dark:bg-dk-3 px-1.5 py-0.5 rounded">
                                    {mot.short}:{c}
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-sm text-g-3 dark:text-dk-4">Sin datos para este módulo</p>
        </div>
      )}
    </div>
  );
}
