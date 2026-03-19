"use client";

import type { Division, PartidoStatus } from "@/lib/types/domain";

interface MatchCardProps {
  id: string;
  division: Division;
  equipoLocal: string;
  equipoVisitante: string;
  puntosLocal: number;
  puntosVisitante: number;
  status: PartidoStatus;
  lastEvent?: string;
  sessionCode?: string;
}

const STATUS_CONFIG: Record<
  PartidoStatus,
  { label: string; bg: string; text: string; dot?: string }
> = {
  scheduled: { label: "Programado", bg: "bg-g-1", text: "text-g-5" },
  live: {
    label: "En vivo",
    bg: "bg-gn-bg",
    text: "text-gn-forest",
    dot: "bg-gn animate-pulse",
  },
  finished: { label: "Finalizado", bg: "bg-g-1", text: "text-g-4" },
  cancelled: { label: "Cancelado", bg: "bg-rd-bg", text: "text-rd" },
};

export function MatchCard({
  id,
  division,
  equipoLocal,
  equipoVisitante,
  puntosLocal,
  puntosVisitante,
  status,
  lastEvent,
  sessionCode,
}: MatchCardProps) {
  const statusCfg = STATUS_CONFIG[status];

  return (
    <a href={`/partido/${id}`} className="card hover:shadow-card-sm transition-shadow block">
      {/* Top row: division + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="bg-nv text-white text-[10px] font-bold px-2.5 py-0.5 rounded-sm">
          {division}
        </span>
        <span
          className={`badge ${statusCfg.bg} ${statusCfg.text} flex items-center gap-1`}
        >
          {statusCfg.dot && (
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
          )}
          {statusCfg.label}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-right">
          <p className="text-xs font-semibold text-g-5 truncate">
            {equipoLocal}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3">
          <span className="text-xl font-extrabold text-nv">{puntosLocal}</span>
          <span className="text-g-3 text-sm">—</span>
          <span className="text-xl font-extrabold text-nv">
            {puntosVisitante}
          </span>
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-g-5 truncate">
            {equipoVisitante}
          </p>
        </div>
      </div>

      {/* Last event */}
      {lastEvent && (
        <p className="mt-3 text-[10px] text-g-4 truncate border-t border-g-2 pt-2">
          Último: {lastEvent}
        </p>
      )}

      {/* Session code */}
      {sessionCode && status === "live" && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="text-[9px] text-g-4">Código:</span>
          <span className="font-mono text-xs font-bold text-nv bg-g-1 px-2 py-0.5 rounded">
            {sessionCode}
          </span>
        </div>
      )}
    </a>
  );
}
