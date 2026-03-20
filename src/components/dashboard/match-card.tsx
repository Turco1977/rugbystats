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
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
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
  onEdit,
  onDelete,
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

      {/* Edit / Delete actions */}
      {(onEdit || onDelete) && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-g-2 dark:border-dk-3 pt-2">
          {onEdit && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(id); }}
              className="text-bl hover:text-bl-dark text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Editar partido"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(id); }}
              className="text-rd/60 hover:text-rd text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Eliminar partido"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Eliminar
            </button>
          )}
        </div>
      )}
    </a>
  );
}
