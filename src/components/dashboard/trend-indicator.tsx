"use client";

interface TrendIndicatorProps {
  trend: "up" | "down" | "stable";
  last3: number;
  season: number;
}

export function TrendIndicator({ trend, last3, season }: TrendIndicatorProps) {
  const color = trend === "up" ? "text-gn" : trend === "down" ? "text-rd" : "text-g-4";
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const label = trend === "up" ? "Subiendo" : trend === "down" ? "Bajando" : "Estable";

  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-lg font-bold ${color}`}>{arrow}</span>
      <div className="text-[10px] leading-tight">
        <p className={`font-bold ${color}`}>{label}</p>
        <p className="text-g-4 dark:text-dk-4">
          Últ.3: {last3}% · Temp: {season}%
        </p>
      </div>
    </div>
  );
}
