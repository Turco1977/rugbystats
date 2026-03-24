import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { ModuloType, Perspectiva, Tiempo } from "@/lib/types/domain";
import type { CaptureStep, QueuedEvent } from "@/lib/types/capture";
import { MODULE_CONFIG } from "@/lib/constants/modules";

/** Points per scoring detail */
const POINTS_MAP: Record<string, number> = {
  try: 5,
  try_convertido: 7,
  penal: 3,
  drop: 3,
};

// Match phase derived from timer state
export type MatchPhase =
  | "pre_match"    // Not started yet
  | "1t_running"   // 1T clock running
  | "halftime"     // 1T closed, 2T not started
  | "2t_running"   // 2T clock running
  | "finished";    // Match closed

interface CaptureState {
  step: CaptureStep;
  selectedModulo: ModuloType | null;
  selectedPerspectiva: Perspectiva | null;
  selectedMotivo: string | null;
  selectedResultado: string | null;

  events: QueuedEvent[];
  undoStack: QueuedEvent[];
  counters: Record<string, number>;

  // Score
  puntosLocal: number;
  puntosVisitante: number;

  // Session/partido info from Supabase
  sessionCode: string | null;
  sessionId: string | null;
  partidoId: string | null;
  displayName: string | null;
  matchInfo: { local: string; visitante: string; division: string } | null;

  // Half & timer state (from server)
  tiempoActual: Tiempo;
  tiempoInicio1t: string | null;
  tiempoFin1t: string | null;
  tiempoInicio2t: string | null;
  tiempoFin2t: string | null;

  // Derived
  matchPhase: () => MatchPhase;

  // Actions
  setStep: (step: CaptureStep) => void;
  selectModulo: (modulo: ModuloType) => void;
  selectPerspectiva: (perspectiva: Perspectiva) => void;
  selectMotivo: (motivo: string) => void;
  selectResultado: (resultado: string) => void;
  selectDetalle: (detalle: string, points: number) => void;
  undoLast: () => void;
  resetFlow: () => void;
  setSession: (code: string, name: string) => void;
  joinSessionByCode: (code: string, name: string) => Promise<boolean>;
  cerrarPartido: () => Promise<void>;

  // New timer/half actions
  iniciarPartido: () => Promise<void>;
  cerrar1T: () => Promise<void>;
  iniciar2T: () => Promise<void>;
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  step: "modulo",
  selectedModulo: null,
  selectedPerspectiva: null,
  selectedMotivo: null,
  selectedResultado: null,
  events: [],
  undoStack: [],
  counters: {},
  puntosLocal: 0,
  puntosVisitante: 0,
  sessionCode: null,
  sessionId: null,
  partidoId: null,
  displayName: null,
  matchInfo: null,

  // Half & timer defaults
  tiempoActual: "1T",
  tiempoInicio1t: null,
  tiempoFin1t: null,
  tiempoInicio2t: null,
  tiempoFin2t: null,

  matchPhase: () => {
    const s = get();
    if (!s.tiempoInicio1t) return "pre_match";
    if (s.tiempoActual === "1T" && !s.tiempoFin1t) return "1t_running";
    if (s.tiempoActual === "1T" && s.tiempoFin1t && !s.tiempoInicio2t) return "halftime";
    if (s.tiempoActual === "2T" && !s.tiempoFin2t) return "2t_running";
    return "finished";
  },

  setStep: (step) => set({ step }),

  selectModulo: (modulo) => {
    const config = MODULE_CONFIG.find((m) => m.id === modulo);
    if (config?.hasPerspective === false) {
      set({ selectedModulo: modulo, selectedPerspectiva: "propio", step: "motivo" });
    } else {
      set({ selectedModulo: modulo, step: "perspectiva" });
    }
  },

  selectPerspectiva: (perspectiva) =>
    set({ selectedPerspectiva: perspectiva, step: "motivo" }),

  selectMotivo: (motivo) =>
    set({ selectedMotivo: motivo, step: "resultado" }),

