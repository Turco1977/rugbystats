"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ModuleStats } from "@/components/dashboard/module-stats";
import { EventFeed } from "@/components/dashboard/event-feed";
import { useRealtimeEventos } from "@/hooks/use-realtime-eventos";

interface PartidoData {
  id: string;
  division: string;
  status: string;
  puntos_local: number;
  puntos_visitante: number;
  equipo_local: { name: string; short_name: string } | null;
  equipo_visitante: { name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
}

export default function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [partido, setPartido] = useState<PartidoData | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeEvents = useRealtimeEventos(id);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("partidos")
      .select(`
        id, division, status, puntos_local, puntos_visitante,
        equipo_local:teams!equipo_local_id(name, short_name),
        equipo_visitante:teams!equipo_visitante_id(name, short_name),
        sessions(code, is_active)
      `)
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setPartido(data as unknown as PartidoData);
        setLoading(false);
      });

    // Subscribe to score updates
    const channel = supabase
      .channel(`partido:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "partidos", filter: `id=eq.${id}` }, (payload) => {
        setPartido((prev) => prev ? { ...prev, ...payload.new } as unknown as PartidoData : prev);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Compute stats from realtime events
  const stats: Record<string, { propio: number; rival: number }> = {};
  for (const ev of realtimeEvents) {
    if (!stats[ev.modulo]) stats[ev.modulo] = { propio: 0, rival: 0 };
    stats[ev.modulo][ev.perspectiva]++;
  }

  // Map events for feed
  const feedEvents = realtimeEvents.slice(0, 20).map((ev) => ({
    id: ev.id,
    modulo: ev.modulo,
    perspectiva: ev.perspectiva,
    motivo: (ev.data as Record<string, string>)?.motivo || "",
    resultado: (ev.data as Record<string, string>)?.resultado || (ev.data as Record<string, string>)?.detalle || "",
    numero: ev.numero,
    cargadoPor: ev.cargado_por,
    timestamp: ev.timestamp,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-g-4 text-sm animate-pulse">Cargando partido...</p>
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="text-center py-20">
        <p className="text-rd font-semibold">Partido no encontrado</p>
        <a href="/director" className="text-bl text-xs hover:underline mt-2 block">← Volver</a>
      </div>
    );
  }

  const localName = partido.equipo_local?.short_name || partido.equipo_local?.name || "Local";
  const visitanteName = partido.equipo_visitante?.short_name || partido.equipo_visitante?.name || "Visitante";
  const activeSession = partido.sessions?.find((s) => s.is_active);
  const isLive = partido.status === "live";

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <a href="/director" className="text-[10px] text-g-4 hover:text-nv">
            ← Volver a Director
          </a>
          <h2 className="text-lg font-bold text-nv mt-1">
            {localName} vs {visitanteName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-nv text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">
              {partido.division}
            </span>
            {isLive && (
              <span className="badge bg-gn-bg text-gn-forest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
                En vivo
              </span>
            )}
            {partido.status === "finished" && (
              <span className="badge bg-g-1 text-g-4">Finalizado</span>
            )}
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-nv">{partido.puntos_local}</span>
            <span className="text-g-3">—</span>
            <span className="text-3xl font-extrabold text-nv">{partido.puntos_visitante}</span>
          </div>
        </div>
      </div>

      {activeSession?.code && (
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-white rounded border border-g-2">
          <span className="text-[10px] text-g-4 font-semibold">Eventos: {realtimeEvents.length}</span>
          <span className="ml-auto font-mono text-[10px] text-g-3">
            Código: <strong className="text-nv">{activeSession.code}</strong>
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
          Estadísticas por Módulo — Propio vs Rival
        </h3>
        <ModuleStats stats={stats} />
      </div>

      <EventFeed events={feedEvents} />
    </div>
  );
}
