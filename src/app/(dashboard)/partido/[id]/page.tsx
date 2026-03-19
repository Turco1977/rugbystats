"use client";

import { use } from "react";
import { ModuleStats } from "@/components/dashboard/module-stats";
import { EventFeed } from "@/components/dashboard/event-feed";

// Demo data
const DEMO_STATS: Record<string, { propio: number; rival: number }> = {
  LINE: { propio: 5, rival: 3 },
  SCRUM: { propio: 4, rival: 2 },
  SALIDA: { propio: 3, rival: 3 },
  ATAQUE: { propio: 8, rival: 5 },
  DEFENSA: { propio: 6, rival: 7 },
  PIE: { propio: 4, rival: 3 },
};

const DEMO_EVENTS = [
  { id: "1", modulo: "SCRUM", perspectiva: "propio" as const, motivo: "P", resultado: "obtenido", numero: 4, cargadoPor: "Juan", timestamp: new Date().toISOString() },
  { id: "2", modulo: "LINE", perspectiva: "rival" as const, motivo: "M", resultado: "obtenido", numero: 3, cargadoPor: "Pedro", timestamp: new Date(Date.now() - 30000).toISOString() },
  { id: "3", modulo: "ATAQUE", perspectiva: "propio" as const, motivo: "try", resultado: "puntos", numero: 8, cargadoPor: "Juan", timestamp: new Date(Date.now() - 60000).toISOString() },
  { id: "4", modulo: "PIE", perspectiva: "propio" as const, motivo: "C", resultado: "eficiente", numero: 4, cargadoPor: "Martin", timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: "5", modulo: "DEFENSA", perspectiva: "rival" as const, motivo: "tackle", resultado: "exitosa", numero: 7, cargadoPor: "Pedro", timestamp: new Date(Date.now() - 180000).toISOString() },
];

export default function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <a href="/jornada" className="text-[10px] text-g-4 hover:text-nv">
            ← Volver a Jornada
          </a>
          <h2 className="text-lg font-bold text-nv mt-1">
            Los Tordos A vs Peumayen
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-nv text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
              M19
            </span>
            <span className="badge bg-gn-bg text-gn-forest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
              En vivo
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="text-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-nv">21</span>
            <span className="text-g-3">—</span>
            <span className="text-3xl font-extrabold text-nv">14</span>
          </div>
          <p className="text-[9px] text-g-4 mt-1">2do Tiempo — Min 58</p>
        </div>
      </div>

      {/* Connected users */}
      <div className="flex items-center gap-2 mb-4 p-2.5 bg-white rounded border border-g-2">
        <span className="text-[10px] text-g-4 font-semibold">Cargadores:</span>
        {["Juan", "Pedro", "Martin"].map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 bg-g-1 border border-g-2 rounded-pill px-2 py-0.5 text-[10px] font-semibold text-g-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gn" />
            {name}
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] text-g-3">
          Código: <strong className="text-nv">483921</strong>
        </span>
      </div>

      {/* Module stats */}
      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Estadísticas por Módulo — Propio vs Rival
        </h3>
        <ModuleStats stats={DEMO_STATS} />
      </div>

      {/* Event feed */}
      <EventFeed events={DEMO_EVENTS} />
    </div>
  );
}
