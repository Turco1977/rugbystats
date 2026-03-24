import { PLANTEL_MAP } from "@/lib/constants/modules";
import type { ModuleConfig } from "@/lib/types/capture";

export interface MatchStat {
  partidoId: string;
  fechaNumero: number;
  jornadaDate: string;
  rivalName: string;
  propioCount: number;
  rivalCount: number;
  effectiveness: number;
  motivoBreakdown: Record<string, number>;
}

export interface AggregatedStats {
  totalPropio: number;
  totalRival: number;
  effectiveness: number;
  motivoBreakdown: Record<string, number>;
  resultadoBreakdown: Record<string, number>;
  roboCount: number;
  recuperoCount: number;
  perMatchStats: MatchStat[];
}

/**
 * Determines positive resultado keys for effectiveness calculation.
 * Positive = obtenido, obtenida, exitosa, puntos, eficiente
 */
const POSITIVE_RESULTADOS = new Set([
  "obtenido",
  "obtenida",
  "exitosa",
  "puntos",
  "eficiente",
]);

/**
 * Aggregates raw evento rows (with nested partido data) into stats for a given plantel.
 * @param tiempo - Optional: filter events by half ('1T' or '2T'). Undefined = all events.
 */
export function aggregateStats(
  eventos: Array<Record<string, unknown>>,
  plantel: string,
  moduleConfig: ModuleConfig,
  tiempo?: "1T" | "2T"
): AggregatedStats {
  const divisions = PLANTEL_MAP[plantel]?.divisions ?? [];

  // Filter eventos by division and optionally by half
  const filtered = eventos.filter((e) => {
    const partido = e.partidos as Record<string, unknown> | undefined;
    if (!partido || !divisions.includes(partido.division as string)) return false;
    if (tiempo) {
      const eventTiempo = (e.tiempo as string) ?? "1T";
      if (eventTiempo !== tiempo) return false;
    }
    return true;
  });

  let totalPropio = 0;
  let totalRival = 0;
  let positiveCount = 0;
  const motivoBreakdown: Record<string, number> = {};
  const resultadoBreakdown: Record<string, number> = {};
  let roboCount = 0;
  let recuperoCount = 0;

  // Per-match accumulator
  const matchMap = new Map<
    string,
    {
      partidoId: string;
      fechaNumero: number;
      jornadaDate: string;
      rivalName: string;
      propioCount: number;
      rivalCount: number;
      positiveCount: number;
      totalPropio: number;
      motivoBreakdown: Record<string, number>;
    }
  >();

  for (const e of filtered) {
    const perspectiva = e.perspectiva as string;
    const data = (e.data ?? {}) as Record<string, unknown>;
    const motivo = (data.motivo ?? "") as string;
    const resultado = (data.resultado ?? "") as string;
    const partido = e.partidos as Record<string, unknown>;
    const partidoId = partido.id as string;
    const fechaNumero = (partido.fecha_numero ?? 0) as number;
    const jornada = (partido.jornadas ?? {}) as Record<string, unknown>;
    const jornadaDate = (jornada.date ?? "") as string;

    // Determine rival name: if we are "Los Tordos", rival is the other team
    const equipoVisitante = (partido.equipo_visitante ?? {}) as Record<string, unknown>;
    const equipoLocal = (partido.equipo_local ?? {}) as Record<string, unknown>;
    const rivalName =
      ((equipoVisitante.short_name ?? equipoVisitante.name) as string) ||
      ((equipoLocal.short_name ?? equipoLocal.name) as string) ||
      "Rival";

    // Totals
    if (perspectiva === "propio") {
      totalPropio++;
      if (POSITIVE_RESULTADOS.has(resultado)) positiveCount++;
    } else {
      totalRival++;
    }

    // Motivo breakdown (propio only)
    if (perspectiva === "propio" && motivo) {
      motivoBreakdown[motivo] = (motivoBreakdown[motivo] ?? 0) + 1;
    }

    // Resultado breakdown (propio only)
    if (perspectiva === "propio" && resultado) {
      resultadoBreakdown[resultado] = (resultadoBreakdown[resultado] ?? 0) + 1;
    }

    // Robos / Recuperos
    if (data.robo === "robado") roboCount++;
    if (data.recupero === "recuperada") recuperoCount++;

    // Per-match accumulation
    if (!matchMap.has(partidoId)) {
      matchMap.set(partidoId, {
        partidoId,
        fechaNumero,
        jornadaDate,
        rivalName,
        propioCount: 0,
        rivalCount: 0,
        positiveCount: 0,
        totalPropio: 0,
        motivoBreakdown: {},
      });
    }
    const m = matchMap.get(partidoId)!;
    if (perspectiva === "propio") {
      m.propioCount++;
      m.totalPropio++;
      if (POSITIVE_RESULTADOS.has(resultado)) m.positiveCount++;
      if (motivo) m.motivoBreakdown[motivo] = (m.motivoBreakdown[motivo] ?? 0) + 1;
    } else {
      m.rivalCount++;
    }
  }

  const perMatchStats: MatchStat[] = Array.from(matchMap.values())
    .sort((a, b) => a.fechaNumero - b.fechaNumero)
    .map((m) => ({
      partidoId: m.partidoId,
      fechaNumero: m.fechaNumero,
      jornadaDate: m.jornadaDate,
      rivalName: m.rivalName,
      propioCount: m.propioCount,
      rivalCount: m.rivalCount,
      effectiveness: m.totalPropio > 0 ? Math.round((m.positiveCount / m.totalPropio) * 100) : 0,
      motivoBreakdown: m.motivoBreakdown,
    }));

  return {
    totalPropio,
    totalRival,
    effectiveness: totalPropio > 0 ? Math.round((positiveCount / totalPropio) * 100) : 0,
    motivoBreakdown,
    resultadoBreakdown,
    roboCount,
    recuperoCount,
    perMatchStats,
  };
}
