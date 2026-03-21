"use client";

import type { ModuleSpecificStats } from "@/lib/utils/aggregate-stats";

interface ScoringKPIsProps {
  stats: ModuleSpecificStats;
  isDefensa: boolean;
}

const DETALLE_LABELS: Record<string, { label: string; emoji: string }> = {
  try_convertido: { label: "Try Conv.", emoji: "🏉" },
  try: { label: "Try", emoji: "🏈" },
  penal: { label: "Penal", emoji: "🥅" },
  drop: { label: "Drop", emoji: "🦶" },
};

export function ScoringKPIs({ stats, isDefensa }: ScoringKPIsProps) {
  const title = isDefensa ? "Puntos Recibidos" : "Puntos Anotados";
  const mainColor = isDefensa ? "text-rd" : "text-gn";
  const convLabel = isDefensa ? "Contención E22" : "Conversión E22";
  const convValue = isDefensa
    ? (stats.conversionRate != null ? 100 - stats.conversionRate : 0)
    : (stats.conversionRate ?? 0);

  return (
    <div className="space-y-4">
      {/* Total points */}
      <div className="text-center p-4 rounded-lg bg-g-1 dark:bg-dk-3">
        <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase">{title}</p>
        <p className={`text-4xl font-black ${mainColor}`}>{stats.totalPuntos ?? 0}</p>
        <p className="text-xs text-g-4 dark:text-dk-4 mt-1">
          {stats.pointsPerMatch ?? 0} pts/partido · {stats.pointsPerEntry ?? 0} pts/entrada E22
        </p>
      </div>

      {/* Points breakdown */}
      {stats.puntosBreakdown && Object.keys(stats.puntosBreakdown).length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(DETALLE_LABELS).map(([key, { label, emoji }]) => {
            const count = stats.puntosBreakdown?.[key] ?? 0;
            return (
              <div key={key} className="text-center p-2 rounded-lg bg-g-1 dark:bg-dk-3">
                <p className="text-lg">{emoji}</p>
                <p className="text-xl font-black text-g-5 dark:text-white">{count}</p>
                <p className="text-[9px] font-bold text-g-4 dark:text-dk-4">{label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Conversion + Primera Fase vs Sistema */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-g-1 dark:bg-dk-3 text-center">
          <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase">{convLabel}</p>
          <p className={`text-2xl font-black ${convValue >= 50 ? "text-gn" : "text-rd"}`}>
            {convValue}%
          </p>
        </div>
        {stats.primeraFaseVsSistema && (
          <div className="p-3 rounded-lg bg-g-1 dark:bg-dk-3 text-center">
            <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase">1ra Fase vs Sistema</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-sm font-bold text-bl">{stats.primeraFaseVsSistema.primeraFase}</span>
              <span className="text-g-3">:</span>
              <span className="text-sm font-bold text-pr">{stats.primeraFaseVsSistema.sistema}</span>
            </div>
            <div className="flex justify-center gap-2 text-[9px] text-g-4 dark:text-dk-4">
              <span>1ra Fase</span>
              <span>Sistema</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
