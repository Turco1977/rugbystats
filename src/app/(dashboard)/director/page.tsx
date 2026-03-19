"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/dashboard/match-card";
import { CreateJornadaModal } from "@/components/dashboard/create-jornada-modal";
import { generateSessionCode } from "@/lib/utils/session-code";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchPartidos = useCallback(async () => {
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
        .in("status", ["live", "scheduled"])
        .order("status")
        .order("division");
      if (data) setPartidos(data as unknown as PartidoRow[]);
    } catch {
      // No connection
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartidos();
  }, [fetchPartidos]);

  const livePartidos = partidos.filter((p) => p.status === "live");
  const scheduledPartidos = partidos.filter((p) => p.status === "scheduled");

  const handleStartSession = async (partidoId: string) => {
    const supabase = createClient();
    const code = generateSessionCode();
    await supabase.from("sessions").insert({
      partido_id: partidoId,
      code,
      created_by: "Director",
    });
    await supabase.from("partidos").update({ status: "live" }).eq("id", partidoId);
    fetchPartidos();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-nv">Director Deportivo</h2>
          <p className="text-sm text-g-4 mt-0.5">
            Partidos en curso y programados — Temporada 2026
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-gn text-white text-sm font-semibold px-4 py-2.5 rounded-md hover:bg-gn-dark transition-colors"
        >
          + Crear Partidos
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="card-compact">
          <p className="text-xs text-g-4 font-semibold uppercase tracking-wider">En vivo</p>
          <p className="text-3xl font-extrabold text-gn mt-1">{livePartidos.length}</p>
        </div>
        <div className="card-compact">
          <p className="text-xs text-g-4 font-semibold uppercase tracking-wider">Programados</p>
          <p className="text-3xl font-extrabold text-bl mt-1">{scheduledPartidos.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-10">
          <p className="text-g-4 text-sm animate-pulse">Cargando partidos...</p>
        </div>
      ) : (
        <>
          {/* Live matches */}
          {livePartidos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-g-4 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gn animate-pulse" />
                Partidos en vivo
              </h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {livePartidos.map((p) => {
                  const activeSession = p.sessions?.find((s) => s.is_active);
                  return (
                    <div key={p.id}>
                      <MatchCard
                        id={p.id}
                        division={p.division}
                        equipoLocal={p.equipo_local?.short_name || p.equipo_local?.name || "—"}
                        equipoVisitante={p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—"}
                        puntosLocal={p.puntos_local}
                        puntosVisitante={p.puntos_visitante}
                        status={p.status}
                        sessionCode={activeSession?.code}
                      />
                      {/* Copy code button */}
                      {activeSession?.code && (
                        <button
                          onClick={() => handleCopyCode(activeSession.code)}
                          className="mt-2 w-full bg-nv text-white text-xs font-semibold py-2 rounded hover:bg-nv-light transition-colors flex items-center justify-center gap-2"
                        >
                          {copiedCode === activeSession.code ? (
                            <>Copiado!</>
                          ) : (
                            <>Copiar código: {activeSession.code}</>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scheduled matches */}
          {scheduledPartidos.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-g-4 uppercase tracking-wider mb-3">
                Próximos partidos
              </h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {scheduledPartidos.map((p) => (
                  <div key={p.id}>
                    <MatchCard
                      id={p.id}
                      division={p.division}
                      equipoLocal={p.equipo_local?.short_name || p.equipo_local?.name || "—"}
                      equipoVisitante={p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—"}
                      puntosLocal={p.puntos_local}
                      puntosVisitante={p.puntos_visitante}
                      status={p.status}
                    />
                    <button
                      onClick={() => handleStartSession(p.id)}
                      className="mt-2 w-full bg-gn text-white text-xs font-semibold py-2.5 rounded-md hover:bg-gn-dark transition-colors"
                    >
                      Iniciar Sesión de Captura
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {partidos.length === 0 && (
            <div className="card text-center py-14">
              <p className="text-3xl mb-3">🏉</p>
              <p className="text-g-4 font-semibold">No hay partidos activos ni programados</p>
              <p className="text-g-3 text-sm mt-1 mb-4">
                Creá los partidos del fin de semana para empezar.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="bg-gn text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-gn-dark transition-colors"
              >
                + Crear Partidos
              </button>
            </div>
          )}
        </>
      )}

      <CreateJornadaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchPartidos}
      />
    </div>
  );
}
