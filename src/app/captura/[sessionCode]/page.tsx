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
import { IncidenciaForm } from "@/components/capture/incidencia-form";
import { LiveFeed } from "@/components/capture/live-feed";
import { useRealtimeEventos } from "@/hooks/use-realtime-eventos";
import { useSessionParticipants } from "@/hooks/use-session-participants";

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
  const sessionId = useCaptureStore((s) => s.sessionId);

  const [joining, setJoining] = useState(true);
  const [error, setError] = useState(false);
  const [closing, setClosing] = useState(false);
  const [periodo, setPeriodo] = useState<"1T" | "2T">("1T");
  const [showParticipants, setShowParticipants] = useState(false);
  const partidoId = useCaptureStore((s) => s.partidoId);
  const realtimeEvents = useRealtimeEventos(partidoId);
  const participants = useSessionParticipants(sessionId);

  const handleCerrar = async () => {
    if (!confirm("¿Cerrar partido? Se marcará como finalizado.")) return;
    setClosing(true);
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
                <span className="text-[10px] text-dk-4 uppercase tracking-wider">
                  {matchInfo.division}
                </span>
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

        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="flex bg-dk-2 rounded-full p-0.5">
            <button
              onClick={() => setPeriodo("1T")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                periodo === "1T" ? "bg-nv-light text-white" : "text-dk-4"
              }`}
            >
              1T
            </button>
            <button
              onClick={() => setPeriodo("2T")}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-all ${
                periodo === "2T" ? "bg-nv-light text-white" : "text-dk-4"
              }`}
            >
              2T
            </button>
          </div>

          {/* Events count */}
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

      {/* Participants bar */}
      {participants.length > 0 && (
        <div
          className="bg-dk-2 border-b border-dk-3 px-4 py-1.5 flex items-center gap-2 cursor-pointer"
          onClick={() => setShowParticipants(!showParticipants)}
        >
          <div className="flex -space-x-1.5">
            {participants.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                className="w-5 h-5 rounded-full bg-nv-light border border-dk-3 flex items-center justify-center text-[8px] font-bold"
                title={p.display_name}
                style={{ zIndex: 5 - i }}
              >
                {p.display_name.charAt(0).toUpperCase()}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="w-5 h-5 rounded-full bg-dk-3 border border-dk-3 flex items-center justify-center text-[8px] font-bold text-dk-4">
                +{participants.length - 5}
              </div>
            )}
          </div>
          <span className="text-[10px] text-dk-4">
            {participants.length} capturando
          </span>
          {showParticipants && (
            <div className="flex gap-1.5 flex-wrap ml-2">
              {participants.map((p) => (
                <span key={p.id} className="text-[9px] bg-dk-3 text-dk-4 px-2 py-0.5 rounded-full">
                  {p.display_name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main capture area */}
      {step === "modulo" && <ModuleGrid />}
      {step === "perspectiva" && <PerspectivaPicker />}
      {step === "motivo" && <MotivoPicker />}
      {step === "resultado" && <ResultadoPicker />}
      {step === "detalle" && <DetallePicker />}
      {step === "incidencia" && <IncidenciaForm />}
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
          <span className="inline-flex items-center gap-1 text-[10px] text-gn">
            <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" />
            En vivo · {periodo}
          </span>
          <button
            onClick={handleCerrar}
            disabled={closing}
            className="bg-rd/80 text-white text-[10px] font-semibold px-2.5 py-1 rounded hover:bg-rd transition-colors disabled:opacity-50"
          >
            {closing ? "Cerrando..." : "Cerrar Partido"}
          </button>
        </div>
      </footer>
    </main>
  );
}
