"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCaptureStore } from "@/hooks/use-capture-store";
import { ModuleGrid } from "@/components/capture/module-grid";
import { PerspectivaPicker } from "@/components/capture/perspectiva-picker";
import { MotivoPicker } from "@/components/capture/motivo-picker";
import { ResultadoPicker } from "@/components/capture/resultado-picker";
import { ConfirmFlash } from "@/components/capture/confirm-flash";
import { LiveFeed } from "@/components/capture/live-feed";

export default function CapturaSessionPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode } = use(params);
  const searchParams = useSearchParams();
  const step = useCaptureStore((s) => s.step);
  const events = useCaptureStore((s) => s.events);
  const undoLast = useCaptureStore((s) => s.undoLast);
  const resetFlow = useCaptureStore((s) => s.resetFlow);
  const undoStack = useCaptureStore((s) => s.undoStack);
  const matchInfo = useCaptureStore((s) => s.matchInfo);
  const joinSessionByCode = useCaptureStore((s) => s.joinSessionByCode);

  const [joining, setJoining] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const name = searchParams.get("name") || "Anónimo";
    joinSessionByCode(sessionCode, name).then((ok) => {
      setJoining(false);
      if (!ok) setError(true);
    });
  }, [sessionCode, searchParams, joinSessionByCode]);

  if (joining) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-dk-1">
        <p className="text-dk-4 text-sm">Conectando a sesión {sessionCode}...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dk-1">
        <p className="text-rd text-sm font-semibold">Sesión no encontrada</p>
        <p className="text-dk-4 text-xs">El código {sessionCode} no existe o ya se cerró.</p>
        <a href="/captura" className="text-bl text-xs hover:underline">← Volver</a>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-dk-1 text-white">
      {/* Header */}
      <header className="flex items-center justify-between bg-nv px-4 py-2.5 shadow-card-sm">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs hover:bg-white/20 transition-colors"
            title="Salir"
          >
            ←
          </a>
          <div>
            {matchInfo ? (
              <>
                <span className="text-[10px] text-dk-4 uppercase tracking-wider">
                  {matchInfo.division}
                </span>
                <p className="text-xs font-bold leading-tight">
                  {matchInfo.local} vs {matchInfo.visitante}
                </p>
              </>
            ) : (
              <>
                <span className="text-[10px] text-dk-4 uppercase tracking-wider">Sesión</span>
                <p className="text-sm font-bold leading-tight">{sessionCode}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-dk-4 block">Eventos</span>
            <span className="text-lg font-extrabold leading-tight">{events.length}</span>
          </div>
          {step !== "modulo" && (
            <button
              onClick={resetFlow}
              className="bg-dk-2 border border-dk-3 rounded px-2.5 py-1.5 text-[10px] font-semibold text-dk-4 hover:text-white"
            >
              ESC
            </button>
          )}
        </div>
      </header>

      {/* Live Feed */}
      <LiveFeed />

      {/* Main capture area */}
      {step === "modulo" && <ModuleGrid />}
      {step === "perspectiva" && <PerspectivaPicker />}
      {step === "motivo" && <MotivoPicker />}
      {step === "resultado" && <ResultadoPicker />}
      {step === "confirm" && <ConfirmFlash />}

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-dk-3 px-4 py-2.5 bg-nv">
        <button
          onClick={undoLast}
          disabled={undoStack.length === 0}
          className="text-[11px] font-semibold text-dk-4 hover:text-rd-light
                     disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
        >
          ↩ Deshacer
        </button>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-dk-4">{sessionCode}</span>
          <span className="inline-flex items-center gap-1 text-[10px] text-gn">
            <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
            En vivo
          </span>
        </div>
      </footer>
    </main>
  );
}
