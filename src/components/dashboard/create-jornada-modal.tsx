"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Division } from "@/lib/types/domain";

interface Team {
  id: string;
  name: string;
  short_name: string;
}

interface CreateJornadaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateJornadaModal({ open, onClose, onCreated }: CreateJornadaModalProps) {
  const [step, setStep] = useState<"jornada" | "partidos">("jornada");
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [jornadaId, setJornadaId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  // Partido form
  const [division, setDivision] = useState<Division>("M19");
  const [localId, setLocalId] = useState("");
  const [visitanteId, setVisitanteId] = useState("");
  const [partidosCreados, setPartidosCreados] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      supabase.from("teams").select("id, name, short_name").order("name")
        .then(({ data }) => { if (data) setTeams(data); });
    }
  }, [open]);

  const handleCreateJornada = async () => {
    if (!name.trim() || !date) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("jornadas")
      .insert({ name: name.trim(), date })
      .select()
      .single();
    setLoading(false);
    if (error) { alert("Error: " + error.message); return; }
    setJornadaId(data.id);
    setStep("partidos");
  };

  const handleAddPartido = async () => {
    if (!jornadaId || !localId || !visitanteId || localId === visitanteId) return;
    setLoading(true);
    const { error } = await supabase.from("partidos").insert({
      jornada_id: jornadaId,
      division,
      equipo_local_id: localId,
      equipo_visitante_id: visitanteId,
    });
    setLoading(false);
    if (error) { alert("Error: " + error.message); return; }
    setPartidosCreados((p) => p + 1);
    setLocalId("");
    setVisitanteId("");
  };

  const handleFinish = () => {
    setStep("jornada");
    setName("");
    setDate(new Date().toISOString().split("T")[0]);
    setJornadaId(null);
    setPartidosCreados(0);
    onCreated();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nv/60" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-modal w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-g-2">
          <h2 className="text-sm font-bold text-nv">
            {step === "jornada" ? "Nueva Jornada" : "Agregar Partidos"}
          </h2>
          <button onClick={onClose} className="text-g-4 hover:text-nv text-lg">✕</button>
        </div>

        <div className="p-5">
          {step === "jornada" && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-g-4 font-bold uppercase tracking-wider block mb-1">
                  Nombre de la jornada
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Torneo Apertura — Fecha #1"
                  className="w-full px-3.5 py-2.5 rounded border border-g-3 text-xs focus:border-nv focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-g-4 font-bold uppercase tracking-wider block mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded border border-g-3 text-xs focus:border-nv focus:outline-none"
                />
              </div>
              <button
                onClick={handleCreateJornada}
                disabled={loading || !name.trim()}
                className="w-full bg-nv text-white text-[11px] font-semibold py-2.5 rounded
                           hover:bg-nv-light disabled:opacity-40 transition-colors"
              >
                {loading ? "Creando..." : "Crear Jornada y Agregar Partidos →"}
              </button>
            </div>
          )}

          {step === "partidos" && (
            <div className="space-y-4">
              <p className="text-xs text-gn-forest bg-gn-bg px-3 py-2 rounded">
                Jornada creada. Agregá los partidos del día.
                {partidosCreados > 0 && <strong> ({partidosCreados} agregados)</strong>}
              </p>

              <div>
                <label className="text-[10px] text-g-4 font-bold uppercase tracking-wider block mb-1">
                  División
                </label>
                <div className="flex gap-1.5">
                  {(["M15", "M16", "M17", "M19"] as Division[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDivision(d)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded transition-colors ${
                        d === division ? "bg-nv text-white" : "bg-g-1 border border-g-2 text-g-5 hover:bg-g-2"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-g-4 font-bold uppercase tracking-wider block mb-1">
                  Equipo Local
                </label>
                <select
                  value={localId}
                  onChange={(e) => setLocalId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded border border-g-3 text-xs focus:border-nv focus:outline-none bg-white"
                >
                  <option value="">Seleccionar equipo local...</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.short_name || t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-g-4 font-bold uppercase tracking-wider block mb-1">
                  Equipo Visitante
                </label>
                <select
                  value={visitanteId}
                  onChange={(e) => setVisitanteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded border border-g-3 text-xs focus:border-nv focus:outline-none bg-white"
                >
                  <option value="">Seleccionar equipo visitante...</option>
                  {teams.filter((t) => t.id !== localId).map((t) => (
                    <option key={t.id} value={t.id}>{t.short_name || t.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAddPartido}
                disabled={loading || !localId || !visitanteId || localId === visitanteId}
                className="w-full bg-gn text-white text-[11px] font-semibold py-2.5 rounded
                           hover:bg-gn-dark disabled:opacity-40 transition-colors"
              >
                {loading ? "Agregando..." : "+ Agregar Partido"}
              </button>

              <button
                onClick={handleFinish}
                className="w-full bg-g-1 text-nv text-[11px] font-semibold py-2.5 rounded
                           border border-g-2 hover:bg-g-2 transition-colors"
              >
                Listo — Volver al Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
