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
  const [rivalName, setRivalName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    setRivalName("");
    setDate(new Date().toISOString().split("T")[0]);
    setCopiedCode(false);
    setResultCode("");
    setErrorMsg("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getPlantelInfo = () => {
    if (!selectedPlantel) return null;
    return PLANTELES.find((pl) => pl.key === selectedPlantel) ?? null;
  };

  // Find Tordos team by plantel suffix
  const findTordosTeamId = (): string | null => {
    if (!selectedPlantel) return null;
    const suffix = selectedPlantel.slice(-1); // A, B, or C

    // Match by short_name: "Tordos A", "Tordos B", "Tordos C"
    const exact = teams.find(
      (t) => t.short_name.toLowerCase() === `tordos ${suffix.toLowerCase()}`
    );
    if (exact) return exact.id;

    // Fallback: any tordos team ending in suffix
    const fallback = teams.find(
      (t) =>
        t.name.toLowerCase().includes("tordos") &&
        t.name.trim().slice(-1).toUpperCase() === suffix
    );
    if (fallback) return fallback.id;

    // Last resort: first tordos
    const any = teams.find((t) => t.name.toLowerCase().includes("tordos"));
    return any?.id ?? null;
  };

  // Find rival team by partial name match in existing teams
  const findRivalTeamId = (name: string): string | null => {
    const search = name.trim().toLowerCase();
    if (!search) return null;

    // Exact short_name match
    const exactShort = teams.find(
      (t) => t.short_name.toLowerCase() === search
    );
    if (exactShort) return exactShort.id;

    // short_name contains search
    const partialShort = teams.find(
      (t) => t.short_name.toLowerCase().includes(search)
    );
    if (partialShort) return partialShort.id;

    // name contains search
    const partialName = teams.find(
      (t) => t.name.toLowerCase().includes(search)
    );
    if (partialName) return partialName.id;

    // search contains short_name
    const reverseMatch = teams.find(
      (t) => search.includes(t.short_name.toLowerCase())
    );
    if (reverseMatch) return reverseMatch.id;

    return null;
  };

  // Non-Tordos teams for autocomplete hints
  const rivalTeams = teams.filter(
    (t) => !t.name.toLowerCase().includes("tordos") && t.name !== "LIBRE"
  );

  const handleCreate = async () => {
    const plantel = getPlantelInfo();
    if (!plantel || !rivalName.trim()) return;

    setErrorMsg("");
    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Find teams
      const tordosId = findTordosTeamId();
      if (!tordosId) {
        setErrorMsg("No se encontró equipo Tordos. Verificá que los equipos estén cargados en Supabase.");
        return;
      }

      let rivalId = findRivalTeamId(rivalName);
      if (!rivalId) {
        // Create new team with the name provided
        const trimmed = rivalName.trim();
        const { data: newTeam, error: tErr } = await supabase
          .from("teams")
          .insert({ name: trimmed, short_name: trimmed, club: trimmed })
          .select("id")
          .single();
        if (tErr) {
          setErrorMsg(`No se pudo crear equipo "${trimmed}": ${tErr.message}`);
          return;
        }
        rivalId = newTeam.id;
      }

      // 2. Find or create jornada for this date
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
          .insert({ name: `Fecha ${date}`, date })
          .select("id")
          .single();
        if (jErr) throw jErr;
        jornadaId = newJ.id;
      }

      // 3. Create partido
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

      // 4. Generate code & create session
      const code = generateSessionCode();
      const { error: sErr } = await supabase.from("sessions").insert({
        partido_id: partido.id,
        code,
        created_by: "Director",
      });
      if (sErr) throw sErr;

      // 5. Show result
      const rivalTeam = teams.find((t) => t.id === rivalId);
      setResultCode(code);
      setResultPlantel(plantel.label);
      setResultRival(rivalTeam?.short_name || rivalName.trim());
      setStep("result");
      onCreated();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrorMsg(`Error al crear partido: ${msg}`);
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
        className="bg-white rounded-lg shadow-modal w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
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

              {/* Rival - text input with hint */}
              <div>
                <label className="text-xs font-bold text-g-4 uppercase tracking-wider block mb-2">
                  Rival
                </label>
                <input
                  type="text"
                  value={rivalName}
                  onChange={(e) => { setRivalName(e.target.value); setErrorMsg(""); }}
                  placeholder="Ej: Peumayen, Marista, Liceo..."
                  list="rival-teams"
                  className="w-full border border-g-3 rounded-md px-3 py-2.5 text-sm bg-white"
                />
                <datalist id="rival-teams">
                  {rivalTeams.map((t) => (
                    <option key={t.id} value={t.short_name} />
                  ))}
                </datalist>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold text-g-4 uppercase tracking-wider block mb-2">
                  Fecha del partido
                </label>
                <div
                  className="relative w-full border border-g-3 rounded-md bg-white cursor-pointer"
                  onClick={() => {
                    const input = document.getElementById("match-date-input") as HTMLInputElement;
                    input?.showPicker?.();
                    input?.focus();
                  }}
                >
                  <input
                    id="match-date-input"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 text-base bg-transparent appearance-none cursor-pointer"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-g-4">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="bg-rd-bg border border-rd-border rounded-md px-3 py-2">
                  <p className="text-xs text-rd font-semibold">{errorMsg}</p>
                </div>
              )}

              {/* Create button */}
              <button
                onClick={handleCreate}
                disabled={!selectedPlantel || !rivalName.trim() || loading}
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

            <p className="text-xs font-bold text-g-4 uppercase tracking-wider mb-2">
              Código de Sesión
            </p>
            <div className="bg-g-1 border-2 border-nv rounded-lg py-4 px-6 mb-6 inline-block">
              <span className="text-3xl font-mono font-extrabold text-nv tracking-[0.3em]">
                {resultCode}
              </span>
            </div>

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

            <button onClick={handleClose} className="mt-4 text-xs text-g-4 hover:text-nv">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
