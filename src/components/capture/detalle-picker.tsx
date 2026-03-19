"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { PUNTOS_DETALLE, PIE_DETALLE } from "@/lib/constants/modules";

export function DetallePicker() {
  const selectDetalle = useCaptureStore((s) => s.selectDetalle);
  const selectedModulo = useCaptureStore((s) => s.selectedModulo);
  const selectedResultado = useCaptureStore((s) => s.selectedResultado);
  const setStep = useCaptureStore((s) => s.setStep);

  const isPie = selectedModulo === "PIE";
  const isAtaque = selectedModulo === "ATAQUE";

  const options = isPie ? PIE_DETALLE : PUNTOS_DETALLE;
  const title = isPie ? "Detalle" : "Tipo de Puntos";
  const breadcrumb = isPie
    ? `${selectedModulo} · ${selectedResultado === "eficiente" ? "Eficiente" : selectedResultado === "ganado" ? "Ganado" : selectedResultado}`
    : `${selectedModulo} · Puntos`;

  let btnColor: string;
  if (isAtaque) btnColor = "bg-gn";
  else if (selectedModulo === "DEFENSA") btnColor = "bg-rd";
  else btnColor = "bg-nv";

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-g-4 text-xs uppercase tracking-widest mb-1">
          {breadcrumb}
        </p>
        <h2 className="text-white text-xl font-bold">{title}</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {options.map((d) => (
          <button
            key={d.key}
            onClick={() => {
              selectDetalle(d.key, "points" in d ? (d as { points: number }).points : 0);
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(100);
              }
            }}
            className={`rounded-lg py-5 px-4 text-center font-bold text-white
                       active:scale-95 transition-transform shadow-card-sm
                       ${btnColor}`}
          >
            <span className="block text-lg">{d.label}</span>
            {"points" in d && (
              <span className="block text-xs opacity-75 mt-1">{(d as { points: number }).points} pts</span>
            )}
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
