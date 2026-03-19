"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { MODULE_CONFIG } from "@/lib/constants/modules";

// When perspective is "rival" and module has robo, show these instead
const ROBO_RESULTADOS = [
  { key: "robado", label: "Robado" },
  { key: "perdido", label: "Perdido" },
];

// When perspective is "rival" and module has recupero, show these instead
const RECUPERO_RESULTADOS = [
  { key: "recuperada", label: "Recuperada" },
  { key: "perdida", label: "Perdida" },
];

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

  // Choose resultados: motivo-specific first, then perspective-based, then default
  let resultados = moduleConfig.resultados;
  if (moduleConfig.motivoResultados && selectedMotivo && moduleConfig.motivoResultados[selectedMotivo]) {
    resultados = moduleConfig.motivoResultados[selectedMotivo];
  } else if (selectedPerspectiva === "rival") {
    if (moduleConfig.hasRobo) {
      resultados = ROBO_RESULTADOS;
    } else if (moduleConfig.hasRecupero) {
      resultados = RECUPERO_RESULTADOS;
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <div className="text-center">
        <p className="text-g-4 text-xs uppercase tracking-widest mb-1">
          {selectedModulo}{moduleConfig.hasPerspective !== false ? ` · ${selectedPerspectiva === "propio" ? "P" : "R"}` : ""} · {motivoLabel}
        </p>
        <h2 className="text-white text-xl font-bold">Resultado</h2>
      </div>

      <div className="flex gap-4 w-full max-w-xs">
        {resultados.map((res) => {
          // ATAQUE: all green, DEFENSA: all red, others: positive=green, negative=red
          let btnColor: string;
          if (selectedModulo === "ATAQUE") {
            btnColor = "bg-gn";
          } else if (selectedModulo === "DEFENSA") {
            btnColor = "bg-rd";
          } else {
            const isPositive =
              res.key === "obtenido" ||
              res.key === "obtenida" ||
              res.key === "robado" ||
              res.key === "recuperada" ||
              res.key === "puntos" ||
              res.key === "exitosa" ||
              res.key === "eficiente";
            btnColor = isPositive ? "bg-gn" : "bg-rd";
          }

          return (
            <button
              key={res.key}
              onClick={() => {
                selectResultado(res.key);
                if (typeof navigator !== "undefined" && navigator.vibrate) {
                  navigator.vibrate(100);
                }
              }}
              className={`flex-1 rounded-lg py-6 text-base font-bold text-white
                         active:scale-95 transition-transform shadow-card-sm
                         ${btnColor}`}
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
