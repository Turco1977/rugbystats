"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { PERSPECTIVA_OPTIONS } from "@/lib/constants/modules";

export function PerspectivaPicker() {
  const selectPerspectiva = useCaptureStore((s) => s.selectPerspectiva);
  const selectedModulo = useCaptureStore((s) => s.selectedModulo);
  const resetFlow = useCaptureStore((s) => s.resetFlow);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-g-4 text-xs uppercase tracking-widest mb-1">
          Módulo
        </p>
        <h2 className="text-white text-2xl font-bold">{selectedModulo}</h2>
      </div>

      <p className="text-dk-4 text-sm">¿Propio o Rival?</p>

      <div className="flex gap-4 w-full max-w-xs">
        {PERSPECTIVA_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => selectPerspectiva(opt.key)}
            className={`flex-1 ${opt.color} ${opt.textColor} rounded-lg py-6 text-lg font-bold
                         active:scale-95 transition-transform shadow-card-sm`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={resetFlow}
        className="text-dk-4 text-xs mt-4 hover:text-white"
      >
        ← Volver
      </button>
    </div>
  );
}