  selectResultado: (resultado) => {
    const state = get();
    if (!state.selectedModulo || !state.selectedPerspectiva || !state.selectedMotivo)
      return;

    if (resultado === "puntos" || (state.selectedModulo === "PIE" && (resultado === "eficiente" || resultado === "ganado"))) {
      set({ selectedResultado: resultado, step: "detalle" });
      return;
    }

    const counterKey = `${state.selectedModulo}_${state.selectedPerspectiva}`;
    const currentCount = (state.counters[counterKey] || 0) + 1;

    const event: QueuedEvent = {
      id: crypto.randomUUID(),
      modulo: state.selectedModulo,
      perspectiva: state.selectedPerspectiva,
      motivo: state.selectedMotivo,
      resultado,
      timestamp: new Date().toISOString(),
      numero: currentCount,
      cargadoPor: state.displayName || "Anónimo",
      synced: false,
      tiempo: state.tiempoActual,
    };

    set({
      selectedResultado: resultado,
      events: [event, ...state.events],
      undoStack: [event, ...state.undoStack.slice(0, 9)],
      counters: { ...state.counters, [counterKey]: currentCount },
      step: "confirm",
    });

    // Save to Supabase
    if (state.partidoId) {
      const supabase = createClient();
      supabase
        .from("eventos")
        .insert({
          partido_id: state.partidoId,
          session_id: state.sessionId,
          modulo: state.selectedModulo,
          perspectiva: state.selectedPerspectiva,
          numero: currentCount,
          data: { motivo: state.selectedMotivo, resultado },
          cargado_por: state.displayName || "Anónimo",
          tiempo: state.tiempoActual,
        })
        .then(({ error }) => {
          if (!error) {
            set((s) => ({
              events: s.events.map((e) =>
                e.id === event.id ? { ...e, synced: true } : e
              ),
            }));
          }
        });
    }

    // Auto-reset
    setTimeout(() => {
      set({ step: "modulo", selectedModulo: null, selectedPerspectiva: null, selectedMotivo: null, selectedResultado: null });
    }, 800);
  },

  selectDetalle: (detalle, points) => {
    const state = get();
    if (!state.selectedModulo || !state.selectedPerspectiva || !state.selectedMotivo)
      return;

    const counterKey = `${state.selectedModulo}_${state.selectedPerspectiva}`;
    const currentCount = (state.counters[counterKey] || 0) + 1;

    const event: QueuedEvent = {
      id: crypto.randomUUID(),
      modulo: state.selectedModulo,
      perspectiva: state.selectedPerspectiva,
      motivo: state.selectedMotivo,
      resultado: detalle,
      timestamp: new Date().toISOString(),
      numero: currentCount,
      cargadoPor: state.displayName || "Anónimo",
      synced: false,
      tiempo: state.tiempoActual,
    };

    let newLocal = state.puntosLocal;
    let newVisitante = state.puntosVisitante;

    if (state.selectedModulo === "ATAQUE") {
      newLocal += points;
    } else if (state.selectedModulo === "DEFENSA") {
      newVisitante += points;
    }

    set({
      selectedResultado: detalle,
      events: [event, ...state.events],
      undoStack: [event, ...state.undoStack.slice(0, 9)],
      counters: { ...state.counters, [counterKey]: currentCount },
      puntosLocal: newLocal,
      puntosVisitante: newVisitante,
      step: "confirm",
    });

    // Save to Supabase
    if (state.partidoId) {
      const supabase = createClient();
      supabase
        .from("eventos")
        .insert({
          partido_id: state.partidoId,
          session_id: state.sessionId,
          modulo: state.selectedModulo,
          perspectiva: state.selectedPerspectiva,
          numero: currentCount,
          data: { motivo: state.selectedMotivo, resultado: "puntos", detalle },
          cargado_por: state.displayName || "Anónimo",
          tiempo: state.tiempoActual,
        })
        .then(({ error }) => {
          if (!error) {
            set((s) => ({
              events: s.events.map((e) =>
                e.id === event.id ? { ...e, synced: true } : e
              ),
            }));
          }
        });

      // Update score
      supabase
        .from("partidos")
        .update({ puntos_local: newLocal, puntos_visitante: newVisitante })
        .eq("id", state.partidoId)
        .then(() => {});
    }

    // Auto-reset
    setTimeout(() => {
      set({ step: "modulo", selectedModulo: null, selectedPerspectiva: null, selectedMotivo: null, selectedResultado: null });
    }, 800);
  },

  undoLast: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const lastEvent = state.undoStack[0];
    const counterKey = `${lastEvent.modulo}_${lastEvent.perspectiva}`;

    // Delete from Supabase if synced
    if (lastEvent.synced && state.partidoId) {
      const supabase = createClient();
      supabase
        .from("eventos")
        .delete()
        .eq("partido_id", state.partidoId)
        .eq("modulo", lastEvent.modulo)
        .eq("perspectiva", lastEvent.perspectiva)
        .eq("numero", lastEvent.numero)
        .then(() => {});
    }

    // Reverse points if it was a scoring event
    let newLocal = state.puntosLocal;
    let newVisitante = state.puntosVisitante;
    const pts = POINTS_MAP[lastEvent.resultado] || (lastEvent.resultado === "puntos" ? 5 : 0);
    if (pts > 0) {
      if (lastEvent.modulo === "ATAQUE" && lastEvent.perspectiva === "propio") {
        newLocal = Math.max(0, newLocal - pts);
      } else if (lastEvent.modulo === "DEFENSA" && lastEvent.perspectiva === "propio") {
        newVisitante = Math.max(0, newVisitante - pts);
      }
      // Update DB
      if (state.partidoId) {
        const supabase = createClient();
        supabase
          .from("partidos")
          .update({ puntos_local: newLocal, puntos_visitante: newVisitante })
          .eq("id", state.partidoId)
          .then(() => {});
      }
    }

