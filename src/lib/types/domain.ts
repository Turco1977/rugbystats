// ============================================================
// RUGBY STATS — Domain Types (based on PRD v0.1)
// Hierarchy: Jornada > Partido > Posesion > Evento > Atributos
// ============================================================

// --- Enums ---

export type Division = "M15" | "M16" | "M17" | "M19";

export type PartidoStatus = "scheduled" | "live" | "finished" | "cancelled";

export type SessionRole = "director" | "cargador" | "viewer";

export type Perspectiva = "propio" | "rival";

export type Tiempo = "1T" | "2T";

// Module types
export type ModuloType =
  | "LINE"
  | "SCRUM"
  | "SALIDA"
  | "ATAQUE"
  | "DEFENSA"
  | "PIE"
  | "INCIDENCIA";

// LINE motives
export type LineMotive = "T" | "E" | "I" | "P" | "M"; // Tiro / Ejecución / Infracción / Perfecto / Mérito
export type LineResult = "obtenido" | "perdido";
export type LineRobo = "robado" | "perdido_en_robo";

// SCRUM motives
export type ScrumMotive = "P" | "I" | "R" | "G"; // Perfecto / Infracción / Retroceso / Giro
export type ScrumResult = "obtenido" | "perdido";
export type ScrumRobo = "robado" | "perdido_en_robo";

// SALIDA motives
export type SalidaMotive = "P" | "I" | "S" | "ENF" | "EF"; // Perfecta / Infracción / Suelo / Enfrentamiento / Efectiva
export type SalidaResult = "obtenida" | "perdida";
export type SalidaRecupero = "recuperada" | "perdida";

// PIE motives
export type PieMotive = "C" | "R" | "Penal" | "FreeKick"; // Campo / Recupero / Penal / FK táctico
export type PieCalidad = "eficiente" | "deficitario";
export type PieTerritorial = "ganado" | "perdido";

// --- Core Entities ---

/** L1 — Jornada: groups all matches for a tournament day */
export interface Jornada {
  id: string;
  name: string; // e.g. "Torneo Apertura – Fecha 3"
  date: string; // ISO date
  season: string; // e.g. "2026"
  createdAt: string;
}

/** L2 — Partido: single match within a Jornada */
export interface Partido {
  id: string;
  jornadaId: string;
  division: Division;
  rama: string; // A, B, or C
  equipoLocal: string;
  equipoVisitante: string;
  cancha?: string;
  horario?: string;
  status: PartidoStatus;
  puntosLocal: number;
  puntosVisitante: number;
  sessionCode?: string; // 6-digit code for collaborative session
  tiempoActual: Tiempo;
  tiempoInicio1t?: string;
  tiempoFin1t?: string;
  tiempoInicio2t?: string;
  tiempoFin2t?: string;
  createdAt: string;
}

/** L3 — Posesion: continuous sequence of phases within a match */
export interface Posesion {
  id: string;
  partidoId: string;
  numero: number; // Posesión #N
  periodo: "1T" | "2T"; // 1st/2nd half
  minuto?: number;
  createdAt: string;
}

/** L4/L5 — Evento: discrete typed occurrence with attributes */
export interface EventoBase {
  id: string;
  partidoId: string;
  posesionId?: string;
  modulo: ModuloType;
  perspectiva: Perspectiva;
  timestamp: string; // ISO datetime with ms precision
  cargadoPor: string; // user/session identifier
  numero: number; // Sequential per module per match (1st scrum, 2nd scrum, etc.)
}

export interface EventoLine extends EventoBase {
  modulo: "LINE";
  motivo: LineMotive;
  resultado: LineResult;
  robo?: LineRobo;
}

export interface EventoScrum extends EventoBase {
  modulo: "SCRUM";
  motivo: ScrumMotive;
  resultado: ScrumResult;
  robo?: ScrumRobo;
}

export interface EventoSalida extends EventoBase {
  modulo: "SALIDA";
  motivo: SalidaMotive;
  resultado: SalidaResult;
  recupero?: SalidaRecupero;
}

export interface EventoAtaque extends EventoBase {
  modulo: "ATAQUE";
  primeraFase: number;
  sistema?: string;
  puntosAnotados: number;
  perdidaMotivo?: string;
  quiebreFranco: number;
  eficiencia22?: number; // percentage
}

export interface EventoDefensa extends EventoBase {
  modulo: "DEFENSA";
  primeraFaseDefensiva: number;
  sistemaDefensivo?: string;
  puntosRecibidos: number;
  recupero?: boolean;
  recuperoMotivo?: string;
  quiebreFrancoRival: number;
  eficiencia22?: number;
}

export interface EventoPie extends EventoBase {
  modulo: "PIE";
  motivo: PieMotive;
  calidad: PieCalidad;
  resultadoTerritorial: PieTerritorial;
}

export type Evento =
  | EventoLine
  | EventoScrum
  | EventoSalida
  | EventoAtaque
  | EventoDefensa
  | EventoPie;

// --- Session ---

export interface Session {
  id: string;
  partidoId: string;
  code: string; // 6-digit join code
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  displayName: string;
  role: SessionRole;
  isConnected: boolean;
  lastSeenAt: string;
}

// --- Fixture ---

export interface FixtureMatch {
  fecha: number; // Round number (1-7)
  date: string; // ISO date
  local: string;
  visitante: string;
  zona: string;
  division: Division;
}
