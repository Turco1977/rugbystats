"use client";

interface MotivoBreakdownProps {
  breakdown: Record<string, number>;
  motivos: { key: string; label: string; short: string }[];
  colorClass: string;
}

export function MotivoBreakdown({ breakdown, motivos, colorClass }: MotivoBreakdownProps) {
  const total = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  if (total === 0) {
    return (
      <div className="card">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Desglose por Motivo
        </h3>
        <p className="text-xs text-g-3">Sin datos de motivos</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-4">
        Desglose por Motivo
      </h3>
      <div className="space-y-3">
        {motivos.map((m) => {
          const count = breakdown[m.key] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-nv w-8">{m.short}</span>
                  <span className="text-[10px] text-g-4">{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-nv">{count}</span>
                  <span className="text-[10px] text-g-3 w-8 text-right">{pct}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-g-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