    set({
      events: state.events.filter((e) => e.id !== lastEvent.id),
      undoStack: state.undoStack.slice(1),
      counters: {
        ...state.counters,
        [counterKey]: Math.max(0, (state.counters[counterKey] || 1) - 1),
      },
      puntosLocal: newLocal,
      puntosVisitante: newVisitante,
    });
  },

  resetFlow: () =>
    set({
      step: "modulo",
      selectedModulo: null,
      selectedPerspectiva: null,
      selectedMotivo: null,
      selectedResultado: null,
    }),

  setSession: (code, name) =>
    set({ sessionCode: code, displayName: name }),

  // ─── Timer & Half Actions ───────────────────────────────────

  iniciarPartido: async () => {
    const state = get();
    if (!state.partidoId) return;

    const now = new Date().toISOString();
    const supabase = createClient();

    await supabase
      .from("partidos")
      .update({
        status: "live",
        tiempo_actual: "1T",
        tiempo_inicio_1t: now,
      })
      .eq("id", state.partidoId);

    set({ tiempoActual: "1T", tiempoInicio1t: now });
  },

  cerrar1T: async () => {
    const state = get();
    if (!state.partidoId) return;

    const now = new Date().toISOString();
    const supabase = createClient();

    await supabase
      .from("partidos")
      .update({ tiempo_fin_1t: now })
      .eq("id", state.partidoId);

    set({ tiempoFin1t: now });
  },

  iniciar2T: async () => {
    const state = get();
    if (!state.partidoId) return;

    const now = new Date().toISOString();
    const supabase = createClient();

    await supabase
      .from("partidos")
      .update({
        tiempo_actual: "2T",
        tiempo_inicio_2t: now,
      })
      .eq("id", state.partidoId);

    set({ tiempoActual: "2T", tiempoInicio2t: now });
  },

  cerrarPartido: async () => {
    const state = get();
    if (!state.partidoId || !state.sessionId) return;

    const now = new Date().toISOString();
    const supabase = createClient();

    // Close partido with final timer
    await supabase
      .from("partidos")
      .update({
        status: "finished",
        tiempo_fin_2t: now,
      })
      .eq("id", state.partidoId);

    // Close session
    await supabase
      .from("sessions")
      .update({ is_active: false })
      .eq("id", state.sessionId);

    set({ tiempoFin2t: now });
  },

  // ─── Join Session ───────────────────────────────────────────

  joinSessionByCode: async (code, name) => {
    const supabase = createClient();

    // Find session by code — now also fetch half & timer fields
    const { data: session, error } = await supabase
      .from("sessions")
      .select(`
        id, partido_id, code,
        partidos(
          id, division, status, puntos_local, puntos_visitante,
          tiempo_actual, tiempo_inicio_1t, tiempo_fin_1t, tiempo_inicio_2t, tiempo_fin_2t,
          equipo_local:teams!equipo_local_id(short_name, name),
          equipo_visitante:teams!equipo_visitante_id(short_name, name)
        )
      `)
      .eq("code", code.trim())
      .eq("is_active", true)
      .single();

    if (error || !session) return false;

    // Join as participant
    await supabase.from("session_participants").insert({
      session_id: session.id,
      display_name: name,
    });

    // Extract match info
    const partido = session.partidos as unknown as {
      id: string;
      division: string;
      status: string;
      puntos_local: number;
      puntos_visitante: number;
      tiempo_actual: Tiempo;
      tiempo_inicio_1t: string | null;
      tiempo_fin_1t: string | null;
      tiempo_inicio_2t: string | null;
      tiempo_fin_2t: string | null;
      equipo_local: { short_name: string; name: string } | null;
      equipo_visitante: { short_name: string; name: string } | null;
    };

    set({
      sessionCode: code,
      sessionId: session.id,
      partidoId: session.partido_id,
      displayName: name,
      puntosLocal: partido?.puntos_local || 0,
      puntosVisitante: partido?.puntos_visitante || 0,
      // Half & timer state from server
      tiempoActual: partido?.tiempo_actual || "1T",
      tiempoInicio1t: partido?.tiempo_inicio_1t || null,
      tiempoFin1t: partido?.tiempo_fin_1t || null,
      tiempoInicio2t: partido?.tiempo_inicio_2t || null,
      tiempoFin2t: partido?.tiempo_fin_2t || null,
      matchInfo: partido
        ? {
            local: partido.equipo_local?.short_name || partido.equipo_local?.name || "Local",
            visitante: partido.equipo_visitante?.short_name || partido.equipo_visitante?.name || "Visitante",
            division: partido.division,
          }
        : null,
    });

    return true;
  },
}));
