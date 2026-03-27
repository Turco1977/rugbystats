import type { ModuleConfig } from "@/lib/types/capture";

export const MODULE_CONFIG: ModuleConfig[] = [
  {
    id: "LINE",
    label: "Line",
    color: "bg-bl",
    colorHover: "hover:bg-bl-dark",
    icon: "⬆",
    motivos: [
      { key: "T", label: "Tiro", short: "T" },
      { key: "E", label: "Ejecución", short: "E" },
      { key: "I", label: "Infracción", short: "I" },
      { key: "P", label: "Perfecto", short: "P" },
      { key: "M", label: "Mérito", short: "M" },
    ],
    resultados: [
      { key: "obtenido", label: "Obtenido" },
      { key: "perdido", label: "Perdido" },
    ],
    hasRobo: true,
  },
  {
    id: "SCRUM",
    label: "Scrum",
    color: "bg-rd",
    colorHover: "hover:bg-rd/80",
    icon: "⚡",
    motivos: [
      { key: "P", label: "Perfecto", short: "P" },
      { key: "I", label: "Infracción", short: "I" },
      { key: "R", label: "Retroceso", short: "R" },
      { key: "G", label: "Giro", short: "G" },
    ],
    resultados: [
      { key: "obtenido", label: "Obtenido" },
      { key: "perdido", label: "Perdido" },
    ],
    hasRobo: true,
  },
  {
    id: "SALIDA",
    label: "Salida",
    color: "bg-yl",
    colorHover: "hover:bg-yl-dark",
    icon: "🏉",
    motivos: [
      { key: "P", label: "Perfecta", short: "P" },
      { key: "I", label: "Infracción", short: "I" },
      { key: "S", label: "Suelo", short: "S" },
      { key: "ENF", label: "Error No Forzado", short: "ENF" },
      { key: "EF", label: "Error Forzado", short: "EF" },
    ],
    resultados: [
      { key: "obtenida", label: "Obtenida" },
      { key: "perdida", label: "Perdida" },
    ],
    hasRecupero: true,
  },
  {
    id: "ATAQUE",
    label: "Ataque",
    color: "bg-gn",
    colorHover: "hover:bg-gn-dark",
    icon: "→",
    hasPerspective: false,
    motivos: [
      { key: "QF", label: "Quiebre Franco", short: "QF" },
      { key: "E22", label: "Eficiencia 22", short: "E22" },
    ],
    resultados: [
      { key: "primera_fase", label: "Primera Fase" },
      { key: "sistema", label: "Sistema" },
    ],
    motivoResultados: {
      QF: [
        { key: "primera_fase", label: "Primera Fase" },
        { key: "sistema", label: "Sistema" },
      ],
      E22: [
        { key: "puntos", label: "Puntos" },
        { key: "perdida", label: "Pérdida" },
      ],
    },
  },
  {
    id: "DEFENSA",
    label: "Defensa",
    color: "bg-pr",
    colorHover: "hover:bg-pr/80",
    icon: "🛡",
    hasPerspective: false,
    motivos: [
      { key: "QF", label: "Quiebre Franco", short: "QF" },
      { key: "E22", label: "Eficiencia 22", short: "E22" },
    ],
    resultados: [
      { key: "primera_fase", label: "Primera Fase" },
      { key: "sistema", label: "Sistema" },
    ],
    motivoResultados: {
      QF: [
        { key: "primera_fase", label: "Primera Fase" },
        { key: "sistema", label: "Sistema" },
      ],
      E22: [
        { key: "puntos", label: "Puntos" },
        { key: "recuperada", label: "Recuperada" },
      ],
    },
  },
  {
    id: "PIE",
    label: "Pie",
    color: "bg-nv-light",
    colorHover: "hover:bg-nv",
    icon: "🦶",
    hasPerspective: false,
    motivos: [
      { key: "PEN_FK", label: "P/FK", short: "Penal / Free Kick" },
      { key: "TACTICO", label: "T", short: "Táctico" },
      { key: "PUNTOS", label: "Puntos", short: "Puntos" },
    ],
    resultados: [
      { key: "eficiente", label: "Eficiente" },
      { key: "deficitario", label: "Deficitario" },
    ],
    motivoResultados: {
      PEN_FK: [
        { key: "eficiente", label: "Eficiente" },
        { key: "deficitario", label: "Deficitario" },
      ],
      TACTICO: [
        { key: "ganado", label: "Ganado" },
        { key: "perdido", label: "Perdido" },
      ],
      PUNTOS: [
        { key: "50mts", label: "50 mts" },
        { key: "40mts", label: "40 mts" },
      ],
    },
  },
  {
    id: "PENALES",
    label: "Penales",
    color: "bg-orange-600",
    colorHover: "hover:bg-orange-700",
    icon: "🎯",
    motivos: [
      { key: "50MTS", label: "50 mts", short: "50m" },
      { key: "40MTS", label: "40 mts", short: "40m" },
    ],
    resultados: [
      { key: "penal", label: "Penal" },
      { key: "drop", label: "Drop" },
    ],
    addPoints: 3,
  },
];

/** Sub-options when resultado = "puntos" */
export const PUNTOS_DETALLE = [
  { key: "try_convertido", label: "Try Convertido", points: 7 },
  { key: "try", label: "Try", points: 5 },
  { key: "penal", label: "Penal", points: 3 },
  { key: "drop", label: "Drop", points: 3 },
];

/** Sub-options for PIE eficiente/ganado → Campo/Recupero */
export const PIE_DETALLE = [
  { key: "campo", label: "Campo" },
  { key: "recupero", label: "Recupero" },
];

export const PERSPECTIVA_OPTIONS = [
  { key: "propio" as const, label: "Propio", color: "bg-gn", textColor: "text-white" },
  { key: "rival" as const, label: "Rival", color: "bg-rd", textColor: "text-white" },
];

/** Maps Plantel letters to divisions */
export const PLANTEL_MAP: Record<string, { label: string; divisions: string[] }> = {
  A: { label: "Plantel A", divisions: ["M19"] },
  B: { label: "Plantel B", divisions: ["M17"] },
  C: { label: "Plantel C", divisions: ["M15", "M16"] },
};

/** Planteles Los Tordos */
export const PLANTELES = [
  { key: "M19A", division: "M19", label: "M19 A" },
  { key: "M19B", division: "M19", label: "M19 B" },
  { key: "M19C", division: "M19", label: "M19 C" },
  { key: "M17A", division: "M17", label: "M17 A" },
  { key: "M17B", division: "M17", label: "M17 B" },
  { key: "M16A", division: "M16", label: "M16 A" },
  { key: "M16B", division: "M16", label: "M16 B" },
  { key: "M15A", division: "M15", label: "M15 A" },
  { key: "M15B", division: "M15", label: "M15 B" },
];

/** Maps URL slugs to ModuloType values */
export const MODULE_SLUG_MAP: Record<string, string> = {
  line: "LINE",
  scrum: "SCRUM",
  salidas: "SALIDA",
  ataque: "ATAQUE",
  defensa: "DEFENSA",
  pie: "PIE",
};
