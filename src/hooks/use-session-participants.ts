import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Participant {
  id: string;
  display_name: string;
  created_at: string;
}

export function useSessionParticipants(sessionId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createClient();

    // Initial fetch
    supabase
      .from("session_participants")
      .select("id, display_name, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setParticipants(data);
      });

    // Listen for new participants
    const channel = supabase
      .channel(`participants-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newP = payload.new as Participant;
          setParticipants((prev) => {
            if (prev.some((p) => p.id === newP.id)) return prev;
            return [...prev, newP];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return participants;
}
