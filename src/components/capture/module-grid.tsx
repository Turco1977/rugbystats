"use client";

import { MODULE_CONFIG } from "@/lib/constants/modules";
import { useCaptureStore } from "@/hooks/use-capture-store";

export function ModuleGrid() {
  const selectModulo = useCaptureStore((s) => s.selectModulo);
  const openIncidencia = useCaptureStore((s) => s.openIncidencia);
  const counters = useCaptureStore((s) => s.counters);
  const matchPhase = useCaptureStore((s) => s.matchPhase);

  const phase = matchPhase();
  const isLocked = phase === "pre_match" || phase === "halftime" || phase === "finished";
  const incCount = counters["INCIDENCIA_propio"] || 0;

  return (
    <div className="flex-1 flex flex-col p-4 gap-3">
      {isLocked && (
        <div className="text-center text-yl text-xs font-medium py-1">
          {phase === "pre_match" ? "⚠ Iniciá el partido para cargar eventos" : phase === "halftime" ? "⚠ Iniciá el 2do tiempo para cargar eventos" : "Partido finalizado"}
        </div>
      )}
      {/* Module grid 2x2 (3 rows) */}
      <div className="grid grid-cols-2 gap-3 flex-1 content-center">
        {MODULE_CONFIG.map((mod) => {
          const propioCount = counters[`${mod.id}_propio`] || 0;
          const rivalCount = counters[`${mod.id}_rival`] || 0;
          const total = propioCount + rivalCount;

          return (
            <button
              key={mod.id}
              onClick={() => !isLocked && selectModulo(mod.id)}
              disabled={isLocked}
              className={`capture-btn ${mod.color} ${mod.colorHover} relative ${isLocked ? "opacity-40 cursor-not-allowed" : ""}`}
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

      {/* Incidencias button - full width below grid */}
      <button
        onClick={() => !isLocked && openIncidencia()}
        disabled={isLocked}
        className={`w-full flex items-center justify-center gap-3 rounded-xl bg-or/90 hover:bg-or ${isLocked ? "opacity-40 cursor-not-allowed" : ""}
                   text-white py-3.5 px-4 transition-colors relative"
      >
        <span className="text-xl">&#x1F6A8;</span>
        <div className="flex flex-col items-start">
          <span className="text-sm font-bold tracking-wide">INCIDENCIAS</span>
          <span className="text-[9px] text-white/60 font-medium">
            Tarjetas &middot; Lesiones &middot; Disciplina
          </span>
        </div>
        {incCount > 0 && (
          <span className="absolute right-3 bg-white/25 rounded-full px-2 py-0.5 text-[10px] font-bold">
            {incCount}
          </span>
        )}
      </button>
    </div>
  );
}
