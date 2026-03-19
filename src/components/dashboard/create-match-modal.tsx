"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANTELES } from "@/lib/constants/modules";
import { generateSessionCode } from "@/lib/utils/session-code";

interface CreateMatchModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface TeamRow {
  id: string;
  name: string;
  short_name: string;
}

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://rugbystats-five.vercel.app";

export function CreateMatchModal({ open, onClose, onCreated }: CreateMatchModalProps) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [selectedPlantel, setSelectedPlantel] = useState<string | null>(null);
  const [rivalId, setRivalId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Result state
  const [resultCode, setResultCode] = useState("");
  const [resultPlantel, setResultPlantel] = useState("");
  const [resultRival, setResultRival] = useState("");

  useEffect(() => {
    if (!open) return;
    async function fetchTeams() {
      const supabase = createClient();
      const { data } = await supabase.from("teams").select("id, name, short_name").order("name");
      if (data) setTeams(data);
    }
    fetchTeams();
  }, [open]);

  const reset = () => {
    setStep("form");
    setSelectedPlantel(null);
    setRivalId("");
    setDate(new Date().toISOString().split("T")[0]);
    setCopiedCode(false);
    setResultCode("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Filter rivals: exclude Tordos teams
  const rivals = teams.filter(
    (t) => !t.name.toLowerCase().includes("tordos") && t.name !== "LIBRE"
  );

  // Find the Tordos team for the selected plantel
  const getPlantelInfo = () => {
    if (!selectedPlantel) return null;
    const p = PLANTELES.find((pl) => pl.key === selectedPlantel);
    return p ?? null;
  };

  // Find Tordos team ID matching the plantel
  const getTordosTeamId = () => {
    if (!selectedPlantel) return null;
    const plantel = getPlantelInfo();
    if (!plantel) return null;

    // Match based on plantel key: M19A → "Tordos A", M19B → "Tordos B", etc.
    const suffix = selectedPlantel.slice(-1); // A, B, or C
    const tordosTeam = teams.find(
      (t) =>
        t.name.toLowerCase().includes("tordos") &&
        t.name.toUpperCase().endsWith(suffix)
    );
    return tordosTeam?.id ?? null;
  };

  const handleCreate = async () => {
    const plantel = getPlantelInfo();
    const tordosId = getTordosTeamId();
    if (!plantel || !tordosId || !rivalId) return;

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Find or create jornada for this date
      const jornadaName = `Fecha ${date}`;
      let jornadaId: string;

      const { data: existing } = await supabase
        .from("jornadas")
        .select("id")
        .eq("date", date)
        .maybeSingle();

      if (existing) {
        jornadaId = existing.id;
      } else {
        const { data: newJ, error: jErr } = await supabase
          .from("jornadas")
          .insert({ name: jornadaName, date })
          .select("id")
          .single();
        if (jErr) throw jErr;
        jornadaId = newJ.id;
      }

      // 2. Create partido
      const { data: partido, error: pErr } = await supabase
        .from("partidos")
        .insert({
          jornada_id: jornadaId,
          division: plantel.division,
          equipo_local_id: tordosId,
          equipo_visitante_id: rivalId,
          status: "live",
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      // 3. Generate code & create session
      const code = generateSessionCode();
      await supabase.from("sessions").insert({
        partido_id: partido.id,
        code,
        created_by: "Director",
      });

      // 4. Show result
      const rivalTeam = teams.find((t) => t.id === rivalId);
      setResultCode(code);
      setResultPlantel(plantel.label);
      setResultRival(rivalTeam?.short_name || rivalTeam?.name || "Rival");
      setStep("result");
      onCreated();
    } catch (err) {
      console.error("Error creating match:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(resultCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = `Unite a capturar el partido ${resultPlantel} Los Tordos vs ${resultRival}. Código: ${resultCode}. Entrá: ${APP_URL}/captura`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleJoin = () => {
    window.location.href = `/captura/${resultCode}?name=Director`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-nv/60" onClick={handleClose}>
      <div
        className="bg-white rounded-lg shadow-modal w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "form" ? (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-g-2">
              <h3 className="text-base font-bold text-nv">Crear Partido</h3>
              <button onClick={handleClose} className="text-g-4 hover:text-nv text-lg">
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Plantel selector */}
              <div>
                <label className="text-xs font-bold text-g-4 uppercase tracking-wider block mb-2">
                  Plantel Los Tordos
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PLANTELES.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => setSelectedPlantel(p.key)}
                      className={`text-sm font-bold py-2.5 rounded-md transition-colors ${
                        selectedPlantel === p.key
                          ? "bg-nv text-white"
                          : "bg-g-1 border border-g-2 text-g-5 hover:bg-g-2"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* VS indicator */}
              {selectedPlantel && (
                <div className="text-center py-1">
                  <p className="text-sm font-bold text-nv">
                    Los Tordos {getPlantelInfo()?.label}
                  </p>
                  <p className="text-lg font-extrabold text-g-3 my-1">VS</p>
                </div>
              )}

              {/* Rival dropdown */}
              <div>
                <label className="text-xs font-bold text-g-4 uppercase tracking-wider block mb-2">
                  Rival
                </label>
                <select
                  value={rivalId}
                  onChange={(e) => setRivalId(e.target.value)}
                  className="w-full border border-g-3 rounded-md px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">Seleccionar rival...</option>
                  {rivals.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-g-4 uppercase tracking-wider block mb-2">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full border border-g-3 rounded-md px-3 py-2.5 text-sm"
                />
              </div>

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={!selectedPlantel || !rivalId || loading}
                className="w-full bg-gn text-white text-sm font-bold py-3 rounded-md hover:bg-gn-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "Creando..." : "Crear Partido y Generar Código"}
              </button>
            </div>
          </>
        ) : (
          /* Result step */
          <div className="px-5 py-6 text-center">
            <p className="text-2xl mb-1">🏉</p>
            <h3 className="text-lg font-bold text-nv mb-1">Partido Creado!</h3>
            <p className="text-sm text-g-5 mb-5">
              {resultPlantel} — Los Tordos vs {resultRival}
            </p>

            {/* Session code */}
            <p className="text-xs font-bold text-g-4 uppercase tracking-wider mb-2">
              Código de Sesión
            </p>
            <div className="bg-g-1 border-2 border-nv rounded-lg py-4 px-6 mb-6 inline-block">
              <span className="text-3xl font-mono font-extrabold text-nv tracking-[0.3em]">
                {resultCode}
              </span>
            </div>

            {/* 3 buttons */}
            <div className="space-y-3">
              <button
                onClick={handleJoin}
                className="w-full bg-gn text-white text-sm font-bold py-3 rounded-md hover:bg-gn-dark transition-colors"
              >
                Unirse al Partido
              </button>
              <button
                onClick={handleCopyCode}
                className="w-full bg-nv text-white text-sm font-bold py-3 rounded-md hover:bg-nv-light transition-colors"
              >
                {copiedCode ? "Copiado!" : "Copiar Código"}
              </button>
              <button
                onClick={handleWhatsApp}
                className="w-full bg-[#25D366] text-white text-sm font-bold py-3 rounded-md hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Compartir por WhatsApp
              </button>
            </div>

            <button
              onClick={handleClose}
              className="mt-4 text-xs text-g-4 hover:text-nv"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
