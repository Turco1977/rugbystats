"use client";

import { useEffect, useState } from "react";
import { MODULE_CONFIG, PLANTEL_MAP, MODULE_SLUG_MAP } from "@/lib/constants/modules";
import { getEventosByModulo } from "@/lib/supabase/queries";
import { aggregateStats, type AggregatedStats } from "@/lib/utils/aggregate-stats";
import { MotivoBreakdown } from "./motivo-breakdown";
import { TrendChart } from "./trend-chart";

interface ModuleDetailPageProps {
  moduleSlug: string;
}

// Demo data for when there's no real data yet
function generateDemoStats(moduleConfig: (typeof MODULE_CONFIG)[0]): AggregatedStats {
  const motivos = moduleConfig.motivos;
  const resultados = moduleConfig.resultados;

  const motivoBreakdown: Record<string, number> = {};
  motivos.forEach((m) => {
    motivoBreakdown[m.key] = Math.floor(Math.random() * 15) + 3;
  });

  const resultadoBreakdown: Record<string, number> = {};
  const posCount = Math.floor(Math.random() * 20) + 15;
  const negCount = Math.floor(Math.random() * 10) + 3;
  resultadoBreakdown[resultados[0].key] = posCount;
  if (resultados[1]) resultadoBreakdown[resultados[1].key] = negCount;

  const totalPropio = posCount + negCount;
  const totalRival = Math.floor(Math.random() * 20) + 8;
  const effectiveness = Math.round((posCount / totalPropio) * 100);

  const rivals = ["Peumayen", "Marista A", "Liceo A", "CPBM", "Mendoza"];
  const perMatchStats = rivals.slice(0, 3).map((rival, i) => {
    const mp = Math.floor(Math.random() * 10) + 3;
    const mr = Math.floor(Math.random() * 8) + 1;
    const pos = Math.floor(mp * 0.6) + Math.floor(Math.random() * 3);
    const matchMotivos: Record<string, number> = {};
    motivos.forEach((m) => {
      matchMotivos[m.key] = Math.floor(Math.random() * 5);
    });
    return {
      partidoId: `demo-${i}`,
      fechaNumero: i + 1,
      jornadaDate: `2026-03-${7 + i * 14}`,
      rivalName: rival,
      propioCount: mp,
      rivalCount: mr,
      effectiveness: Math.round((pos / Math.max(mp, 1)) * 100),
      motivoBreakdown: matchMotivos,
    };
  });

  return {
    totalPropio,
    totalRival,
    effectiveness,
    motivoBreakdown,
    resultadoBreakdown,
    roboCount: moduleConfig.hasRobo ? Math.floor(Math.random() * 5) + 1 : 0,
    recuperoCount: moduleConfig.hasRecupero ? Math.floor(Math.random() * 4) + 1 : 0,
    perMatchStats,
  };
}

type TiempoFilter = "all" | "1T" | "2T";

