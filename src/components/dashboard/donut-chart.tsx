"use client";

import { useState } from "react";

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
  onSegmentClick?: (segment: DonutSegment) => void;
}

export function DonutChart({
  segments,
  size = 160,
  strokeWidth = 28,
  centerLabel,
  centerValue,
  onSegmentClick,
}: DonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <p className="text-[10px] text-g-3">Sin datos</p>
      </div>
    );
  }

  let cumulativePercent = 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const offset = circumference * (1 - pct);
          const rotation = cumulativePercent * 360 - 90;
          cumulativePercent += pct;
          const isHovered = hoveredIndex === i;

          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              transform={`rotate(${rotation} ${center} ${center})`}
              className="transition-all duration-200 cursor-pointer"
              style={{ opacity: hoveredIndex !== null && !isHovered ? 0.5 : 1 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => onSegmentClick?.(seg)}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {hoveredIndex !== null ? (
          <>
            <span className="text-lg font-extrabold text-nv">{segments[hoveredIndex].value}</span>
            <span className="text-[9px] text-g-4 font-semibold">{segments[hoveredIndex].label}</span>
            <span className="text-[9px] text-g-3">{Math.round((segments[hoveredIndex].value / total) * 100)}%</span>
          </>
        ) : (
          <>
            {centerValue !== undefined && <span className="text-xl font-extrabold text-nv">{centerValue}</span>}
            {centerLabel && <span className="text-[9px] text-g-4 font-semibold">{centerLabel}</span>}
          </>
        )}
      </div>
    </div>
  );
}
