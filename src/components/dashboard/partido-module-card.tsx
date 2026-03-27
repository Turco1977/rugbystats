"use client";

import { useState } from "react";
import { DonutChart } from "./donut-chart";
import type { ModuleConfig } from "@/lib/types/capture";

/** Raw evento row from Supabase for a single partido */
export interface PartidoEvento {
  id: string;
  modulo: string;
  perspectiva: string;
  numero: number;
  data: Record<string, unknown>;
  cargado_por: string;
  timestamp: string;
}

interface PartidoModuleCardProps {
  moduleConfig: ModuleConfig;
  eventos: PartidoEvento[];
}

const POSITIVE_RESULTADOS = new Set([
  "obtenido", "obtenida", "exitosa", "puntos", "eficiente", "robado", "recuperada",
]);

// In DEFENSA, "puntos" means they scored on us — that's NEGATIVE
const DEFENSA_NEGATIVE_OVERRIDE = new Set(["puntos"]);

// Color map for module bg classes → hex colors for SVG
const MODULE_COLOR_HEX: Record<string, string> = {
  "bg-bl": "#3B82F6",
  "bg-rd": "#C8102E",
  "bg-yl": "#F59E0B",
  "bg-gn": "#10B981",
  "bg-pr": "#8B5CF6",
  "bg-nv-light": "#1E3A5F",
};

export function PartidoModuleCard({ moduleConfig, eventos }: PartidoModuleCardProps) {
  const [drillDown, setDrillDown] = useState<"ganados" | "perdidos" | null>(null);

  const moduleEventos = eventos.filter((e) => e.modulo === moduleConfig.id);
  const propios = moduleEventos.filter((e) => e.perspectiva === "propio");
  const rivales = moduleEventos.filter((e) => e.perspectiva === "rival");

  const total = moduleEventos.length;
  const totalPropio = propios.length;
  const totalRival = rivales.length;

  // Determine if a resultado is positive for this module
  const isPositive = (resultado: string) => {
    if (moduleConfig.id === "DEFENSA") {
      // In DEFENSA: "recuperada" = positive, "puntos" = negative (they scored)
      // "primera_fase" and "sistema" are QF types — neutral/descriptive
      return resultado === "recuperada";
    }
    return POSITIVE_RESULTADOS.has(resultado);
  };

  // Ganados/perdidos based on resultado
  const ganados = propios.filter((e) => isPositive((e.data?.resultado as string) || ""));
  const perdidos = propios.filter((e) => !isPositive((e.data?.resultado as string) || ""));

  // Motivo breakdown for drill-down
  const motivoGanados: Record<string, number> = {};
  const motivoPerdidos: Record<string, number> = {};

  for (const e of ganados) {
    const motivo = (e.data?.motivo as string) || "?";
    motivoGanados[motivo] = (motivoGanados[motivo] || 0) + 1;
  }
  for (const e of perdidos) {
    const motivo = (e.data?.motivo as string) || "?";
    motivoPerdidos[motivo] = (motivoPerdidos[motivo] || 0) + 1;
  }

  const ganadosPct = totalPropio > 0 ? Math.round((ganados.length / totalPropio) * 100) : 0;
  const perdidosPct = totalPropio > 0 ? Math.round((perdidos.length / totalPropio) * 100) : 0;

  const moduleHex = MODULE_COLOR_HEX[moduleConfig.color] || "#3B82F6";

  // Build motivo label map
  const motivoLabelMap: Record<string, string> = {};
  moduleConfig.motivos.forEach((m) => { motivoLabelMap[m.key] = m.label; });

  const activeDrillData = drillDown === "ganados" ? motivoGanados : drillDown === "perdidos" ? motivoPerdidos : null;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{moduleConfig.icon}</span>
          <h3 className="text-sm font-bold text-nv">{moduleConfig.label}</h3>
        </div>
        <span className="text-[10px] font-bold text-g-4">Total: {total}</span>
      </div>

      {/* Color bar */}
      <div className={`h-0.5 rounded-full ${moduleConfig.color} mb-4 opacity-60`} />

      {total === 0 ? (
        <p className="text-xs text-g-3 text-center py-6">Sin eventos registrados</p>
      ) : (
        <>
          {/* Totals row */}
          <div className="flex justify-around text-center mb-4">
            <div>
              <span className="text-xl font-extrabold text-nv">{totalPropio}</span>
              <p className="text-[9px] text-gn-dark font-semibold">Propio</p>
            </div>
            <div className="w-px bg-g-2" />
            <div>
              <span className="text-xl font-extrabold text-nv">{totalRival}</span>
              <p className="text-[9px] text-rd font-semibold">Rival</p>
            </div>
          </div>

          {/* Donut: ganados vs perdidos sobre total propio */}
          <div className="flex flex-col items-center mb-3">
            <p className="text-[9px] text-g-4 font-semibold uppercase tracking-wider mb-2">
              Efectividad propia — Toca para detalle
            </p>
            <DonutChart
              segments={[
                { label: "Ganados", value: ganados.length, color: "#10B981" },
                { label: "Perdidos", value: perdidos.length, color: "#C8102E" },
              ]}
              size={140}
              strokeWidth={24}
              centerValue={`${ganadosPct}%`}
              centerLabel="Efectividad"
              onSegmentClick={(seg) => {
                if (seg.label === "Ganados") setDrillDown(drillDown === "ganados" ? null : "ganados");
                else setDrillDown(drillDown === "perdidos" ? null : "perdidos");
              }}
            />
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => setDrillDown(drillDown === "ganados" ? null : "ganados")}
                className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
                  drillDown === "ganados" ? "bg-gn-bg text-gn-forest" : "text-g-4 hover:text-gn-dark"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-gn" />
                Ganados: {ganados.length} ({ganadosPct}%)
              </button>
              <button
                onClick={() => setDrillDown(drillDown === "perdidos" ? null : "perdidos")}
                className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded transition-colors ${
                  drillDown === "perdidos" ? "bg-rd-bg text-rd" : "text-g-4 hover:text-rd"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rd" />
                Perdidos: {perdidos.length} ({perdidosPct}%)
              </button>
            </div>
          </div>

          {/* Drill-down: motivo breakdown */}
          {activeDrillData && (
            <div className="border-t border-g-2 pt-3 mt-2 animate-in fade-in">
              <h4 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
                {drillDown === "ganados" ? "¿Por qué los ganamos?" : "¿Por qué los perdimos?"}
              </h4>
              <div className="space-y-2">
                {moduleConfig.motivos.map((m) => {
                  const count = activeDrillData[m.key] ?? 0;
                  if (count === 0) return null;
                  const drillTotal = Object.values(activeDrillData).reduce((s, v) => s + v, 0);
                  const pct = drillTotal > 0 ? Math.round((count / drillTotal) * 100) : 0;
                  const isGanados = drillDown === "ganados";

                  return (
                    <div key={m.key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-g-5">
                          {m.short} — {m.label}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-nv">{count}</span>
                          <span className="text-[10px] text-g-3">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-g-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isGanados ? "bg-gn" : "bg-rd"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
