import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { ModuloType, Perspectiva } from "@/lib/types/domain";
import type { CaptureStep, QueuedEvent } from "@/lib/types/capture";

interface CaptureState {
  step: CaptureStep;
  selectedModulo: ModuloType | null;
  selectedPerspectiva: Perspectiva | null;
  selectedMotivo: string | null;
  selectedResultado: string | null;

  events: QueuedEvent[];
  undoStack: QueuedEvent[];
  counters: Record<string, number>;

  // Session/partido info from Supabase
  sessionCode: string | null;
  sessionId: string | null;
  partidoId: string | null;
  displayName: string | null;
  matchInfo: { local: string; visitante: string; division: string } | null;

  // Actions
  setStep: (step: CaptureStep) => void;
  selectModulo: (modulo: ModuloType) => void;
  selectPerspectiva: (perspectiva: Perspectiva) => void;
  selectMotivo: (motivo: string) => void;
  selectResultado: (resultado: string) => void;
  undoLast: () => void;
  resetFlow: () => void;
  setSession: (code: string, name: string) => void;
  joinSessionByCode: (code: string, name: string) => Promise<boolean>;
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
  sessionCode: null,
  sessionId: null,
  partidoId: null,
  displayName: null,
  matchInfo: null,

  setStep: (step) => set({ step }),

  selectModulo: (modulo) =>
    set({ selectedModulo: modulo, step: "perspectiva" }),

  selectPerspectiva: (perspectiva) =>
    set({ selectedPerspectiva: perspectiva, step: "motivo" }),

  selectMotivo: (motivo) =>
    set({ selectedMotivo: motivo, step: "resultado" }),

  selectResultado: (resultado) => {
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
      resultado,
      timestamp: new Date().toISOString(),
      numero: currentCount,
      cargadoPor: state.displayName || "Anónimo",
      synced: false,
    };

    set({
      selectedResultado: resultado,
      events: [event, ...state.events],
      undoStack: [event, ...state.undoStack.slice(0, 9)],
      counters: { ...state.counters, [counterKey]: currentCount },
      step: "confirm",
    });

    // Save to Supabase if we have a session
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
        })
        .then(({ error }) => {
          if (!error) {
            // Mark as synced
            set((s) => ({
              events: s.events.map((e) =>
                e.id === event.id ? { ...e, synced: true } : e
              ),
            }));
          }
        });
    }

    // Auto-reset after confirm flash
    setTimeout(() => {
      set({
        step: "modulo",
        selectedModulo: null,
        selectedPerspectiva: null,
        selectedMotivo: null,
        selectedResultado: null,
      });
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

    set({
      events: state.events.filter((e) => e.id !== lastEvent.id),
      undoStack: state.undoStack.slice(1),
      counters: {
        ...state.counters,
        [counterKey]: Math.max(0, (state.counters[counterKey] || 1) - 1),
      },
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

  joinSessionByCode: async (code, name) => {
    const supabase = createClient();

    // Find session by code
    const { data: session, error } = await supabase
      .from("sessions")
      .select(`
        id, partido_id, code,
        partidos(
          id, division, puntos_local, puntos_visitante,
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
      equipo_local: { short_name: string; name: string } | null;
      equipo_visitante: { short_name: string; name: string } | null;
    };

    set({
      sessionCode: code,
      sessionId: session.id,
      partidoId: session.partido_id,
      displayName: name,
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
