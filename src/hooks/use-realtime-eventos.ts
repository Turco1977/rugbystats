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

    // Subscribe to INSERT and DELETE events
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
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "eventos",
          filter: `partido_id=eq.${partidoId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id;
          if (deletedId) {
            setEvents((prev) => prev.filter((e) => e.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partidoId]);

  return events;
}
