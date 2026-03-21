"use client";

import type { ModuleSpecificStats } from "@/lib/utils/aggregate-stats";
import type { ModuleConfig } from "@/lib/types/capture";

interface SetPieceKPIsProps {
  stats: ModuleSpecificStats;
  moduleConfig: ModuleConfig;
}

function Gauge({ value, label, color }: { value: number; label: string; color: string }) {
  const clamp = Math.min(100, Math.max(0, value));
  return (
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto">
        <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-g-2 dark:text-dk-3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
            strokeDasharray={`${clamp} ${100 - clamp}`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-g-5 dark:text-white">
          {value}%
        </span>
      </div>
      <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 mt-1 uppercase">{label}</p>
    </div>
  );
}

export function SetPieceKPIs({ stats, moduleConfig }: SetPieceKPIsProps) {
  const isScrum = moduleConfig.id === "SCRUM";

  return (
    <div className="space-y-4">
      {/* Gauges row */}
      <div className="flex items-center justify-around">
        <Gauge value={stats.stealRate ?? 0} label="Steal Rate" color="stroke-gn" />
        <Gauge value={stats.dominanceIndex ?? 0} label="Dominio" color="stroke-bl" />
        <Gauge value={100 - (stats.lossToStealRate ?? 0)} label="Protección" color="stroke-yl" />
      </div>

      {/* Scrum penalty balance */}
      {isScrum && stats.penaltyBalance && (
        <div className="flex items-center justify-center gap-4 text-xs">
          <span className="text-gn font-bold">Penales a favor: {stats.penaltyBalance.rival}</span>
          <span className="text-g-3 dark:text-dk-3">|</span>
          <span className="text-rd font-bold">Penales en contra: {stats.penaltyBalance.propio}</span>
        </div>
      )}

      {/* Motivo effectiveness matrix */}
      {stats.motivoEffectiveness && Object.keys(stats.motivoEffectiveness).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-g-4 dark:text-dk-4 uppercase tracking-widest mb-2">
            Efectividad por Motivo
          </p>
          <div className="space-y-1.5">
            {moduleConfig.motivos.map((mot) => {
              const eff = stats.motivoEffectiveness?.[mot.key];
              if (!eff || eff.total === 0) return null;
              return (
                <div key={mot.key} className="flex items-center gap-2">
                  <span className="text-xs font-bold w-6 text-g-5 dark:text-white">{mot.short}</span>
                  <div className="flex-1 h-5 bg-g-1 dark:bg-dk-3 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gn rounded-full transition-all"
                      style={{ width: `${eff.pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-g-5 dark:text-white">
                      {eff.positive}/{eff.total} ({eff.pct}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
