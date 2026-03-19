"use client";

import { MODULE_CONFIG } from "@/lib/constants/modules";
import { useCaptureStore } from "@/hooks/use-capture-store";

export function ModuleGrid() {
  const selectModulo = useCaptureStore((s) => s.selectModulo);
  const counters = useCaptureStore((s) => s.counters);

  return (
    <div className="grid grid-cols-2 gap-3 p-4 flex-1 content-center">
      {MODULE_CONFIG.map((mod) => {
        const propioCount = counters[`${mod.id}_propio`] || 0;
        const rivalCount = counters[`${mod.id}_rival`] || 0;
        const total = propioCount + rivalCount;

        return (
          <button
            key={mod.id}
            onClick={() => selectModulo(mod.id)}
            className={`capture-btn ${mod.color} ${mod.colorHover} relative`}
          >
            <span className="text-2xl leading-none">{mod.icon}</span>
            <span className="text-sm font-bold tracking-wide">
              {mod.label.toUpperCase()}
            </span>
            {total > 0 && (
              <div className="absolute top-2 right-2 flex gap-1">
                <span className="bg-white/25 rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                  {propioCount}P / {rivalCount}R
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
