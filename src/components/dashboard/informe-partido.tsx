"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { MODULE_CONFIG } from "@/lib/constants/modules";

interface Evento {
  id: string;
  modulo: string;
  perspectiva: string;
  data: Record<string, unknown>;
  timestamp: string;
  tiempo: string;
  numero: number;
}

interface PartidoData {
  id: string;
  division: string;
  rama: string;
  status: string;
  puntos_local: number;
  puntos_visitante: number;
  tiempo_actual: string;
  tiempo_inicio_1t: string | null;
  tiempo_fin_1t: string | null;
  tiempo_inicio_2t: string | null;
  tiempo_fin_2t: string | null;
  equipo_local: { name: string; short_name: string } | null;
  equipo_visitante: { name: string; short_name: string } | null;
  jornada?: { name: string; date: string } | null;
}

interface Props {
  partido: PartidoData;
  eventos: Evento[];
}

function str(val: unknown): string {
  return typeof val === "string" ? val : "";
}

const POSITIVE_RESULTS = new Set([
  "obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado",
]);

function isPositive(resultado: string, modulo: string): boolean {
  if (modulo === "DEFENSA") return resultado === "recuperada";
  if (modulo === "PENALES") return true;
  return POSITIVE_RESULTS.has(resultado);
}

function calcDuration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const mins = Math.round((e.getTime() - s.getTime()) / 60000);
  return `${mins}'`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LINE:    { bg: "bg-bl/10",   text: "text-bl",       border: "border-bl/30" },
  SCRUM:   { bg: "bg-rd/10",   text: "text-rd",       border: "border-rd/30" },
  SALIDA:  { bg: "bg-yl/10",   text: "text-yl",       border: "border-yl/30" },
  ATAQUE:  { bg: "bg-gn-bg",   text: "text-gn-forest",border: "border-gn/30" },
  DEFENSA: { bg: "bg-pr-bg",   text: "text-pr",       border: "border-pr/30" },
  PIE:     { bg: "bg-nv/5",    text: "text-nv",       border: "border-nv/20" },
  PENALES: { bg: "bg-or-bg",   text: "text-or-dark",  border: "border-or/30" },
};

const INCIDENCIA_TYPES: Record<string, { icon: string; label: string; bg: string; border: string; text: string }> = {
  tarjeta_roja:     { icon: "🟥", label: "Tarjeta Roja",    bg: "bg-rd-bg",  border: "border-rd/40",  text: "text-rd" },
  tarjeta_amarilla: { icon: "🟨", label: "Tarjeta Amarilla", bg: "bg-yl/10",  border: "border-yl/40",  text: "text-yl-dark" },
  lesion:           { icon: "🏥", label: "Lesión",           bg: "bg-bl-bg",  border: "border-bl/40",  text: "text-bl-dark" },
  publico:          { icon: "👥", label: "Público",          bg: "bg-g-1",    border: "border-g-2",    text: "text-g-5" },
  disciplina:       { icon: "⚠️", label: "Disciplina",       bg: "bg-yl/10",  border: "border-yl/40",  text: "text-yl-dark" },
};

