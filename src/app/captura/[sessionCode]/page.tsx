"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCaptureStore } from "@/hooks/use-capture-store";
import { ModuleGrid } from "@/components/capture/module-grid";
import { PerspectivaPicker } from "@/components/capture/perspectiva-picker";
import { MotivoPicker } from "@/components/capture/motivo-picker";
import { ResultadoPicker } from "@/components/capture/resultado-picker";
import { DetallePicker } from "@/components/capture/detalle-picker";
import { ConfirmFlash } from "@/components/capture/confirm-flash";
import { LiveFeed } from "@/components/capture/live-feed";
import { MatchTimer } from "@/components/capture/match-timer";
import { useRealtimeEventos } from "@/hooks/use-realtime-eventos";

export default function CapturaSessionPage({
  params,
}: {
  params: Promise<{ sessionCode: string }>;
}) {
  const { sessionCode } = use(params);
  const searchParams = useSearchParams();
  const step = useCaptureStore((s) => s.step);
  const undoLast = useCaptureStore((s) => s.undoLast);
  const resetFlow = useCaptureStore((s) => s.resetFlow);
  const undoStack = useCaptureStore((s) => s.undoStack);
  const matchInfo = useCaptureStore((s) => s.matchInfo);
  const joinSessionByCode = useCaptureStore((s) => s.joinSessionByCode);
  const puntosLocal = useCaptureStore((s) => s.puntosLocal);
  const puntosVisitante = useCaptureStore((s) => s.puntosVisitante);
  const cerrarPartido = useCaptureStore((s) => s.cerrarPartido);
  const iniciarPartido = useCaptureStore((s) => s.iniciarPartido);
  const cerrar1T = useCaptureStore((s) => s.cerrar1T);
  const iniciar2T = useCaptureStore((s) => s.iniciar2T);
  const matchPhase = useCaptureStore((s) => s.matchPhase);
  const tiempoActual = useCaptureStore((s) => s.tiempoActual);
  const tiempoInicio1t = useCaptureStore((s) => s.tiempoInicio1t);
  const tiempoFin1t = useCaptureStore((s) => s.tiempoFin1t);
  const tiempoInicio2t = useCaptureStore((s) => s.tiempoInicio2t);
  const tiempoFin2t = useCaptureStore((s) => s.tiempoFin2t);

  const [joining, setJoining] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const partidoId = useCaptureStore((s) => s.partidoId);
  const realtimeEvents = useRealtimeEventos(partidoId);

  const phase = matchPhase();

  // Current timer props based on phase
  const timerStart = phase === "2t_running" ? tiempoInicio2t : tiempoInicio1t;
  const timerEnd = phase === "2t_running" ? tiempoFin2t
    : phase === "halftime" || phase === "finished" ? tiempoFin1t
    : null;

  const handleIniciar = async () => {
    if (!confirm("¿Iniciar partido? Arranca el cronómetro del 1er tiempo.")) return;
    setActionLoading(true);
    await iniciarPartido();
    setActionLoading(false);
  };

  const handleCerrar1T = async () => {
    if (!confirm("¿Cerrar 1er tiempo?")) return;
    setActionLoading(true);
    await cerrar1T();
    setActionLoading(false);
  };

  const handleIniciar2T = async () => {
    if (!confirm("¿Iniciar 2do tiempo? Arranca el cronómetro.")) return;
    setActionLoading(true);
    await iniciar2T();
    setActionLoading(false);
  };

  const handleCerrar = async () => {
    if (!confirm("¿Cerrar partido? Se marcará como finalizado.")) return;
    setActionLoading(true);
    await cerrarPartido();
    window.location.href = "/";
  };

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
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs">
            🏉
          </div>
          <div>
            {matchInfo ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-dk-4 uppercase tracking-wider">
                    {matchInfo.division}
                  </span>
                  {/* Half badge */}
                  {phase !== "pre_match" && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        tiempoActual === "1T"
                          ? "bg-gn/20 text-gn"
                          : "bg-bl/20 text-bl"
                      }`}
                    >
                      {tiempoActual}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold leading-tight">
                  {matchInfo.local} <span className="text-gn text-lg font-extrabold mx-1">{puntosLocal}</span>
                  <span className="text-dk-4 text-xs">-</span>
                  <span className="text-rd text-lg font-extrabold mx-1">{puntosVisitante}</span> {matchInfo.visitante}
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
          {/* Timer */}
          <div className="text-right">
            <span className="text-[10px] text-dk-4 block">
              {phase === "halftime" ? "Entretiempo" : "Tiempo"}
            </span>
            <MatchTimer startTime={timerStart} endTime={timerEnd} />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-dk-4 block">Eventos</span>
            <span className="text-lg font-extrabold leading-tight">{realtimeEvents.length}</span>
          </div>
          {step !== "modulo" && (
            <button
              onClick={resetFlow}
              className="bg-dk-2 border border-dk-3 rounded px-2.5 py-1.5 text-[10px] font-semibold text-dk-4 hover:text-white"
            >
              ESC
            </button>
          )}
          <a
            href="/"
            className="bg-rd/80 text-white text-xs font-semibold px-3 py-1.5 rounded hover:bg-rd transition-colors"
          >
            Salir
          </a>
        </div>
      </header>

      {/* Main capture area */}
      {step === "modulo" && <ModuleGrid />}
      {step === "perspectiva" && <PerspectivaPicker />}
      {step === "motivo" && <MotivoPicker />}
      {step === "resultado" && <ResultadoPicker />}
      {step === "detalle" && <DetallePicker />}
      {step === "confirm" && <ConfirmFlash />}

      {/* Live Feed - below capture area */}
      <LiveFeed />

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

          {/* Contextual status + action button */}
          {phase === "pre_match" && (
            <>
              <span className="inline-flex items-center gap-1 text-[10px] text-yl">
                <span className="w-1.5 h-1.5 rounded-full bg-yl" />
                Esperando
              </span>
              <button
                onClick={handleIniciar}
                disabled={actionLoading}
                className="bg-gn/80 text-white text-[10px] font-semibold px-2.5 py-1 rounded hover:bg-gn transition-colors disabled:opacity-50"
              >
                {actionLoading ? "..." : "▶ Iniciar Partido"}
              </button>
            </>
          )}

          {phase === "1t_running" && (
            <>
              <span className="inline-flex items-center gap-1 text-[10px] text-gn">
                <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
                1T En vivo
              </span>
              <button
                onClick={handleCerrar1T}
                disabled={actionLoading}
                className="bg-yl/80 text-dk-1 text-[10px] font-semibold px-2.5 py-1 rounded hover:bg-yl transition-colors disabled:opacity-50"
              >
                {actionLoading ? "..." : "⏸ Cerrar 1T"}
              </button>
            </>
          )}

          {phase === "halftime" && (
            <>
              <span className="inline-flex items-center gap-1 text-[10px] text-yl">
                <span className="w-1.5 h-1.5 rounded-full bg-yl animate-pulse" />
                Entretiempo
              </span>
              <button
                onClick={handleIniciar2T}
                disabled={actionLoading}
                className="bg-bl/80 text-white text-[10px] font-semibold px-2.5 py-1 rounded hover:bg-bl transition-colors disabled:opacity-50"
              >
                {actionLoading ? "..." : "▶ Iniciar 2T"}
              </button>
            </>
          )}

          {phase === "2t_running" && (
            <>
              <span className="inline-flex items-center gap-1 text-[10px] text-bl">
                <span className="w-1.5 h-1.5 rounded-full bg-bl animate-pulse" />
                2T En vivo
              </span>
              <button
                onClick={handleCerrar}
                disabled={actionLoading}
                className="bg-rd/80 text-white text-[10px] font-semibold px-2.5 py-1 rounded hover:bg-rd transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Cerrando..." : "⏹ Cerrar Partido"}
              </button>
            </>
          )}
        </div>
      </footer>
    </main>
  );
}
