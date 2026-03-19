"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { MODULE_CONFIG } from "@/lib/constants/modules";

export function MotivoPicker() {
  const selectMotivo = useCaptureStore((s) => s.selectMotivo);
  const selectedModulo = useCaptureStore((s) => s.selectedModulo);
  const selectedPerspectiva = useCaptureStore((s) => s.selectedPerspectiva);
  const setStep = useCaptureStore((s) => s.setStep);

  const moduleConfig = MODULE_CONFIG.find((m) => m.id === selectedModulo);
  if (!moduleConfig) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-g-4 text-xs uppercase tracking-widest mb-1">
          {selectedModulo} · {selectedPerspectiva === "propio" ? "Propio" : "Rival"}
        </p>
        <h2 className="text-white text-xl font-bold">Motivo</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {moduleConfig.motivos.map((motivo) => (
          <button
            key={motivo.key}
            onClick={() => selectMotivo(motivo.key)}
            className="bg-dk-2 border border-dk-3 rounded-lg py-5 px-4 text-center
                       active:scale-95 active:bg-dk-3 transition-all"
          >
            <span className="block text-lg font-bold text-white">
              {motivo.short}
            </span>
            <span className="block text-[10px] text-dk-4 mt-0.5">
              {motivo.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep("perspectiva")}
        className="text-dk-4 text-xs mt-2 hover:text-white"
      >
        ← Volver
      </button>
    </div>
  );
}
