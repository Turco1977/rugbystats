"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/dashboard/match-card";
import { CreateMatchModal } from "@/components/dashboard/create-match-modal";
import { generateSessionCode } from "@/lib/utils/session-code";
import type { Division, PartidoStatus } from "@/lib/types/domain";

interface PartidoRow {
  id: string;
  division: Division;
  status: PartidoStatus;
  puntos_local: number;
  puntos_visitante: number;
  equipo_local: { id: string; name: string; short_name: string } | null;
  equipo_visitante: { id: string; name: string; short_name: string } | null;
  sessions: { code: string; is_active: boolean }[];
}

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://rugbystats-five.vercel.app";

export default function EntrenadorPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-dk-1 flex items-center justify-center"><p className="text-dk-4 animate-pulse">Cargando...</p></div>}>
      <EntrenadorPage />
    </Suspense>
  );
}

function EntrenadorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const division = searchParams.get("div") || "M19";

  const [partidos, setPartidos] = useState<PartidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/");
        return;
      }
      setUserEmail(data.user.email || "");
    });
  }, [router]);

  const fetchPartidos = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("partidos")
        .select(`
          id, division, status, puntos_local, puntos_visitante,
          equipo_local:teams!equipo_local_id(id, name, short_name),
          equipo_visitante:teams!equipo_visitante_id(id, name, short_name),
          sessions(code, is_active)
        `)
        .eq("division", division)
        .in("status", ["live", "scheduled"])
        .order("status")
        .order("created_at", { ascending: false });
      if (data) setPartidos(data as unknown as PartidoRow[]);
    } catch {
      // No connection
    } finally {
      setLoading(false);
    }
  }, [division]);

  useEffect(() => {
    fetchPartidos();
  }, [fetchPartidos]);

  const livePartidos = partidos.filter((p) => p.status === "live");
  const scheduledPartidos = partidos.filter((p) => p.status === "scheduled");

  const handleStartSession = async (partidoId: string) => {
    const supabase = createClient();
    const code = generateSessionCode();
    await supabase.from("sessions").insert({
      partido_id: partidoId,
      code,
      created_by: userEmail || "Entrenador",
    });
    await supabase.from("partidos").update({ status: "live" }).eq("id", partidoId);
    fetchPartidos();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleWhatsApp = (code: string, local: string, visitante: string) => {
    const text = `Unite a capturar el partido ${division} ${local} vs ${visitante}. Código: ${code}. Entrá: ${APP_URL}/captura`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-dk-1 text-white">
      {/* Header */}
      <header className="bg-nv px-4 py-3 flex items-center justify-between shadow-card-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg">
            🏉
          </div>
          <div>
            <p className="text-base font-bold">Entrenador {division}</p>
            <p className="text-[10px] text-dk-4">{userEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="bg-gn text-white text-sm font-semibold px-4 py-2 rounded-md hover:bg-gn-dark transition-colors"
          >
            + Crear Partido
          </button>
          <button onClick={handleLogout} className="text-xs text-dk-4 hover:text-rd-light">
            Salir
          </button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3">
            <p className="text-xs text-dk-4 font-semibold uppercase tracking-wider">En vivo</p>
            <p className="text-3xl font-extrabold text-gn mt-1">{livePartidos.length}</p>
          </div>
          <div className="bg-dk-2 rounded-lg border border-white/10 px-4 py-3">
            <p className="text-xs text-dk-4 font-semibold uppercase tracking-wider">Programados</p>
            <p className="text-3xl font-extrabold text-bl mt-1">{scheduledPartidos.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-dk-2 rounded-lg border border-white/10 text-center py-10">
            <p className="text-dk-4 animate-pulse">Cargando partidos {division}...</p>
          </div>
        ) : (
          <>
            {/* Live */}
            {livePartidos.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-dk-4 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gn animate-pulse" />
                  Partidos en vivo — {division}
                </h3>
                <div className="space-y-4">
                  {livePartidos.map((p) => {
                    const activeSession = p.sessions?.find((s) => s.is_active);
                    const localName = p.equipo_local?.short_name || "Tordos";
                    const visitanteName = p.equipo_visitante?.short_name || "Rival";
                    return (
                      <div key={p.id} className="bg-dk-2 rounded-lg border border-white/10 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="bg-nv text-white text-xs font-bold px-2.5 py-0.5 rounded-sm">{p.division}</span>
                          <span className="text-xs text-gn font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gn animate-pulse" /> En vivo
                          </span>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold">{localName}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-extrabold">{p.puntos_local}</span>
                            <span className="text-dk-4">—</span>
                            <span className="text-xl font-extrabold">{p.puntos_visitante}</span>
                          </div>
                          <span className="text-sm font-semibold">{visitanteName}</span>
                        </div>
                        {activeSession?.code && (
                          <div className="space-y-2">
                            <a
                              href={`/captura/${activeSession.code}?name=Entrenador ${division}`}
                              className="block w-full bg-gn text-white text-sm font-bold py-3 rounded-md text-center hover:bg-gn-dark transition-colors"
                            >
                              Capturar en Vivo
                            </a>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleCopyCode(activeSession.code)}
                                className="bg-nv-light text-white text-xs font-semibold py-2 rounded hover:bg-nv transition-colors"
                              >
                                {copiedCode === activeSession.code ? "Copiado!" : `Código: ${activeSession.code}`}
                              </button>
                              <button
                                onClick={() => handleWhatsApp(activeSession.code, localName, visitanteName)}
                                className="bg-[#25D366] text-white text-xs font-semibold py-2 rounded hover:bg-[#20bd5a] transition-colors flex items-center justify-center gap-1"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Scheduled */}
            {scheduledPartidos.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-dk-4 uppercase tracking-wider mb-3">
                  Próximos partidos — {division}
                </h3>
                <div className="space-y-4">
                  {scheduledPartidos.map((p) => (
                    <div key={p.id} className="bg-dk-2 rounded-lg border border-white/10 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">
                          {p.equipo_local?.short_name || "Tordos"} vs {p.equipo_visitante?.short_name || "Rival"}
                        </span>
                        <span className="text-xs text-dk-4">Programado</span>
                      </div>
                      <button
                        onClick={() => handleStartSession(p.id)}
                        className="w-full bg-gn text-white text-sm font-bold py-2.5 rounded-md hover:bg-gn-dark transition-colors"
                      >
                        Iniciar Sesión de Captura
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty */}
            {partidos.length === 0 && (
              <div className="bg-dk-2 rounded-lg border border-white/10 text-center py-14">
                <p className="text-3xl mb-3">🏉</p>
                <p className="text-dk-4 font-semibold">No hay partidos {division} activos</p>
                <p className="text-dk-3 text-sm mt-1 mb-4">Creá un partido para empezar a capturar.</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="bg-gn text-white text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-gn-dark transition-colors"
                >
                  + Crear Partido
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CreateMatchModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchPartidos}
      />
    </main>
  );
}
