"use client";

import { useCaptureStore } from "@/hooks/use-capture-store";
import { useRealtimeEventos } from "@/hooks/use-realtime-eventos";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { createClient } from "@/lib/supabase/client";

export function LiveFeed() {
  const partidoId = useCaptureStore((s) => s.partidoId);
  const realtimeEvents = useRealtimeEventos(partidoId);

  const handleDelete = async (eventId: string) => {
    const supabase = createClient();
    await supabase.from("eventos").delete().eq("id", eventId);
  };

  // Map realtime events to feed format
  const feedEvents = realtimeEvents.slice(0, 20).map((ev) => ({
    id: ev.id,
    modulo: ev.modulo,
    perspectiva: ev.perspectiva,
    motivo: (ev.data as Record<string, string>)?.motivo || "",
    resultado: (ev.data as Record<string, string>)?.resultado || (ev.data as Record<string, string>)?.detalle || "",
    timestamp: ev.timestamp,
    numero: ev.numero,
    cargadoPor: ev.cargado_por,
  }));

  if (feedEvents.length === 0) {
    return (
      <div className="border-b border-dk-3 px-4 py-2 text-[10px] text-dk-4">
        Feed en vivo — sin eventos todavía
      </div>
    );
  }

  return (
    <div className="border-b border-dk-3 max-h-[160px] overflow-y-auto">
      {feedEvents.map((ev) => {
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
            <span className="text-dk-4 text-[9px]">
              {ev.cargadoPor}
            </span>
            <button
              onClick={() => handleDelete(ev.id)}
              className="ml-auto text-rd-light/50 hover:text-rd text-xs px-1 transition-colors"
              title="Borrar evento"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
