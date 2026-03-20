"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { MODULE_CONFIG, PUNTOS_DETALLE } from "@/lib/constants/modules";

export function ConfirmFlash() {
  const selectedModulo = useCaptureStore((s) => s.selectedModulo);
  const selectedResultado = useCaptureStore((s) => s.selectedResultado);
  const selectedMotivo = useCaptureStore((s) => s.selectedMotivo);

  const moduleConfig = MODULE_CONFIG.find((m) => m.id === selectedModulo);

  // Determine color: ATAQUE → green, DEFENSA → red, others by resultado
  let isPositive: boolean;
  if (selectedModulo === "ATAQUE") {
    isPositive = true;
  } else if (selectedModulo === "DEFENSA") {
    isPositive = false;
  } else {
    isPositive =
      selectedResultado === "obtenido" ||
      selectedResultado === "obtenida" ||
      selectedResultado === "robado" ||
      selectedResultado === "recuperada" ||
      selectedResultado === "puntos" ||
      selectedResultado === "exitosa" ||
      selectedResultado === "eficiente" ||
      selectedResultado === "ganado" ||
      selectedResultado === "campo" ||
      selectedResultado === "recupero";
  }

  // Find points value for display
  const puntosDetalle = PUNTOS_DETALLE.find((d) => d.key === selectedResultado);
  const isScoring = !!puntosDetalle;

  // Build label
  const motivoLabel = moduleConfig?.motivos.find((m) => m.key === selectedMotivo)?.label || selectedMotivo;
  const resultLabel = puntosDetalle?.label || selectedResultado;

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center gap-3 transition-colors animate-pulse
                   ${isPositive ? "bg-gn" : "bg-rd"}`}
    >
      {isScoring ? (
        <>
          <span className="text-6xl font-extrabold text-white">
            +{puntosDetalle.points}
          </span>
          <p className="text-white text-xl font-bold">{puntosDetalle.label}</p>
          <p className="text-white/70 text-sm">
            {selectedModulo === "ATAQUE" ? "LOCAL" : "VISITANTE"}
          </p>
        </>
      ) : (
        <>
          <span className="text-5xl">
            {isPositive ? "✓" : "✗"}
          </span>
          <p className="text-white text-xl font-bold">{selectedModulo}</p>
          <p className="text-white/80 text-sm">
            {motivoLabel} → {resultLabel}
          </p>
        </>
      )}
      <p className="text-white/50 text-[10px] mt-2">Registrado</p>
    </div>
  );
}
