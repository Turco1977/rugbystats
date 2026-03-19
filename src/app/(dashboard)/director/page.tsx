"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/dashboard/match-card";
import type { Division, PartidoStatus } from "@/lib/types/domain";

interface PartidoRow {
  id: string;
  division: Division;
  status: PartidoStatus;
  puntos_local: number;
  puntos_visitante: number;
  equipo_local: { id: string; name: string; short_name: string } | null;
  equipo_visitante: { id: string; name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
}

export default function DirectorPage() {
  const [partidos, setPartidos] = useState<PartidoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLive() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("partidos")
          .select(`
            id, division, status, puntos_local, puntos_visitante,
            equipo_local:teams!equipo_local_id(id, name, short_name),
            equipo_visitante:teams!equipo_visitante_id(id, name, short_name),
            sessions(code, is_active)
          `)
          .order("status")
          .order("division");
        if (data) setPartidos(data as unknown as PartidoRow[]);
      } catch {
        // No Supabase connection — show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchLive();
  }, []);

  const livePartidos = partidos.filter((p) => p.status === "live");
  const finishedPartidos = partidos.filter((p) => p.status === "finished");
  const scheduledPartidos = partidos.filter((p) => p.status === "scheduled");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-nv dark:text-white">Director Deportivo</h2>
        <p className="text-xs text-g-4 mt-0.5">
          Vista general de partidos — Temporada 2026
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card-compact">
          <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">En vivo</p>
          <p className="text-2xl font-extrabold text-gn mt-0.5">{livePartidos.length}</p>
        </div>
        <div className="card-compact">
          <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">Programados</p>
          <p className="text-2xl font-extrabold text-bl mt-0.5">{scheduledPartidos.length}</p>
        </div>
        <div className="card-compact">
          <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">Finalizados</p>
          <p className="text-2xl font-extrabold text-g-4 mt-0.5">{finishedPartidos.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-8">
          <p className="text-g-4 text-sm animate-pulse">Cargando partidos...</p>
        </div>
      ) : (
        <>
          {/* Live matches */}
          {livePartidos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gn animate-pulse" />
                Partidos en vivo
              </h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {livePartidos.map((p) => {
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
          )}

          {/* Scheduled */}
          {scheduledPartidos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
                Próximos partidos
              </h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {scheduledPartidos.map((p) => (
                  <MatchCard
                    key={p.id}
                    id={p.id}
                    division={p.division}
                    equipoLocal={p.equipo_local?.short_name || p.equipo_local?.name || "—"}
                    equipoVisitante={p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—"}
                    puntosLocal={p.puntos_local}
                    puntosVisitante={p.puntos_visitante}
                    status={p.status}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Finished */}
          {finishedPartidos.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
                Partidos finalizados
              </h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {finishedPartidos.map((p) => (
                  <MatchCard
                    key={p.id}
                    id={p.id}
                    division={p.division}
                    equipoLocal={p.equipo_local?.short_name || p.equipo_local?.name || "—"}
                    equipoVisitante={p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—"}
                    puntosLocal={p.puntos_local}
                    puntosVisitante={p.puntos_visitante}
                    status={p.status}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {partidos.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-2xl mb-2">🏉</p>
              <p className="text-g-4 text-sm font-semibold">No hay partidos cargados</p>
              <p className="text-g-3 text-xs mt-1">
                Creá una jornada desde <a href="/jornada" className="text-bl underline">Fixture</a> para empezar.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
