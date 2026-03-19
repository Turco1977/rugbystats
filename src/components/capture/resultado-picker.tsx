"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { MODULE_CONFIG } from "@/lib/constants/modules";

export function ResultadoPicker() {
  const selectResultado = useCaptureStore((s) => s.selectResultado);
  const selectedModulo = useCaptureStore((s) => s.selectedModulo);
  const selectedPerspectiva = useCaptureStore((s) => s.selectedPerspectiva);
  const selectedMotivo = useCaptureStore((s) => s.selectedMotivo);
  const setStep = useCaptureStore((s) => s.setStep);

  const moduleConfig = MODULE_CONFIG.find((m) => m.id === selectedModulo);
  if (!moduleConfig) return null;

  const motivoLabel =
    moduleConfig.motivos.find((m) => m.key === selectedMotivo)?.label ||
    selectedMotivo;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-g-4 text-xs uppercase tracking-widest mb-1">
          {selectedModulo} · {selectedPerspectiva === "propio" ? "P" : "R"} · {motivoLabel}
        </p>
        <h2 className="text-white text-xl font-bold">Resultado</h2>
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        {moduleConfig.resultados.map((res) => {
          const isPositive =
            res.key === "obtenido" ||
            res.key === "obtenida" ||
            res.key === "puntos" ||
            res.key === "exitosa" ||
            res.key === "eficiente";

          return (
            <button
              key={res.key}
              onClick={() => {
                selectResultado(res.key);
                // Trigger vibration if available (mobile)
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(100);
                }
              }}
              className={`flex-1 rounded-lg py-6 text-base font-bold text-white
                         active:scale-95 transition-transform shadow-card-sm
                         ${isPositive ? "bg-gn" : "bg-rd"}`}
            >
              {res.label}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setStep("motivo")}
        className="text-dk-4 text-xs mt-2 hover:text-white"
      >
        ← Volver
      </button>
    </div>
  );
}
