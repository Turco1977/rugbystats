import { PLANTEL_MAP, PUNTOS_DETALLE } from "@/lib/constants/modules";
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
  puntos?: number; // ATAQUE: scored, DEFENSA: conceded
}

export interface ModuleSpecificStats {
  // LINE / SCRUM
  stealRate?: number;
  lossToStealRate?: number;
  dominanceIndex?: number;
  motivoEffectiveness?: Record<string, { positive: number; total: number; pct: number }>;
  penaltyBalance?: { propio: number; rival: number }; // SCRUM infractions

  // SALIDA
  errorRate?: number;
  forcedErrorRatio?: number;

  // ATAQUE / DEFENSA
  puntosBreakdown?: Record<string, number>;
  totalPuntos?: number;
  conversionRate?: number;
  pointsPerEntry?: number;
  pointsPerMatch?: number;
  primeraFaseVsSistema?: { primeraFase: number; sistema: number };
  perMatchPuntos?: { fechaNumero: number; rivalName: string; puntos: number }[];

  // PIE
  penFkEfficiency?: number;
  tacticoWinRate?: number;
  territoryBreakdown?: { campo: number; recupero: number };
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

  // New: cross-match
  bestMatch: MatchStat | null;
  worstMatch: MatchStat | null;
  last3Effectiveness: number;
  trend: "up" | "down" | "stable";

  // New: module-specific
  moduleSpecific: ModuleSpecificStats;
}

const POSITIVE_RESULTADOS = new Set([
  "obtenido",
  "obtenida",
  "exitosa",
  "puntos",
  "eficiente",
  "ganado",
]);

const POINTS_MAP: Record<string, number> = {};
for (const d of PUNTOS_DETALLE) {
  POINTS_MAP[d.key] = d.points;
}

