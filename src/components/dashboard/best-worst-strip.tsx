"use client";

import type { MatchStat } from "@/lib/utils/aggregate-stats";

interface BestWorstStripProps {
  best: MatchStat | null;
  worst: MatchStat | null;
}

export function BestWorstStrip({ best, worst }: BestWorstStripProps) {
  if (!best && !worst) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {best && (
        <div className="rounded-lg border-2 border-gn/30 bg-gn/5 dark:bg-gn/10 p-3">
          <p className="text-[10px] font-bold text-gn uppercase tracking-widest mb-1">Mejor Partido</p>
          <p className="text-sm font-bold text-g-5 dark:text-white">
            #{best.fechaNumero} vs {best.rivalName}
          </p>
          <p className="text-lg font-black text-gn">{best.effectiveness}%</p>
        </div>
      )}
      {worst && (
        <div className="rounded-lg border-2 border-rd/30 bg-rd/5 dark:bg-rd/10 p-3">
          <p className="text-[10px] font-bold text-rd uppercase tracking-widest mb-1">Peor Partido</p>
          <p className="text-sm font-bold text-g-5 dark:text-white">
            #{worst.fechaNumero} vs {worst.rivalName}
          </p>
          <p className="text-lg font-black text-rd">{worst.effectiveness}%</p>
        </div>
      )}
    </div>
  );
}
