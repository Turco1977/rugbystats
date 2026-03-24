"use client";

import { useEffect, useState } from "react";

interface MatchTimerProps {
  /** ISO timestamp when current half started (null = clock not running) */
  startTime: string | null;
  /** ISO timestamp when current half ended (null = still running) */
  endTime?: string | null;
}

/**
 * Displays elapsed time as MM:SS for the current half.
 * Pure display component — no server communication.
 */
export function MatchTimer({ startTime, endTime }: MatchTimerProps) {
  const [elapsed, setElapsed] = useState<string>("--:--");

  useEffect(() => {
    if (!startTime) {
      setElapsed("--:--");
      return;
    }

    const start = new Date(startTime).getTime();

    // If half is already finished, show final time
    if (endTime) {
      const end = new Date(endTime).getTime();
      setElapsed(formatElapsed(end - start));
      return;
    }

    // Clock is running — update every second
    const update = () => {
      const now = Date.now();
      setElapsed(formatElapsed(now - start));
    };

    update(); // immediate
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime]);

  return (
    <span className="font-mono text-sm font-bold tabular-nums">{elapsed}</span>
  );
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
