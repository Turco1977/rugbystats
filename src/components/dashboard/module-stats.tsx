"use client";

import { MODULE_CONFIG } from "@/lib/constants/modules";

interface ModuleStatsProps {
  stats: Record<string, { propio: number; rival: number }>;
}

export function ModuleStats({ stats }: ModuleStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {MODULE_CONFIG.map((mod) => {
        const data = stats[mod.id] || { propio: 0, rival: 0 };
        const total = data.propio + data.rival;
        const propioPercent = total > 0 ? Math.round((data.propio / total) * 100) : 0;

        return (
          <div key={mod.id} className="card-compact">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{mod.icon}</span>
              <span className="text-[10px] font-bold text-g-4 uppercase tracking-wider">
                {mod.label}
              </span>
            </div>

            {/* Bar comparison */}
            <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-g-1 mb-2">
              <div
                className="bg-gn rounded-l-full transition-all"
                style={{ width: `${propioPercent}%` }}
              />
              <div
                className="bg-rd rounded-r-full transition-all"
                style={{ width: `${100 - propioPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px]">
              <span className="font-bold text-gn-dark">
                P: {data.propio}
              </span>
              <span className="font-bold text-rd">
                R: {data.rival}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