export function aggregateStats(
  eventos: Array<Record<string, unknown>>,
  plantel: string,
  moduleConfig: ModuleConfig
): AggregatedStats {
  const divisions = PLANTEL_MAP[plantel]?.divisions ?? [];

  const filtered =
    plantel === "Todos"
      ? eventos.filter((e) => {
          const partido = e.partidos as Record<string, unknown> | undefined;
          return !!partido;
        })
      : eventos.filter((e) => {
          const partido = e.partidos as Record<string, unknown> | undefined;
          return partido && divisions.includes(partido.division as string);
        });

  let totalPropio = 0;
  let totalRival = 0;
  let positiveCount = 0;
  const motivoBreakdown: Record<string, number> = {};
  const resultadoBreakdown: Record<string, number> = {};
  let roboCount = 0;
  let recuperoCount = 0;

  // Module-specific accumulators
  let stealCount = 0; // robos from rival
  let lossToStealCount = 0; // our lineouts stolen
  const motivoPos: Record<string, number> = {};
  const motivoTotal: Record<string, number> = {};
  let penaltyPropio = 0;
  let penaltyRival = 0;
  let errorCount = 0;
  let forcedErrorCount = 0;
  const puntosBreakdown: Record<string, number> = {};
  let totalPuntos = 0;
  let e22Total = 0;
  let e22Puntos = 0;
  let primeraFase = 0;
  let sistema = 0;
  let penFkPositive = 0;
  let penFkTotal = 0;
  let tacticoPositive = 0;
  let tacticoTotal = 0;
  let pieCampo = 0;
  let pieRecupero = 0;

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
      puntos: number;
    }
  >();

  for (const e of filtered) {
    const perspectiva = e.perspectiva as string;
    const data = (e.data ?? {}) as Record<string, unknown>;
    const motivo = (data.motivo ?? "") as string;
    const resultado = (data.resultado ?? "") as string;
    const detalle = (data.detalle ?? "") as string;
    const robo = (data.robo ?? "") as string;
    const recupero = (data.recupero ?? "") as string;
    const partido = e.partidos as Record<string, unknown>;
    const partidoId = partido.id as string;
    const fechaNumero = (partido.fecha_numero ?? 0) as number;
    const jornada = (partido.jornadas ?? {}) as Record<string, unknown>;
    const jornadaDate = (jornada.date ?? "") as string;

    const equipoVisitante = (partido.equipo_visitante ?? {}) as Record<string, unknown>;
    const equipoLocal = (partido.equipo_local ?? {}) as Record<string, unknown>;
    const rivalName =
      ((equipoVisitante.short_name ?? equipoVisitante.name) as string) ||
      ((equipoLocal.short_name ?? equipoLocal.name) as string) ||
      "Rival";

    // --- Totals ---
    if (perspectiva === "propio") {
      totalPropio++;
      if (POSITIVE_RESULTADOS.has(resultado)) positiveCount++;
    } else {
      totalRival++;
    }

    if (perspectiva === "propio" && motivo) {
      motivoBreakdown[motivo] = (motivoBreakdown[motivo] ?? 0) + 1;
    }
    if (perspectiva === "propio" && resultado) {
      resultadoBreakdown[resultado] = (resultadoBreakdown[resultado] ?? 0) + 1;
    }

    if (robo === "robado") roboCount++;
    if (recupero === "recuperada") recuperoCount++;

    // --- Module-specific accumulation ---
    const modId = moduleConfig.id;

    // LINE / SCRUM: steal & motivo effectiveness
    if (modId === "LINE" || modId === "SCRUM") {
      if (perspectiva === "rival" && robo === "robado") stealCount++;
      if (perspectiva === "propio" && robo === "perdido_en_robo") lossToStealCount++;

      if (perspectiva === "propio" && motivo) {
        motivoTotal[motivo] = (motivoTotal[motivo] ?? 0) + 1;
        if (POSITIVE_RESULTADOS.has(resultado)) {
          motivoPos[motivo] = (motivoPos[motivo] ?? 0) + 1;
        }
      }

      // SCRUM infractions
      if (modId === "SCRUM" && motivo === "I") {
        if (perspectiva === "propio") penaltyPropio++;
        else penaltyRival++;
      }
    }

    // SALIDA: errors
    if (modId === "SALIDA" && perspectiva === "propio") {
      if (motivo === "ENF" || motivo === "EF") {
        errorCount++;
        if (motivo === "EF") forcedErrorCount++;
      }
    }

    // ATAQUE / DEFENSA: scoring
    if (modId === "ATAQUE" || modId === "DEFENSA") {
      if (motivo === "E22") {
        e22Total++;
        if (resultado === "puntos") e22Puntos++;
      }
      if (resultado === "primera_fase") primeraFase++;
      if (resultado === "sistema") sistema++;

      if (resultado === "puntos" && detalle) {
        const pts = POINTS_MAP[detalle] ?? 0;
        puntosBreakdown[detalle] = (puntosBreakdown[detalle] ?? 0) + 1;
        totalPuntos += pts;
      }
    }

    // PIE: kicking
    if (modId === "PIE") {
      if (motivo === "PEN_FK") {
        penFkTotal++;
        if (resultado === "eficiente") penFkPositive++;
      }
      if (motivo === "TACTICO") {
        tacticoTotal++;
        if (resultado === "ganado") tacticoPositive++;
      }
      if (detalle === "campo") pieCampo++;
      if (detalle === "recupero") pieRecupero++;
    }

    // --- Per-match accumulation ---
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
        puntos: 0,
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
    // Track points per match
    if ((modId === "ATAQUE" || modId === "DEFENSA") && resultado === "puntos" && detalle) {
      m.puntos += POINTS_MAP[detalle] ?? 0;
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
      puntos: m.puntos,
    }));

  // --- Cross-match stats ---
  const withEff = perMatchStats.filter((m) => m.propioCount > 0);
  const bestMatch = withEff.length > 0 ? withEff.reduce((a, b) => (a.effectiveness > b.effectiveness ? a : b)) : null;
  const worstMatch = withEff.length > 0 ? withEff.reduce((a, b) => (a.effectiveness < b.effectiveness ? a : b)) : null;

  const last3 = withEff.slice(-3);
  const last3Effectiveness =
    last3.length > 0 ? Math.round(last3.reduce((sum, m) => sum + m.effectiveness, 0) / last3.length) : 0;

  const seasonEff = totalPropio > 0 ? Math.round((positiveCount / totalPropio) * 100) : 0;
  const diff = last3Effectiveness - seasonEff;
  const trend: "up" | "down" | "stable" = diff > 5 ? "up" : diff < -5 ? "down" : "stable";

  // --- Module-specific stats ---
  const moduleSpecific: ModuleSpecificStats = {};
  const modId = moduleConfig.id;

  if (modId === "LINE" || modId === "SCRUM") {
    moduleSpecific.stealRate = totalRival > 0 ? Math.round((stealCount / totalRival) * 100) : 0;
    moduleSpecific.lossToStealRate = totalPropio > 0 ? Math.round((lossToStealCount / totalPropio) * 100) : 0;
    const totalAll = totalPropio + totalRival;
    moduleSpecific.dominanceIndex =
      totalAll > 0 ? Math.round(((positiveCount + stealCount) / totalAll) * 100) : 0;

    const motivoEff: Record<string, { positive: number; total: number; pct: number }> = {};
    for (const key of Object.keys(motivoTotal)) {
      const tot = motivoTotal[key];
      const pos = motivoPos[key] ?? 0;
      motivoEff[key] = { positive: pos, total: tot, pct: tot > 0 ? Math.round((pos / tot) * 100) : 0 };
    }
    moduleSpecific.motivoEffectiveness = motivoEff;

    if (modId === "SCRUM") {
      moduleSpecific.penaltyBalance = { propio: penaltyPropio, rival: penaltyRival };
    }
  }

  if (modId === "SALIDA") {
    moduleSpecific.errorRate = totalPropio > 0 ? Math.round((errorCount / totalPropio) * 100) : 0;
    const totalErrors = errorCount;
    moduleSpecific.forcedErrorRatio = totalErrors > 0 ? Math.round((forcedErrorCount / totalErrors) * 100) : 0;
  }

  if (modId === "ATAQUE" || modId === "DEFENSA") {
    moduleSpecific.puntosBreakdown = puntosBreakdown;
    moduleSpecific.totalPuntos = totalPuntos;
    moduleSpecific.conversionRate = e22Total > 0 ? Math.round((e22Puntos / e22Total) * 100) : 0;
    moduleSpecific.pointsPerEntry = e22Total > 0 ? Math.round((totalPuntos / e22Total) * 10) / 10 : 0;
    const matchCount = perMatchStats.length;
    moduleSpecific.pointsPerMatch = matchCount > 0 ? Math.round((totalPuntos / matchCount) * 10) / 10 : 0;
    moduleSpecific.primeraFaseVsSistema = { primeraFase, sistema };
    moduleSpecific.perMatchPuntos = perMatchStats.map((m) => ({
      fechaNumero: m.fechaNumero,
      rivalName: m.rivalName,
      puntos: m.puntos ?? 0,
    }));
  }

  if (modId === "PIE") {
    moduleSpecific.penFkEfficiency = penFkTotal > 0 ? Math.round((penFkPositive / penFkTotal) * 100) : 0;
    moduleSpecific.tacticoWinRate = tacticoTotal > 0 ? Math.round((tacticoPositive / tacticoTotal) * 100) : 0;
    moduleSpecific.territoryBreakdown = { campo: pieCampo, recupero: pieRecupero };
  }

  return {
    totalPropio,
    totalRival,
    effectiveness: seasonEff,
    motivoBreakdown,
    resultadoBreakdown,
    roboCount,
    recuperoCount,
    perMatchStats,
    bestMatch,
    worstMatch,
    last3Effectiveness,
    trend,
    moduleSpecific,
  };
}