export function ModuleDetailPage({ moduleSlug }: ModuleDetailPageProps) {
  const [selectedPlantel, setSelectedPlantel] = useState("A");
  const [selectedTiempo, setSelectedTiempo] = useState<TiempoFilter>("all");
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  const moduloType = MODULE_SLUG_MAP[moduleSlug];
  const moduleConfig = MODULE_CONFIG.find((m) => m.id === moduloType);

  useEffect(() => {
    if (!moduleConfig) return;

    async function fetchData() {
      setLoading(true);
      try {
        const eventos = await getEventosByModulo(moduloType, "2026");
        const tiempoArg = selectedTiempo === "all" ? undefined : selectedTiempo;
        const agg = aggregateStats(eventos ?? [], selectedPlantel, moduleConfig!, tiempoArg);

        // If no data, use demo
        if (agg.totalPropio === 0 && agg.totalRival === 0) {
          setStats(generateDemoStats(moduleConfig!));
          setUsingDemo(true);
        } else {
          setStats(agg);
          setUsingDemo(false);
        }
      } catch {
        // Fallback to demo on error (e.g., no Supabase connection)
        setStats(generateDemoStats(moduleConfig!));
        setUsingDemo(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [moduloType, selectedPlantel, selectedTiempo, moduleConfig]);

  if (!moduleConfig) {
    return <p className="text-sm text-rd">Módulo no encontrado: {moduleSlug}</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{moduleConfig.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-nv">{moduleConfig.label}</h2>
            <p className="text-[10px] text-g-4">
              Acumulado Temporada 2026 — {PLANTEL_MAP[selectedPlantel].label}
            </p>
          </div>
        </div>

        {/* Plantel tabs */}
        <div className="flex gap-1.5">
          {Object.entries(PLANTEL_MAP).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setSelectedPlantel(key)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
                selectedPlantel === key
                  ? "bg-nv text-white"
                  : "bg-g-1 border border-g-2 text-g-5 hover:bg-g-2"
              }`}
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tiempo filter tabs */}
      <div className="flex gap-1 mb-3">
        {(["all", "1T", "2T"] as TiempoFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTiempo(t)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
              selectedTiempo === t
                ? t === "1T" ? "bg-gn text-white"
                  : t === "2T" ? "bg-bl text-white"
                  : "bg-nv text-white"
                : "bg-g-1 border border-g-2 text-g-5 hover:bg-g-2"
            }`}
          >
            {t === "all" ? "Todo" : t}
          </button>
        ))}
      </div>

      {/* Module color bar */}
      <div className={`h-1 rounded-full ${moduleConfig.color} mb-6`} />

      {/* Demo banner */}
      {usingDemo && (
        <div className="bg-yl/10 border border-yl/30 rounded-md px-3 py-2 mb-4">
          <p className="text-[10px] text-yl-dark font-semibold">
            Datos de demostración — Los datos reales se cargan desde la plataforma de captura
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-g-3 animate-pulse">Cargando estadísticas...</div>
        </div>
      ) : stats ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {/* Total P/R */}
            <div className="card">
              <p className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-2">
                Total Eventos
              </p>
              <div className="flex items-end gap-3">
                <div>
                  <span className="text-2xl font-extrabold text-nv">
                    {stats.totalPropio + stats.totalRival}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 h-2.5 rounded-full overflow-hidden bg-g-1 mt-3 mb-2">
                <div
                  className="bg-gn rounded-l-full transition-all"
                  style={{
                    width: `${
                      stats.totalPropio + stats.totalRival > 0
                        ? Math.round(
                            (stats.totalPropio / (stats.totalPropio + stats.totalRival)) * 100
                          )
                        : 50
                    }%`,
                  }}
                />
                <div
                  className="bg-rd rounded-r-full transition-all"
                  style={{
                    width: `${
                      stats.totalPropio + stats.totalRival > 0
                        ? Math.round(
                            (stats.totalRival / (stats.totalPropio + stats.totalRival)) * 100
                          )
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

            {/* Effectiveness */}
            <div className="card">
              <p className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-2">
                Efectividad Propia
              </p>
              <div className="flex items-end gap-2">
                <span
                  className={`text-3xl font-extrabold ${
                    stats.effectiveness >= 60 ? "text-gn-dark" : stats.effectiveness >= 40 ? "text-yl-dark" : "text-rd"
                  }`}
                >
                  {stats.effectiveness}%
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-g-1 mt-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.effectiveness >= 60 ? "bg-gn" : stats.effectiveness >= 40 ? "bg-yl" : "bg-rd"
                  }`}
                  style={{ width: `${stats.effectiveness}%` }}
                />
              </div>
              <p className="text-[9px] text-g-3 mt-1">
                Resultados positivos sobre total propio
              </p>
            </div>

            {/* Robo / Recupero */}
            <div className="card">
              <p className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-2">
                {moduleConfig.hasRobo
                  ? "Robos"
                  : moduleConfig.hasRecupero
                  ? "Recuperos"
                  : "Resultado"}
              </p>
              {moduleConfig.hasRobo ? (
                <>
                  <span className="text-3xl font-extrabold text-bl">{stats.roboCount}</span>
                  <p className="text-[9px] text-g-3 mt-1">
                    Robos obtenidos en {moduleConfig.label.toLowerCase()}
                  </p>
                </>
              ) : moduleConfig.hasRecupero ? (
                <>
                  <span className="text-3xl font-extrabold text-bl">{stats.recuperoCount}</span>
                  <p className="text-[9px] text-g-3 mt-1">
                    Recuperos en {moduleConfig.label.toLowerCase()}
                  </p>
                </>
              ) : (
                <>
                  <div className="space-y-1.5 mt-1">
                    {moduleConfig.resultados.map((r) => {
                      const count = stats.resultadoBreakdown[r.key] ?? 0;
                      return (
                        <div key={r.key} className="flex items-center justify-between">
                          <span className="text-xs text-g-5">{r.label}</span>
                          <span className="text-sm font-bold text-nv">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Motivo breakdown + Resultado breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <MotivoBreakdown
              breakdown={stats.motivoBreakdown}
              motivos={moduleConfig.motivos}
              colorClass={moduleConfig.color}
            />

            {/* Resultado breakdown */}
            <div className="card">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-4">
                Desglose por Resultado
              </h3>
              {(() => {
                const total = Object.values(stats.resultadoBreakdown).reduce(
                  (sum, v) => sum + v,
                  0
                );
                if (total === 0)
                  return <p className="text-xs text-g-3">Sin datos de resultados</p>;

                return (
                  <div className="space-y-3">
                    {moduleConfig.resultados.map((r) => {
                      const count = stats.resultadoBreakdown[r.key] ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      const isPositive = [
                        "obtenido",
                        "obtenida",
                        "exitosa",
                        "puntos",
                        "eficiente",
                      ].includes(r.key);

                      return (
                        <div key={r.key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-g-5">{r.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-nv">{count}</span>
                              <span className="text-[10px] text-g-3 w-8 text-right">
                                {pct}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2.5 rounded-full bg-g-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isPositive ? "bg-gn" : "bg-rd"
                              }`}
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
                    <th className="text-left text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                      Fecha
                    </th>
                    <th className="text-left text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                      Rival
                    </th>
                    <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                      P
                    </th>
                    <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                      R
                    </th>
                    <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                      Eff%
                    </th>
                    <th className="text-left text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                      Motivos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.perMatchStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-xs text-g-3">
                        Sin partidos registrados
                      </td>
                    </tr>
                  ) : (
                    stats.perMatchStats.map((m) => (
                      <tr
                        key={m.partidoId}
                        className="border-t border-g-2 hover:bg-g-1 transition-colors"
                      >
                        <td className="py-2.5 px-3">
                          <span className="text-xs font-semibold text-nv">#{m.fechaNumero}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-semibold text-g-5">
                          {m.rivalName}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs font-bold text-gn-dark">{m.propioCount}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs font-bold text-rd">{m.rivalCount}</span>
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
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1.5 flex-wrap">
                            {moduleConfig.motivos.map((mot) => {
                              const c = m.motivoBreakdown[mot.key] ?? 0;
                              if (c === 0) return null;
                              return (
                                <span
                                  key={mot.key}
                                  className="text-[9px] font-semibold text-g-5 bg-g-1 px-1.5 py-0.5 rounded"
                                >
                                  {mot.short}:{c}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
