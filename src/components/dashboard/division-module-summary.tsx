"use client";

import { useEffect, useState } from "react";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { getEventosByModulo } from "@/lib/supabase/queries";
import { aggregateStats, type AggregatedStats } from "@/lib/utils/aggregate-stats";
import Link from "next/link";

interface DivisionModuleSummaryProps {
  plantel: string; // "A", "B", "C"
}

interface ModuleSummary {
  id: string;
  label: string;
  icon: string;
  color: string;
  href: string;
  effectiveness: number;
  trend: "up" | "down" | "stable";
  kpiLabel: string;
  kpiValue: string;
  totalEvents: number;
}

export function DivisionModuleSummary({ plantel }: DivisionModuleSummaryProps) {
  const [summaries, setSummaries] = useState<ModuleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      const results: ModuleSummary[] = [];

      for (const mc of MODULE_CONFIG) {
        try {
          const eventos = await getEventosByModulo(mc.id, "2026");
          const agg = aggregateStats(eventos ?? [], plantel, mc);
          const ms = agg.moduleSpecific;

          let kpiLabel = "";
          let kpiValue = "";

          if (mc.id === "LINE" || mc.id === "SCRUM") {
            kpiLabel = "Dominio";
            kpiValue = `${ms.dominanceIndex ?? 0}%`;
          } else if (mc.id === "SALIDA") {
            kpiLabel = "Recuperos";
            kpiValue = `${agg.recuperoCount}`;
          } else if (mc.id === "ATAQUE") {
            kpiLabel = "Pts anotados";
            kpiValue = `${ms.totalPuntos ?? 0}`;
          } else if (mc.id === "DEFENSA") {
            kpiLabel = "Pts recibidos";
            kpiValue = `${ms.totalPuntos ?? 0}`;
          } else if (mc.id === "PIE") {
            kpiLabel = "Territorio";
            const t = ms.territoryBreakdown;
            const total = (t?.campo ?? 0) + (t?.recupero ?? 0);
            kpiValue = total > 0 ? `${Math.round(((t?.campo ?? 0) / total) * 100)}%` : "—";
          }

          results.push({
            id: mc.id,
            label: mc.label,
            icon: mc.icon,
            color: mc.color,
            href: `/${mc.id === "SALIDA" ? "salidas" : mc.id.toLowerCase()}`,
            effectiveness: agg.effectiveness,
            trend: agg.trend,
            kpiLabel,
            kpiValue,
            totalEvents: agg.totalPropio + agg.totalRival,
          });
        } catch {
          // Skip modules with errors
        }
      }

      setSummaries(results);
      setLoading(false);
    }

    fetchAll();
  }, [plantel]);

  if (loading) {
    return (
      <div className="py-6 text-center">
        <p className="text-xs text-g-3 dark:text-dk-4 animate-pulse">Cargando resumen de módulos...</p>
      </div>
    );
  }

  if (summaries.length === 0) return null;

  const trendArrow = (t: "up" | "down" | "stable") =>
    t === "up" ? "↑" : t === "down" ? "↓" : "→";
  const trendColor = (t: "up" | "down" | "stable") =>
    t === "up" ? "text-gn" : t === "down" ? "text-rd" : "text-g-4 dark:text-dk-4";

  return (
    <div>
      <h3 className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-widest mb-3">
        Rendimiento por Módulo
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {summaries.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className="card hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-sm">{s.icon}</span>
                <span className="text-xs font-bold text-g-5 dark:text-white group-hover:text-nv dark:group-hover:text-bl transition-colors">
                  {s.label}
                </span>
              </div>
              {s.totalEvents > 0 && (
                <span className={`text-sm font-bold ${trendColor(s.trend)}`}>
                  {trendArrow(s.trend)}
                </span>
              )}
            </div>
            {s.totalEvents > 0 ? (
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-g-4 dark:text-dk-4">Efectividad</p>
                  <p className={`text-xl font-black ${
                    s.effectiveness >= 60 ? "text-gn" : s.effectiveness >= 40 ? "text-yl-dark" : "text-rd"
                  }`}>
                    {s.effectiveness}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-g-4 dark:text-dk-4">{s.kpiLabel}</p>
                  <p className="text-lg font-bold text-nv dark:text-white">{s.kpiValue}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-g-3 dark:text-dk-4">Sin datos</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
