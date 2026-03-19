"use client";

interface TrendChartProps {
  data: { label: string; value: number }[];
  colorClass?: string;
}

export function TrendChart({ data, colorClass = "bg-gn" }: TrendChartProps) {
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

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // SVG dimensions
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

  // Resolve fill color from class to inline (simplified mapping)
  const colorMap: Record<string, string> = {
    "bg-bl": "#3B82F6",
    "bg-rd": "#C8102E",
    "bg-yl": "#F59E0B",
    "bg-gn": "#10B981",
    "bg-pr": "#8B5CF6",
    "bg-nv-light": "#1E3A5F",
  };
  const strokeColor = colorMap[colorClass] ?? "#10B981";

  return (
    <div className="card">
      <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
        Progresión por Fecha — Efectividad %
      </h3>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = padding.top + chartH - (v / 100) * chartH;
          return (
            <g key={v}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth="1"
                strokeDasharray={v === 0 ? "0" : "4,4"}
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px]"
                fill="#9CA3AF"
                fontSize="10"
              >
                {v}%
              </text>
            </g>
          );
        })}

        {/* Line */}
        {points.length > 1 && (
          <polyline
            points={polyline}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={strokeColor} />
            <circle cx={p.x} cy={p.y} r="2" fill="white" />
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fill={strokeColor}
              fontWeight="bold"
              fontSize="10"
            >
              {p.value}%
            </text>
            <text
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fill="#9CA3AF"
              fontSize="9"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
