"use client";

import { MODULE_CONFIG } from "@/lib/constants/modules";

interface FeedEvent {
  id: string;
  modulo: string;
  perspectiva: "propio" | "rival";
  motivo: string;
  resultado: string;
  numero: number;
  cargadoPor: string;
  timestamp: string;
  tiempo?: "1T" | "2T";
}

interface EventFeedProps {
  events: FeedEvent[];
}

export function EventFeed({ events }: EventFeedProps) {
  if (events.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-g-4 text-sm">Sin eventos registrados</p>
        <p className="text-g-3 text-xs mt-1">
          Los eventos aparecerán acá en tiempo real
        </p>
      </div>
    );
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="px-4 py-2.5 bg-g-1 border-b border-g-2">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider">
          Feed de Eventos
        </h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {events.map((ev) => {
          const mod = MODULE_CONFIG.find((m) => m.id === ev.modulo);
          const motivoLabel =
            mod?.motivos.find((m) => m.key === ev.motivo)?.label || ev.motivo;
          const time = new Date(ev.timestamp).toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          return (
            <div key={ev.id} className="feed-item hover:bg-g-1 transition-colors">
              <span className="font-mono text-g-4 w-16 shrink-0">{time}</span>
              {ev.tiempo && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded shrink-0 ${
                  ev.tiempo === "2T" ? "bg-bl/20 text-bl" : "bg-gn/20 text-gn"
                }`}>
                  {ev.tiempo}
                </span>
              )}
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0
                  ${ev.perspectiva === "propio" ? "bg-gn" : "bg-rd"}`}
              >
                {ev.perspectiva === "propio" ? "P" : "R"}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-nv">
                  #{ev.numero} {ev.modulo}
                </span>
                <span className="text-g-4 ml-1.5">
                  {motivoLabel} → {ev.resultado}
                </span>
              </div>
              <span className="text-[9px] text-g-3 shrink-0">{ev.cargadoPor}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
