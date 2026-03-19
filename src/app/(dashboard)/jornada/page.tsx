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
  jornada_id: string;
  equipo_local: { id: string; name: string; short_name: string } | null;
  equipo_visitante: { id: string; name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
}

interface JornadaRow {
  id: string;
  name: string;
  date: string;
}

export default function JornadaPage() {
  const [jornadas, setJornadas] = useState<JornadaRow[]>([]);
  const [selectedJornada, setSelectedJornada] = useState<string | null>(null);
  const [partidos, setPartidos] = useState<PartidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const supabase = createClient();

  const fetchJornadas = useCallback(async () => {
    const { data } = await supabase
      .from("jornadas")
      .select("id, name, date")
      .order("date", { ascending: false });
    if (data && data.length > 0) {
      setJornadas(data);
      if (!selectedJornada) setSelectedJornada(data[0].id);
    } else {
      setJornadas([]);
    }
    setLoading(false);
  }, [selectedJornada]);

  const fetchPartidos = useCallback(async (jornadaId: string) => {
    const { data } = await supabase
      .from("partidos")
      .select(`
        id, division, status, puntos_local, puntos_visitante, jornada_id,
        equipo_local:teams!equipo_local_id(id, name, short_name),
        equipo_visitante:teams!equipo_visitante_id(id, name, short_name),
        sessions(code, is_active)
      `)
      .eq("jornada_id", jornadaId)
      .order("division");
    if (data) setPartidos(data as unknown as PartidoRow[]);
  }, []);

  useEffect(() => { fetchJornadas(); }, []);

  useEffect(() => {
    if (selectedJornada) fetchPartidos(selectedJornada);
  }, [selectedJornada, fetchPartidos]);

  const handleStartSession = async (partidoId: string) => {
    const code = generateSessionCode();
    await supabase.from("sessions").insert({
      partido_id: partidoId,
      code,
      created_by: "Director",
    });
    await supabase.from("partidos").update({ status: "live" }).eq("id", partidoId);
    if (selectedJornada) fetchPartidos(selectedJornada);
  };

  const currentJornada = jornadas.find((j) => j.id === selectedJornada);
  const liveCount = partidos.filter((p) => p.status === "live").length;
  const scheduledCount = partidos.filter((p) => p.status === "scheduled").length;
  const finishedCount = partidos.filter((p) => p.status === "finished").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-nv dark:text-white">Fixture</h2>
          {currentJornada && (
            <p className="text-xs text-g-4 mt-0.5">
              {currentJornada.name} — {new Date(currentJornada.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-nv text-white text-[11px] font-semibold px-3.5 py-2 rounded hover:bg-nv-light transition-colors"
        >
          + Nueva Fecha
        </button>
      </div>

      {/* Jornada selector */}
      {jornadas.length > 1 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {jornadas.map((j) => (
            <button
              key={j.id}
              onClick={() => setSelectedJornada(j.id)}
              className={`text-[10px] font-bold px-3 py-1.5 rounded whitespace-nowrap transition-colors ${
                j.id === selectedJornada
                  ? "bg-nv text-white"
                  : "bg-g-1 border border-g-2 text-g-5 hover:bg-g-2"
              }`}
            >
              {j.name}
            </button>
          ))}
        </div>
      )}

      {/* Summary */}
      {partidos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="card-compact bg-gn-bg">
            <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">En vivo</p>
            <p className="text-2xl font-extrabold text-gn mt-0.5">{liveCount}</p>
          </div>
          <div className="card-compact bg-bl-bg">
            <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">Programados</p>
            <p className="text-2xl font-extrabold text-bl mt-0.5">{scheduledCount}</p>
          </div>
          <div className="card-compact bg-g-1">
            <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">Finalizados</p>
            <p className="text-2xl font-extrabold text-g-4 mt-0.5">{finishedCount}</p>
          </div>
        </div>
      )}

      {/* Match cards */}
      {loading ? (
        <div className="card text-center py-8">
          <p className="text-g-4 text-sm">Cargando...</p>
        </div>
      ) : partidos.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">🏉</p>
          <p className="text-g-4 text-sm font-semibold">
            {jornadas.length === 0 ? "No hay fechas creadas" : "No hay partidos en esta fecha"}
          </p>
          <p className="text-g-3 text-xs mt-1">
            {jornadas.length === 0
              ? "Creá una jornada para empezar a cargar partidos."
              : "Agregá partidos desde Nueva Jornada."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {partidos.map((p) => {
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
                {p.status === "scheduled" && (
                  <button
                    onClick={() => handleStartSession(p.id)}
                    className="mt-2 w-full bg-gn text-white text-[10px] font-semibold py-2 rounded
                               hover:bg-gn-dark transition-colors"
                  >
                    Iniciar Sesión de Captura
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateJornadaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchJornadas}
      />
    </div>
  );
}