export function InformePartido({ partido, eventos }: Props) {
  const informeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const localName = partido.equipo_local?.name || "Local";
  const visitanteName = partido.equipo_visitante?.name || "Visitante";
  const ganamos = partido.puntos_local > partido.puntos_visitante;
  const empate = partido.puntos_local === partido.puntos_visitante;

  const matchEvents = eventos.filter((e) => e.modulo !== "INCIDENCIA");
  const incidencias = eventos.filter((e) => e.modulo === "INCIDENCIA");

  interface ModStat {
    mod: typeof MODULE_CONFIG[number];
    total: number; propio: number; rival: number;
    ganados: number; perdidos: number;
    efectividad: number | null;
    motivoMap: Record<string, { g: number; p: number }>;
    ev1T: number; ev2T: number;
  }

  // Per-module stats
  const moduleStats: ModStat[] = MODULE_CONFIG.flatMap((mod) => {
    const modEvents = matchEvents.filter((e) => e.modulo === mod.id);
    if (modEvents.length === 0) return [];
    const hasPerspective = mod.hasPerspective !== false;
    const propioEvents = hasPerspective ? modEvents.filter((e) => e.perspectiva === "propio") : modEvents;
    const rivalEvents  = hasPerspective ? modEvents.filter((e) => e.perspectiva === "rival") : [];
    const ganados = propioEvents.filter((e) => isPositive(str(e.data?.resultado), mod.id));
    const perdidos = propioEvents.filter((e) => !isPositive(str(e.data?.resultado), mod.id));
    const efectividad = propioEvents.length > 0 ? Math.round((ganados.length / propioEvents.length) * 100) : null;
    const motivoMap: Record<string, { g: number; p: number }> = {};
    propioEvents.forEach((e) => {
      const m = str(e.data?.motivo) || "?";
      if (!motivoMap[m]) motivoMap[m] = { g: 0, p: 0 };
      if (isPositive(str(e.data?.resultado), mod.id)) motivoMap[m].g++;
      else motivoMap[m].p++;
    });
    const ev1T = propioEvents.filter((e) => e.tiempo === "1T").length;
    const ev2T = propioEvents.filter((e) => e.tiempo === "2T").length;
    return [{ mod, total: modEvents.length, propio: propioEvents.length, rival: rivalEvents.length, ganados: ganados.length, perdidos: perdidos.length, efectividad, motivoMap, ev1T, ev2T }];
  });

  // Best / worst
  const withEfec = moduleStats.filter((s) => s.efectividad !== null);
  const bestMod  = withEfec.length > 0 ? withEfec.reduce((a, b) => a.efectividad! > b.efectividad! ? a : b) : null;
  const worstMod = withEfec.length > 1 ? withEfec.reduce((a, b) => a.efectividad! < b.efectividad! ? a : b) : null;

  // Timeline
  const sorted = [...matchEvents].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const events1T = sorted.filter((e) => e.tiempo === "1T");
  const events2T = sorted.filter((e) => e.tiempo === "2T");

  async function exportPDF() {
    if (!informeRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(informeRef.current, { scale: 2, useCORS: true, backgroundColor: "#F7F8FA", logging: false });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let yPos = 0, remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, -yPos, pageW, imgH);
        remaining -= pageH; yPos += pageH;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(`Informe_${localName}_vs_${visitanteName}_${partido.division}.pdf`);
    } finally { setExporting(false); }
  }

  function shareWhatsApp() {
    const resultado = ganamos ? "✅ Victoria" : empate ? "🤝 Empate" : "❌ Derrota";
    const lines = [
      `*🏉 Informe de Partido — Los Tordos RC*`,
      `${partido.division} ${partido.rama || ""}`,
      ``,
      `*${localName} ${partido.puntos_local} — ${partido.puntos_visitante} ${visitanteName}*`,
      resultado,
      ``,
      `📊 *Estadísticas:*`,
      ...moduleStats.map((s) => `${s.mod.icon} ${s.mod.label}: ${s.propio} propio${s.efectividad !== null ? ` (${s.efectividad}%)` : ""}`),
      incidencias.length > 0 ? `\n⚠️ Incidencias: ${incidencias.length}` : `\n✅ Sin incidencias`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  const efecColor = (pct: number | null) =>
    pct === null ? "" : pct >= 70 ? "text-gn-forest" : pct >= 50 ? "text-yl-dark" : "text-rd";
  const efecBg = (pct: number | null) =>
    pct === null ? "" : pct >= 70 ? "bg-gn" : pct >= 50 ? "bg-yl" : "bg-rd";

  return (
    <div>
      {/* Action buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="flex items-center gap-2 bg-nv text-white text-xs font-bold px-4 py-2.5 rounded hover:bg-nv-light transition-colors disabled:opacity-50"
        >
          📄 {exporting ? "Exportando..." : "Exportar PDF"}
        </button>
        <button
          onClick={shareWhatsApp}
          className="flex items-center gap-2 text-white text-xs font-bold px-4 py-2.5 rounded transition-colors"
          style={{ background: "#25D366" }}
        >
          💬 Compartir
        </button>
      </div>

      {/* ===== INFORME CONTENT ===== */}
      <div ref={informeRef} className="space-y-4">

        {/* HEADER CARD */}
        <div className="card overflow-hidden p-0">
          {/* Header gradient */}
          <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 relative flex-shrink-0">
                  <Image src="/logo-tordos.png" alt="LTRC" fill className="object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div>
                  <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Los Tordos Rugby Club</p>
                  <p className="text-white font-bold text-xs">Informe de Partido</p>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-white/10 text-white/80 text-[10px] font-bold px-2 py-1 rounded">
                  {partido.division} {partido.rama || ""}
                </span>
                {partido.jornada?.date && (
                  <p className="text-white/50 text-[9px] mt-1">{formatDate(partido.jornada.date)}</p>
                )}
              </div>
            </div>

            {/* Score */}
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <p className="text-white font-extrabold text-base leading-tight">{localName}</p>
                <p className="text-white/40 text-[9px] uppercase tracking-wider mt-0.5">Local</p>
              </div>
              <div className="flex flex-col items-center px-4">
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-extrabold text-white leading-none">{partido.puntos_local}</span>
                  <span className="text-white/30 text-2xl">—</span>
                  <span className="text-5xl font-extrabold text-white leading-none">{partido.puntos_visitante}</span>
                </div>
                <span className={`mt-2 text-[10px] font-bold px-3 py-0.5 rounded-pill ${
                  ganamos ? "bg-gn/20 text-gn-bright" : empate ? "bg-g-3/20 text-g-3" : "bg-rd/20 text-rd-light"
                }`}>
                  {ganamos ? "🏆 Victoria" : empate ? "🤝 Empate" : "❌ Derrota"}
                </span>
              </div>
              <div className="flex-1 text-center">
                <p className="text-white font-extrabold text-base leading-tight">{visitanteName}</p>
                <p className="text-white/40 text-[9px] uppercase tracking-wider mt-0.5">Visitante</p>
              </div>
            </div>
          </div>

          {/* Half times */}
          {partido.tiempo_inicio_1t && (
            <div className="flex items-center divide-x divide-g-2 border-t border-g-2">
              <div className="flex-1 flex items-center justify-center gap-2 py-2.5">
                <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-gn">1T</span>
                <span className="text-xs font-bold text-nv">{calcDuration(partido.tiempo_inicio_1t, partido.tiempo_fin_1t)}</span>
              </div>
              {partido.tiempo_inicio_2t && (
                <div className="flex-1 flex items-center justify-center gap-2 py-2.5">
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-bl">2T</span>
                  <span className="text-xs font-bold text-nv">{calcDuration(partido.tiempo_inicio_2t, partido.tiempo_fin_2t)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RESUMEN EJECUTIVO */}
        <div>
          <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-widest mb-2">Resumen</h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="card-compact text-center">
              <p className="text-3xl font-extrabold text-nv">{matchEvents.length}</p>
              <p className="text-[9px] text-g-4 font-semibold uppercase mt-0.5">Eventos</p>
            </div>
            {bestMod && (
              <div className="card-compact text-center border-gn/40 bg-gn-bg">
                <p className="text-xl font-extrabold text-gn-forest">{bestMod.mod.icon}</p>
                <p className="text-sm font-extrabold text-gn-forest">{bestMod.efectividad}%</p>
                <p className="text-[9px] text-gn font-semibold uppercase">Mejor · {bestMod.mod.label}</p>
              </div>
            )}
            {worstMod && worstMod !== bestMod && (
              <div className="card-compact text-center border-rd/40 bg-rd-bg">
                <p className="text-xl font-extrabold text-rd">{worstMod.mod.icon}</p>
                <p className="text-sm font-extrabold text-rd">{worstMod.efectividad}%</p>
                <p className="text-[9px] text-rd font-semibold uppercase">A mejorar · {worstMod.mod.label}</p>
              </div>
            )}
          </div>
        </div>

        {/* MÓDULOS — big visual cards */}
        <div>
          <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-widest mb-2">Estadísticas por Módulo</h3>
          <div className="space-y-3">
            {moduleStats.map((s) => {
              const colors = MODULE_COLORS[s.mod.id] || { bg: "bg-g-1", text: "text-nv", border: "border-g-2" };
              const pct = s.efectividad;
              return (
                <div key={s.mod.id} className="card p-0 overflow-hidden">
                  {/* Module header */}
                  <div className={`flex items-center justify-between px-4 py-3 ${colors.bg} border-b ${colors.border}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{s.mod.icon}</span>
                      <div>
                        <p className={`font-extrabold text-sm ${colors.text}`}>{s.mod.label}</p>
                        <p className="text-[9px] text-g-4">{s.total} eventos totales</p>
                      </div>
                    </div>
                    {pct !== null && (
                      <div className="text-right">
                        <p className={`text-2xl font-extrabold ${efecColor(pct)}`}>{pct}%</p>
                        <p className="text-[9px] text-g-4">efectividad</p>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 space-y-3">
                    {/* Propio / Rival / 1T / 2T pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="counter-pill bg-gn-bg text-gn-forest text-[10px]">✓ {s.ganados} ganados</span>
                      <span className="counter-pill bg-rd-bg text-rd text-[10px]">✗ {s.perdidos} perdidos</span>
                      {s.rival > 0 && <span className="counter-pill bg-g-1 text-g-5 text-[10px]">Rival: {s.rival}</span>}
                      <span className="counter-pill bg-g-1 text-g-4 text-[10px]">1T: {s.ev1T}</span>
                      <span className="counter-pill bg-g-1 text-g-4 text-[10px]">2T: {s.ev2T}</span>
                    </div>

                    {/* Efectividad bar */}
                    {pct !== null && (
                      <div className="h-2.5 rounded-full bg-g-1 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${efecBg(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}

                    {/* Motivo breakdown */}
                    {Object.keys(s.motivoMap).length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-g-2">
                        {s.mod.motivos.map((m) => {
                          const entry = s.motivoMap[m.key];
                          if (!entry) return null;
                          const total = entry.g + entry.p;
                          const mpct = total > 0 ? Math.round((entry.g / total) * 100) : 0;
                          return (
                            <div key={m.key}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[11px] font-semibold text-g-5">{m.label}</span>
                                <div className="flex items-center gap-2 text-[10px]">
                                  <span className="text-gn-forest font-bold">{entry.g}✓</span>
                                  <span className="text-rd font-bold">{entry.p}✗</span>
                                  <span className={`font-extrabold w-8 text-right ${efecColor(mpct)}`}>{mpct}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 rounded-full bg-g-1 overflow-hidden">
                                <div className={`h-full rounded-full ${efecBg(mpct)}`} style={{ width: `${mpct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TIMELINE */}
        <div>
          <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-widest mb-2">Timeline del Partido</h3>
          <div className="card p-0 overflow-hidden divide-y divide-g-2">
            {[
              { label: "Primer Tiempo", events: events1T, color: "bg-gn", textColor: "text-gn-bright" },
              { label: "Segundo Tiempo", events: events2T, color: "bg-bl", textColor: "text-bl" },
            ].map(({ label, events, color, textColor }) => events.length > 0 && (
              <div key={label}>
                {/* Half divider */}
                <div className={`flex items-center gap-3 px-4 py-2 bg-nv`}>
                  <span className={`text-[9px] font-extrabold uppercase tracking-widest ${textColor}`}>{label}</span>
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/40 text-[9px]">{events.length} eventos</span>
                </div>
                <div className="divide-y divide-g-2">
                  {events.map((ev) => {
                    const mod = MODULE_CONFIG.find((m) => m.id === ev.modulo);
                    const motivo = mod?.motivos.find((m) => m.key === str(ev.data?.motivo));
                    const resultado = str(ev.data?.resultado);
                    const positive = isPositive(resultado, ev.modulo);
                    const time = new Date(ev.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                    const colors = MODULE_COLORS[ev.modulo] || { bg: "bg-g-1", text: "text-nv", border: "" };
                    return (
                      <div key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-g-3 text-[10px] w-9 flex-shrink-0 font-mono">{time}</span>
                        <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                          <span className="text-sm">{mod?.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[11px] font-extrabold ${colors.text}`}>{mod?.label}</span>
                            {ev.perspectiva === "rival" && (
                              <span className="badge bg-rd-bg text-rd">rival</span>
                            )}
                            {motivo && (
                              <span className="text-[10px] text-g-4">· {motivo.label}</span>
                            )}
                          </div>
                        </div>
                        <span className={`text-[10px] font-extrabold flex-shrink-0 ${positive ? "text-gn-forest" : "text-rd"}`}>
                          {positive ? "✓" : "✗"} {resultado.replace(/_/g, " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* INCIDENCIAS */}
        <div>
          <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-widest mb-2">
            Incidencias {incidencias.length > 0 && <span className="text-rd">({incidencias.length})</span>}
          </h3>
          {incidencias.length === 0 ? (
            <div className="card flex items-center gap-3 py-4">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-gn-forest text-sm">Sin incidencias</p>
                <p className="text-[11px] text-g-4">El partido transcurrió sin novedad</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {incidencias.map((ev) => {
                const tipo = str(ev.data?.tipo) || str(ev.data?.motivo) || "otro";
                const inc = INCIDENCIA_TYPES[tipo] || { icon: "📋", label: tipo, bg: "bg-g-1", border: "border-g-2", text: "text-g-5" };
                const nombre = str(ev.data?.nombre);
                const descripcion = str(ev.data?.descripcion) || str(ev.data?.resultado);
                return (
                  <div key={ev.id} className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${inc.bg} ${inc.border}`}>
                    <span className="text-2xl flex-shrink-0 mt-0.5">{inc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-extrabold ${inc.text}`}>{inc.label}</span>
                        {nombre && <span className="text-xs font-semibold text-g-5">— {nombre}</span>}
                        {ev.tiempo && (
                          <span className={`badge ${ev.tiempo === "1T" ? "bg-gn text-white" : "bg-bl text-white"}`}>
                            {ev.tiempo}
                          </span>
                        )}
                      </div>
                      {descripcion && descripcion !== tipo && (
                        <p className="text-xs text-g-4 mt-0.5">{descripcion}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between py-3 border-t border-g-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 relative">
              <Image src="/logo-tordos.png" alt="LTRC" fill className="object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <span className="text-[10px] text-g-4 font-semibold">Los Tordos Rugby Club</span>
          </div>
          <span className="text-[9px] text-g-3">Rugby Stats</span>
        </div>

      </div>
    </div>
  );
}
