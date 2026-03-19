"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/dashboard/match-card";
import { CreateMatchModal } from "@/components/dashboard/create-match-modal";
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

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://rugbystats-five.vercel.app";

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

  const handleWhatsApp = (code: string, local: string, visitante: string, division: string) => {
    const text = `Unite a capturar el partido ${division} ${local} vs ${visitante}. Código: ${code}. Entrá: ${APP_URL}/captura`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-nv">Directo Rugby</h2>
          <p className="text-sm text-g-4 mt-0.5">
            Partidos en curso y programados — Temporada 2026
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-gn text-white text-sm font-semibold px-4 py-2.5 rounded-md hover:bg-gn-dark transition-colors"
        >
          + Crear Partido
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
                  const localName = p.equipo_local?.short_name || p.equipo_local?.name || "—";
                  const visitanteName = p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—";
                  return (
                    <div key={p.id}>
                      <MatchCard
                        id={p.id}
                        division={p.division}
                        equipoLocal={localName}
                        equipoVisitante={visitanteName}
                        puntosLocal={p.puntos_local}
                        puntosVisitante={p.puntos_visitante}
                        status={p.status}
                        sessionCode={activeSession?.code}
                      />
                      {activeSession?.code && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleCopyCode(activeSession.code)}
                            className="bg-nv text-white text-xs font-semibold py-2 rounded hover:bg-nv-light transition-colors"
                          >
                            {copiedCode === activeSession.code ? "Copiado!" : `Código: ${activeSession.code}`}
                          </button>
                          <button
                            onClick={() => handleWhatsApp(activeSession.code, localName, visitanteName, p.division)}
                            className="bg-[#25D366] text-white text-xs font-semibold py-2 rounded hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-1"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp
                          </button>
                        </div>
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
                + Crear Partido
              </button>
            </div>
          )}
        </>
      )}

      <CreateMatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchPartidos}
      />
    </div>
  );
}
