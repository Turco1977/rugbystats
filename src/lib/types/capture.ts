import type { ModuloType, Perspectiva, Tiempo } from "./domain";

/** Steps in the capture flow */
export type CaptureStep = "modulo" | "perspectiva" | "motivo" | "resultado" | "detalle" | "confirm" | "incidencia";

/** Module config for the capture UI */
export interface ModuleConfig {
  id: ModuloType;
  label: string;
  color: string;
  colorHover: string;
  icon: string;
  motivos: { key: string; label: string; short: string }[];
  resultados: { key: string; label: string }[];
  hasRobo?: boolean;
  hasRecupero?: boolean;
  hasPerspective?: boolean;
  motivoResultados?: Record<string, { key: string; label: string }[]>;
}

/** Pending event being built through the capture flow */
export interface PendingEvent {
  modulo: ModuloType;
  perspectiva: Perspectiva;
  motivo: string;
  resultado: string;
  extra?: Record<string, unknown>;
}

/** Recorded event in the local queue */
export interface QueuedEvent extends PendingEvent {
  id: string;
  timestamp: string;
  numero: number;
  cargadoPor: string;
  synced: boolean;
  tiempo: Tiempo;
}
