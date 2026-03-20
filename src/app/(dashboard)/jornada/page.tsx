"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/dashboard/match-card";
import { EditMatchModal } from "@/components/dashboard/edit-match-modal";
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

const DIVISION_FILTERS = ["Todos", "M19", "M17", "M16", "M15"] as const;

export default function FixturePage() {
  const [partidos, setPartidos] = useState<PartidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [divFilter, setDivFilter] = useState<string>("Todos");
  const [editPartido, setEditPartido] = useState<PartidoRow | null>(null);

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
      .order("created_at", { ascending: false });
    if (data) setPartidos(data as unknown as PartidoRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPartidos(); }, [fetchPartidos]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este partido? Se borrarán todos sus eventos.")) return;
    const supabase = createClient();
    // Delete eventos first (FK constraint)
    await supabase.from("eventos").delete().eq("partido_id", id);
    // Delete sessions
    await supabase.from("session_participants").delete().in(
      "session_id",
      partidos.filter((p) => p.id === id).flatMap((p) => p.sessions?.map(() => "") || [])
    );
    await supabase.from("sessions").delete().eq("partido_id", id);
    // Delete partido
    await supabase.from("partidos").delete().eq("id", id);
    fetchPartidos();
  };

  const handleEdit = (id: string) => {
    const p = partidos.find((partido) => partido.id === id);
    if (p) setEditPartido(p);
  };

  // Filter by division
  const filtered = divFilter === "Todos"
    ? partidos
    : partidos.filter((p) => p.division.startsWith(divFilter));

  // Group by jornada date
  const grouped = filtered.reduce<Record<string, PartidoRow[]>>((acc, p) => {
    const dateKey = p.jornada?.date || "Sin fecha";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(p);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (dateStr: string) => {
    if (dateStr === "Sin fecha") return dateStr;
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const liveCount = filtered.filter((p) => p.status === "live").length;
  const scheduledCount = filtered.filter((p) => p.status === "scheduled").length;
  const finishedCount = filtered.filter((p) => p.status === "finished").length;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-nv dark:text-white">Fixture</h2>
        <p className="text-xs text-g-4 mt-0.5">Temporada 2026</p>
      </div>

      {/* Division filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {DIVISION_FILTERS.map((d) => (
          <button
            key={d}
            onClick={() => setDivFilter(d)}
            className={`text-xs font-bold px-4 py-2 rounded-md whitespace-nowrap transition-colors ${
              d === divFilter
                ? "bg-nv text-white"
                : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card-compact">
          <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">En vivo</p>
          <p className="text-2xl font-extrabold text-gn mt-0.5">{liveCount}</p>
        </div>
        <div className="card-compact">
          <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">Programados</p>
          <p className="text-2xl font-extrabold text-bl mt-0.5">{scheduledCount}</p>
        </div>
        <div className="card-compact">
          <p className="text-[10px] text-g-4 font-semibold uppercase tracking-wider">Finalizados</p>
          <p className="text-2xl font-extrabold text-g-4 mt-0.5">{finishedCount}</p>
        </div>
      </div>

      {/* Match list grouped by date */}
      {loading ? (
        <div className="card text-center py-8">
          <p className="text-g-4 text-sm animate-pulse">Cargando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-2xl mb-2">🏉</p>
          <p className="text-g-4 text-sm font-semibold">No hay partidos</p>
          <p className="text-g-3 text-xs mt-1">Crea partidos desde Director Rugby.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const matches = grouped[dateKey];
            const jornadaName = matches[0]?.jornada?.name || "";
            return (
              <div key={dateKey}>
                <h3 className="text-xs font-bold text-g-4 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="capitalize">{formatDate(dateKey)}</span>
                  {jornadaName && <span className="text-g-3">— {jornadaName}</span>}
                </h3>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal */}
      <EditMatchModal
        open={!!editPartido}
        onClose={() => setEditPartido(null)}
        onUpdated={fetchPartidos}
        partido={editPartido ? {
          id: editPartido.id,
          division: editPartido.division,
          equipo_visitante: editPartido.equipo_visitante,
        } : null}
      />
    </div>
  );
}
