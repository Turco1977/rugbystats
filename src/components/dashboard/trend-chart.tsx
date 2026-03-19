"use client";

import { useEffect, useState } from "react";

interface TrendChartProps {
  data: { label: string; value: number }[];
  colorClass?: string;
}

function useIsDark() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

export function TrendChart({ data, colorClass = "bg-gn" }: TrendChartProps) {
  const isDark = useIsDark();

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Progresión por Fecha
        </h3>
        <p className="text-xs text-g-3">Sin datos de progresión</p>
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: padding.top + chartH - (d.value / 100) * chartH,
    label: d.label,
    value: d.value,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const colorMap: Record<string, string> = {
    "bg-bl": "#3B82F6",
    "bg-rd": "#C8102E",
    "bg-yl": "#F59E0B",
    "bg-gn": "#10B981",
    "bg-pr": "#8B5CF6",
    "bg-nv-light": "#1E3A5F",
  };
  const strokeColor = colorMap[colorClass] ?? "#10B981";
  const gridColor = isDark ? "#334155" : "#E5E7EB";
  const labelColor = isDark ? "#64748B" : "#9CA3AF";
  const dotCenter = isDark ? "#1E293B" : "white";

  return (
    <div className="card">
      <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
        Progresión por Fecha — Efectividad %
      </h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + chartH - (v / 100) * chartH;
          return (
            <g key={v}>
              <line
                x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                stroke={gridColor} strokeWidth="1"
                strokeDasharray={v === 0 ? "0" : "4,4"}
              />
              <text x={padding.left - 8} y={y + 3} textAnchor="end" fill={labelColor} fontSize="10">
                {v}%
              </text>
            </g>
          );
        })}

        {points.length > 1 && (
          <polyline points={polyline} fill="none" stroke={strokeColor}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={strokeColor} />
            <circle cx={p.x} cy={p.y} r="2" fill={dotCenter} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fill={strokeColor} fontWeight="bold" fontSize="10">
              {p.value}%
            </text>
            <text x={p.x} y={height - 10} textAnchor="middle" fill={labelColor} fontSize="9">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
