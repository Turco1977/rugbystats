"use client";

import type { ModuleSpecificStats } from "@/lib/utils/aggregate-stats";

interface PieKPIsProps {
  stats: ModuleSpecificStats;
}

export function PieKPIs({ stats }: PieKPIsProps) {
  const territory = stats.territoryBreakdown ?? { campo: 0, recupero: 0 };
  const totalTerritory = territory.campo + territory.recupero;
  const campoPct = totalTerritory > 0 ? Math.round((territory.campo / totalTerritory) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Two gauges */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-4 rounded-lg bg-g-1 dark:bg-dk-3">
          <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase">Eficiencia PEN/FK</p>
          <p className={`text-3xl font-black ${(stats.penFkEfficiency ?? 0) >= 60 ? "text-gn" : "text-rd"}`}>
            {stats.penFkEfficiency ?? 0}%
          </p>
        </div>
        <div className="text-center p-4 rounded-lg bg-g-1 dark:bg-dk-3">
          <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase">Win Rate Táctico</p>
          <p className={`text-3xl font-black ${(stats.tacticoWinRate ?? 0) >= 50 ? "text-gn" : "text-rd"}`}>
            {stats.tacticoWinRate ?? 0}%
          </p>
        </div>
      </div>

      {/* Territory bar */}
      {totalTerritory > 0 && (
        <div>
          <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-widest mb-2">
            Territorio
          </p>
          <div className="h-8 bg-g-1 dark:bg-dk-3 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-bl transition-all flex items-center justify-center"
              style={{ width: `${campoPct}%` }}
            >
              {campoPct > 15 && (
                <span className="text-[10px] font-bold text-white">
                  Campo {territory.campo} ({campoPct}%)
                </span>
              )}
            </div>
            <div
              className="h-full bg-gn transition-all flex items-center justify-center"
              style={{ width: `${100 - campoPct}%` }}
            >
              {(100 - campoPct) > 15 && (
                <span className="text-[10px] font-bold text-white">
                  Recupero {territory.recupero} ({100 - campoPct}%)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
