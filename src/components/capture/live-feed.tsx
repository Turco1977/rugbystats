"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { MODULE_CONFIG } from "@/lib/constants/modules";

export function LiveFeed() {
  const events = useCaptureStore((s) => s.events);
  const latest = events.slice(0, 5);

  if (latest.length === 0) {
    return (
      <div className="border-b border-dk-3 px-4 py-2 text-[10px] text-dk-4">
        Feed en vivo — sin eventos todavía
      </div>
    );
  }

  return (
    <div className="border-b border-dk-3 max-h-[120px] overflow-y-auto">
      {latest.map((ev) => {
        const mod = MODULE_CONFIG.find((m) => m.id === ev.modulo);
        const motivoLabel =
          mod?.motivos.find((m) => m.key === ev.motivo)?.short || ev.motivo;
        const time = new Date(ev.timestamp).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        return (
          <div key={ev.id} className="feed-item text-dk-5 border-dk-3">
            <span className="text-dk-4 font-mono w-14 shrink-0">{time}</span>
            <span
              className={`font-bold ${
                ev.perspectiva === "propio" ? "text-gn-bright" : "text-rd-light"
              }`}
            >
              {ev.perspectiva === "propio" ? "P" : "R"}
            </span>
            <span className="font-semibold text-white">
              #{ev.numero} {ev.modulo}
            </span>
            <span className="text-dk-4">
              {motivoLabel} → {ev.resultado}
            </span>
            <span className="ml-auto text-dk-4 text-[9px]">
              {ev.cargadoPor}
            </span>
          </div>
        );
      })}
    </div>
  );
}
