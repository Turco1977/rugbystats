"use client";

import type { AggregatedStats } from "@/lib/utils/aggregate-stats";

interface SalidaKPIsProps {
  stats: AggregatedStats;
}

function StatCard({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-g-1 dark:bg-dk-3">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase mt-1">{label}</p>
    </div>
  );
}

export function SalidaKPIs({ stats }: SalidaKPIsProps) {
  const { effectiveness, recuperoCount, totalRival, moduleSpecific: ms } = stats;

  const recoveryRate = totalRival > 0 ? Math.round((recuperoCount / totalRival) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard value={`${effectiveness}%`} label="Retención" color="text-gn" />
        <StatCard value={`${recoveryRate}%`} label="Recuperación" color="text-bl" />
        <StatCard value={`${ms.errorRate ?? 0}%`} label="% Errores" color="text-rd" />
      </div>

      {/* Forced vs Unforced errors */}
      {(ms.errorRate ?? 0) > 0 && (
        <div>
          <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-widest mb-2">
            Tipo de Errores
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-6 bg-g-1 dark:bg-dk-3 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-or transition-all flex items-center justify-center"
                style={{ width: `${ms.forcedErrorRatio ?? 0}%` }}
              >
                {(ms.forcedErrorRatio ?? 0) > 15 && (
                  <span className="text-[9px] font-bold text-white">EF {ms.forcedErrorRatio}%</span>
                )}
              </div>
              <div
                className="h-full bg-rd transition-all flex items-center justify-center"
                style={{ width: `${100 - (ms.forcedErrorRatio ?? 0)}%` }}
              >
                {(100 - (ms.forcedErrorRatio ?? 0)) > 15 && (
                  <span className="text-[9px] font-bold text-white">ENF {100 - (ms.forcedErrorRatio ?? 0)}%</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-between text-[9px] text-g-4 dark:text-dk-4 mt-1">
            <span>Forzados (rival presiona)</span>
            <span>No Forzados (entrenable)</span>
          </div>
        </div>
      )}
    </div>
  );
}
