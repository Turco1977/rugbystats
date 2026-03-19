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
      { key: "ENF", label: "Enfrentamiento", short: "ENF" },
      { key: "EF", label: "Efectiva", short: "EF" },
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
    motivos: [
      { key: "try", label: "Try", short: "TRY" },
      { key: "penal", label: "Penal", short: "PEN" },
      { key: "drop", label: "Drop Goal", short: "DG" },
      { key: "perdida", label: "Pérdida", short: "PER" },
    ],
    resultados: [
      { key: "puntos", label: "Con puntos" },
      { key: "sin_puntos", label: "Sin puntos" },
    ],
  },
  {
    id: "DEFENSA",
    label: "Defensa",
    color: "bg-pr",
    colorHover: "hover:bg-pr/80",
    icon: "🛡",
    motivos: [
      { key: "tackle", label: "Tackle", short: "TAC" },
      { key: "recupero", label: "Recupero", short: "REC" },
      { key: "infraccion", label: "Infracción", short: "INF" },
      { key: "try_recibido", label: "Try recibido", short: "TRY-" },
    ],
    resultados: [
      { key: "exitosa", label: "Exitosa" },
      { key: "quebrada", label: "Quebrada" },
    ],
  },
  {
    id: "PIE",
    label: "Pie",
    color: "bg-nv-light",
    colorHover: "hover:bg-nv",
    icon: "🦶",
    motivos: [
      { key: "C", label: "Campo", short: "C" },
      { key: "R", label: "Recupero", short: "R" },
      { key: "Penal", label: "Penal", short: "PEN" },
      { key: "FreeKick", label: "Free Kick", short: "FK" },
    ],
    resultados: [
      { key: "eficiente", label: "Eficiente" },
      { key: "deficitario", label: "Deficitario" },
    ],
  },
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

/** Maps URL slugs to ModuloType values */
export const MODULE_SLUG_MAP: Record<string, string> = {
  line: "LINE",
  scrum: "SCRUM",
  salidas: "SALIDA",
  ataque: "ATAQUE",
  defensa: "DEFENSA",
  pie: "PIE",
};
