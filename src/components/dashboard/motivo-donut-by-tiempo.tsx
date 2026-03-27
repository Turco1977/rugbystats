"use client";

import { useState } from "react";
import { DonutChart } from "./donut-chart";
import type { ModuleConfig } from "@/lib/types/capture";
import type { PartidoEvento } from "./partido-module-card";

interface MotivoDonutByTiempoProps {
  moduleConfig: ModuleConfig;
  eventos: PartidoEvento[];
}

const POSITIVE_RESULTADOS = new Set([
  "obtenido", "obtenida", "exitosa", "puntos", "eficiente", "robado", "recuperada",
]);

// In DEFENSA "puntos" = they scored = negative
const DEFENSA_NEGATIVE = new Set(["puntos"]);

// Green shades for positive motivos, red shades for negative
const GREEN_SHADES = ["#10B981", "#059669", "#34D399", "#065F46", "#6EE7B7"];
const RED_SHADES = ["#C8102E", "#F87171", "#DC2626", "#991B1B", "#FCA5A5"];

export function MotivoDonutByTiempo({ moduleConfig, eventos }: MotivoDonutByTiempoProps) {
  const [selectedTiempo, setSelectedTiempo] = useState<"all" | "1T" | "2T">("all");

  const moduleEventos = eventos.filter((e) => e.modulo === moduleConfig.id && e.perspectiva === "propio");

  // Filter by tiempo
  const filtered = selectedTiempo === "all"
    ? moduleEventos
    : moduleEventos.filter((e) => (e.data?.tiempo as string) === selectedTiempo);

  // Group by motivo and whether the result was positive
  const motivoPositive: Record<string, number> = {};
  const motivoNegative: Record<string, number> = {};

  const isDefensa = moduleConfig.id === "DEFENSA";

  for (const e of filtered) {
    const motivo = (e.data?.motivo as string) || "?";
    const resultado = (e.data?.resultado as string) || "";
    const isPos = isDefensa
      ? resultado === "recuperada"
      : POSITIVE_RESULTADOS.has(resultado);

    if (isPos) {
      motivoPositive[motivo] = (motivoPositive[motivo] || 0) + 1;
    } else {
      motivoNegative[motivo] = (motivoNegative[motivo] || 0) + 1;
    }
  }

  // Build donut segments: positive motivos in greens, negative in reds
  const segments: { label: string; value: number; color: string }[] = [];

  moduleConfig.motivos.forEach((m, i) => {
    const posCount = motivoPositive[m.key] ?? 0;
    const negCount = motivoNegative[m.key] ?? 0;
    if (posCount > 0) {
      segments.push({
        label: `${m.label} ✓`,
        value: posCount,
        color: GREEN_SHADES[i % GREEN_SHADES.length],
      });
    }
    if (negCount > 0) {
      segments.push({
        label: `${m.label} ✗`,
        value: negCount,
        color: RED_SHADES[i % RED_SHADES.length],
      });
    }
  });

  const total = segments.reduce((s, seg) => s + seg.value, 0);

  // Count by tiempo for tab badges
  const count1T = moduleEventos.filter((e) => (e.data?.tiempo as string) === "1T").length;
  const count2T = moduleEventos.filter((e) => (e.data?.tiempo as string) === "2T").length;
  const countAll = moduleEventos.length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider">
          Desglose por Motivo
        </h3>

        {/* Tiempo tabs */}
        <div className="flex gap-1">
          {[
            { key: "all" as const, label: "Todo", count: countAll },
            { key: "1T" as const, label: "1T", count: count1T },
            { key: "2T" as const, label: "2T", count: count2T },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTiempo(tab.key)}
              className={`text-[9px] font-bold px-2 py-1 rounded transition-colors ${
                selectedTiempo === tab.key
                  ? "bg-nv text-white"
                  : "bg-g-1 border border-g-2 text-g-4 hover:bg-g-2"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        <p className="text-xs text-g-3 text-center py-6">Sin datos para este período</p>
      ) : (
        <div className="flex flex-col items-center">
          <DonutChart
            segments={segments}
            size={180}
            strokeWidth={30}
            centerValue={total}
            centerLabel="eventos"
          />

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-4 w-full">
            {segments.map((seg, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-[10px] text-g-5 font-medium truncate">
                  {seg.label}
                </span>
                <span className="text-[10px] font-bold text-nv ml-auto">
                  {seg.value}
                </span>
                <span className="text-[9px] text-g-3 w-7 text-right">
                  {Math.round((seg.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
