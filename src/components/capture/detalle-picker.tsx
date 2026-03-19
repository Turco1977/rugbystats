"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { PUNTOS_DETALLE } from "@/lib/constants/modules";

export function DetallePicker() {
  const selectDetalle = useCaptureStore((s) => s.selectDetalle);
  const selectedModulo = useCaptureStore((s) => s.selectedModulo);
  const setStep = useCaptureStore((s) => s.setStep);

  const isAtaque = selectedModulo === "ATAQUE";

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-g-4 text-xs uppercase tracking-widest mb-1">
          {selectedModulo} · Puntos
        </p>
        <h2 className="text-white text-xl font-bold">Tipo de Puntos</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {PUNTOS_DETALLE.map((d) => (
          <button
            key={d.key}
            onClick={() => {
              selectDetalle(d.key, d.points);
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(100);
              }
            }}
            className={`rounded-lg py-5 px-4 text-center font-bold text-white
                       active:scale-95 transition-transform shadow-card-sm
                       ${isAtaque ? "bg-gn" : "bg-rd"}`}
          >
            <span className="block text-lg">{d.label}</span>
            <span className="block text-xs opacity-75 mt-1">{d.points} pts</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep("resultado")}
        className="text-dk-4 text-xs mt-2 hover:text-white"
      >
        ← Volver
      </button>
    </div>
  );
}
