"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/dashboard/match-card";
import type { Division, PartidoStatus } from "@/lib/types/domain";

interface PartidoRow {
  id: string;
  division: Division;
  status: PartidoStatus;
  puntos_local: number;
  puntos_visitante: number;
  jornada_id: string;
  created_at: string;
  equipo_local: { id: string; name: string; short_name: string } | null;
  equipo_visitante: { id: string; name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
  jornada: { id: string; name: string; date: string } | null;
}

interface EntrenadorFixtureProps {
  division: string;
}

export function EntrenadorFixture({ division }: EntrenadorFixtureProps) {
  const [partidos, setPartidos] = useState<PartidoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartidos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("partidos")
      .select(`
        id, division, status, puntos_local, puntos_visitante, jornada_id, created_at,
        equipo_local:teams!equipo_local_id(id, name, short_name),
        equipo_visitante:teams!equipo_visitante_id(id, name, short_name),
        sessions(code, is_active),
        jornada:jornadas!jornada_id(id, name, date)
      `)
      .like("division", `${division}%`)
      .order("created_at", { ascending: false });
    if (data) setPartidos(data as unknown as PartidoRow[]);
    setLoading(false);
  }, [division]);

  useEffect(() => {
    fetchPartidos();
  }, [fetchPartidos]);

  // Group by jornada date
  const grouped = partidos.reduce<Record<string, PartidoRow[]>>((acc, p) => {
    const dateKey = p.jornada?.date || "Sin fecha";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(p);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (dateStr: string) => {
    if (dateStr === "Sin fecha") return dateStr;
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const liveCount = partidos.filter((p) => p.status === "live").length;
  const scheduledCount = partidos.filter((p) => p.status === "scheduled").length;
  const finishedCount = partidos.filter((p) => p.status === "finished").length;

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3">
          <p className="text-[10px] text-dk-4 font-semibold uppercase tracking-wider">En vivo</p>
          <p className="text-2xl font-extrabold text-gn mt-0.5">{liveCount}</p>
        </div>
        <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3">
          <p className="text-[10px] text-dk-4 font-semibold uppercase tracking-wider">Programados</p>
          <p className="text-2xl font-extrabold text-bl mt-0.5">{scheduledCount}</p>
        </div>
        <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3">
          <p className="text-[10px] text-dk-4 font-semibold uppercase tracking-wider">Finalizados</p>
          <p className="text-2xl font-extrabold text-dk-4 mt-0.5">{finishedCount}</p>
        </div>
      </div>

      {/* Match list grouped by date */}
      {loading ? (
        <div className="bg-dk-2 rounded-lg border border-white/10 text-center py-8">
          <p className="text-dk-4 text-sm animate-pulse">Cargando fixture {division}...</p>
        </div>
      ) : partidos.length === 0 ? (
        <div className="bg-dk-2 rounded-lg border border-white/10 text-center py-12">
          <p className="text-2xl mb-2">🏉</p>
          <p className="text-dk-4 text-sm font-semibold">No hay partidos {division}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const matches = grouped[dateKey];
            const jornadaName = matches[0]?.jornada?.name || "";
            return (
              <div key={dateKey}>
                <h3 className="text-xs font-bold text-dk-4 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="capitalize">{formatDate(dateKey)}</span>
                  {jornadaName && <span className="text-dk-3">— {jornadaName}</span>}
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {matches.map((p) => {
                    const activeSession = p.sessions?.find((s) => s.is_active);
                    return (
                      <MatchCard
                        key={p.id}
                        id={p.id}
                        division={p.division}
                        equipoLocal={p.equipo_local?.short_name || p.equipo_local?.name || "—"}
                        equipoVisitante={p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—"}
                        puntosLocal={p.puntos_local}
                        puntosVisitante={p.puntos_visitante}
                        status={p.status}
                        sessionCode={activeSession?.code}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
