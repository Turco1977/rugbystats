"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANTELES } from "@/lib/constants/modules";

interface EditMatchModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  partido: {
    id: string;
    division: string;
    equipo_visitante: { id: string; name: string; short_name: string } | null;
  } | null;
}

interface TeamRow {
  id: string;
  name: string;
  short_name: string;
}

export function EditMatchModal({ open, onClose, onUpdated, partido }: EditMatchModalProps) {
  const [selectedPlantel, setSelectedPlantel] = useState<string | null>(null);
  const [rivalName, setRivalName] = useState("");
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!open || !partido) return;

    // Pre-fill from partido
    const plantel = PLANTELES.find((p) => p.division === partido.division.replace(/[ABC]$/, "") && partido.division.endsWith(p.key.slice(-1)));
    if (plantel) setSelectedPlantel(plantel.key);
    else {
      const match = PLANTELES.find((p) => partido.division.startsWith(p.division));
      if (match) setSelectedPlantel(match.key);
    }

    setRivalName(partido.equipo_visitante?.short_name || partido.equipo_visitante?.name || "");

    async function fetchTeams() {
      const supabase = createClient();
      const { data } = await supabase.from("teams").select("id, name, short_name").order("name");
      if (data) setTeams(data);
    }
    fetchTeams();
  }, [open, partido]);

  const rivalTeams = teams.filter(
    (t) => !t.name.toLowerCase().includes("tordos") && t.name !== "LIBRE"
  );

  const findRivalTeamId = (name: string): string | null => {
    const search = name.trim().toLowerCase();
    if (!search) return null;
    const exactShort = teams.find((t) => t.short_name.toLowerCase() === search);
    if (exactShort) return exactShort.id;
    const partialShort = teams.find((t) => t.short_name.toLowerCase().includes(search));
    if (partialShort) return partialShort.id;
    const partialName = teams.find((t) => t.name.toLowerCase().includes(search));
    if (partialName) return partialName.id;
    return null;
  };

  const handleUpdate = async () => {
    if (!partido || !selectedPlantel || !rivalName.trim()) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const supabase = createClient();
      const plantel = PLANTELES.find((p) => p.key === selectedPlantel);
      if (!plantel) throw new Error("Plantel no encontrado");

      let rivalId = findRivalTeamId(rivalName);
      if (!rivalId) {
        const trimmed = rivalName.trim();
        const { data: newTeam, error: tErr } = await supabase
          .from("teams")
          .insert({ name: trimmed, short_name: trimmed })
          .select("id")
          .single();
        if (tErr) throw new Error(`No se pudo crear equipo: ${tErr.message}`);
        rivalId = newTeam.id;
      }

      const { error } = await supabase
        .from("partidos")
        .update({
          division: plantel.division,
          equipo_visitante_id: rivalId,
        })
        .eq("id", partido.id);

      if (error) throw new Error(error.message);

      onUpdated();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  if (!open || !partido) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nv/60" onClick={onClose}>
      <div
        className="bg-white dark:bg-dk-2 rounded-lg shadow-modal w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-g-2 dark:border-dk-3">
          <h3 className="text-base font-bold text-nv dark:text-white">Editar Partido</h3>
          <button onClick={onClose} className="text-g-4 hover:text-nv text-lg">✕</button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Plantel selector */}
          <div>
            <label className="text-xs font-bold text-g-4 uppercase tracking-wider block mb-2">
              Plantel
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PLANTELES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelectedPlantel(p.key)}
                  className={`text-sm font-bold py-2.5 rounded-md transition-colors ${
                    selectedPlantel === p.key
                      ? "bg-nv text-white"
                      : "bg-g-1 dark:bg-dk-3 border border-g-2 dark:border-dk-3 text-g-5 dark:text-dk-4 hover:bg-g-2 dark:hover:bg-dk-3"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rival */}
          <div>
            <label className="text-xs font-bold text-g-4 uppercase tracking-wider block mb-2">
              Rival
            </label>
            <input
              type="text"
              value={rivalName}
              onChange={(e) => { setRivalName(e.target.value); setErrorMsg(""); }}
              placeholder="Ej: Peumayen, Marista..."
              list="rival-teams-edit"
              className="w-full border border-g-3 dark:border-dk-3 rounded-md px-3 py-2.5 text-sm bg-white dark:bg-dk-3 dark:text-white"
            />
            <datalist id="rival-teams-edit">
              {rivalTeams.map((t) => (
                <option key={t.id} value={t.short_name} />
              ))}
            </datalist>
          </div>

          {errorMsg && (
            <div className="bg-rd/10 border border-rd/30 rounded-md px-3 py-2">
              <p className="text-xs text-rd font-semibold">{errorMsg}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-g-1 dark:bg-dk-3 text-g-5 dark:text-dk-4 text-sm font-bold py-3 rounded-md hover:bg-g-2 dark:hover:bg-dk-3 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdate}
              disabled={!selectedPlantel || !rivalName.trim() || loading}
              className="flex-1 bg-gn text-white text-sm font-bold py-3 rounded-md hover:bg-gn-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
