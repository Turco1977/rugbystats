"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";

export function ConfirmFlash() {
  const selectedModulo = useCaptureStore((s) => s.selectedModulo);
  const selectedResultado = useCaptureStore((s) => s.selectedResultado);

  const isPositive =
    selectedResultado === "obtenido" ||
    selectedResultado === "obtenida" ||
    selectedResultado === "puntos" ||
    selectedResultado === "exitosa" ||
    selectedResultado === "eficiente";

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center gap-3
                   ${isPositive ? "bg-gn" : "bg-rd"} transition-colors`}
    >
      <span className="text-5xl">
        {isPositive ? "✓" : "✗"}
      </span>
      <p className="text-white text-xl font-bold">{selectedModulo}</p>
      <p className="text-white/80 text-sm">
        {selectedResultado} — Registrado
      </p>
    </div>
  );
}
