"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface RealtimeEvento {
  id: string;
  partido_id: string;
  modulo: string;
  perspectiva: "propio" | "rival";
  numero: number;
  data: Record<string, unknown>;
  cargado_por: string;
  timestamp: string;
}

export function useRealtimeEventos(partidoId: string | null) {
  const [events, setEvents] = useState<RealtimeEvento[]>([]);

  useEffect(() => {
    if (!partidoId) return;

    const supabase = createClient();

    // Fetch existing events
    supabase
      .from("eventos")
      .select("*")
      .eq("partido_id", partidoId)
      .order("timestamp", { ascending: false })
      .then(({ data }) => {
        if (data) setEvents(data);
      });

    // Subscribe to new events
    const channel = supabase
      .channel(`eventos:${partidoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "eventos",
          filter: `partido_id=eq.${partidoId}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new as RealtimeEvento, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partidoId]);

  return events;
}
