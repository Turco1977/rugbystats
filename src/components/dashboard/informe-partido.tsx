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

const POSITIVE_RESULTS = new Set([
  "obtenido", "obtenida", "puntos", "eficiente", "robado", "recuperada", "ganado",
]);

function str(val: unknown): string {
  return typeof val === "string" ? val : "";
}

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
    day: "numeric", month: "long", year: "numeric",
  });
}

function ScoreByHalf({ partido, eventos }: { partido: PartidoData; eventos: Evento[] }) {
  // Estimate score per half from penales (each +3) — approximate
  const pen1T = eventos.filter((e) => e.modulo === "PENALES" && e.tiempo === "1T").length;
  const pen2T = eventos.filter((e) => e.modulo === "PENALES" && e.tiempo === "2T").length;
  const totalFinal = partido.puntos_local;
  const from2T = pen2T * 3;
  const from1T = pen1T * 3;
  const approxLocal1T = from1T;
  const approxLocal2T = totalFinal - approxLocal1T;

  if (!partido.tiempo_inicio_1t) return null;
  return (
    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
      <span>1T: <strong className="text-gray-700">{approxLocal1T > 0 ? `≈${approxLocal1T}` : "—"}</strong></span>
      <span className="text-gray-300">→</span>
      <span>2T: <strong className="text-gray-700">{approxLocal2T > 0 ? `≈${approxLocal2T}` : "—"}</strong></span>
      <span className="text-gray-300">|</span>
      <span>1T: <strong className="text-gray-500">{calcDuration(partido.tiempo_inicio_1t, partido.tiempo_fin_1t)}</strong></span>
      {partido.tiempo_inicio_2t && (
        <span>2T: <strong className="text-gray-500">{calcDuration(partido.tiempo_inicio_2t, partido.tiempo_fin_2t)}</strong></span>
      )}
    </div>
  );
}

export function InformePartido({ partido, eventos }: Props) {
  const informeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const localName = partido.equipo_local?.name || "Local";
  const visitanteName = partido.equipo_visitante?.name || "Visitante";

  // Filter non-incidencia events
  const matchEvents = eventos.filter((e) => e.modulo !== "INCIDENCIA");
  const incidencias = eventos.filter((e) => e.modulo === "INCIDENCIA");

  // Per-module stats
  const moduleStats = MODULE_CONFIG.map((mod) => {
    const modEvents = matchEvents.filter((e) => e.modulo === mod.id);
    const hasPerspective = mod.hasPerspective !== false;
    const propioEvents = hasPerspective
      ? modEvents.filter((e) => e.perspectiva === "propio")
      : modEvents;
    const rivalEvents = hasPerspective
      ? modEvents.filter((e) => e.perspectiva === "rival")
      : [];

    const ganados = propioEvents.filter((e) => isPositive(str(e.data?.resultado), mod.id));
    const perdidos = propioEvents.filter((e) => !isPositive(str(e.data?.resultado), mod.id));
    const efectividad = propioEvents.length > 0
      ? Math.round((ganados.length / propioEvents.length) * 100)
      : null;

    // Motivo breakdown
    const motivoMap: Record<string, { g: number; p: number }> = {};
    propioEvents.forEach((e) => {
      const m = str(e.data?.motivo) || "?";
      if (!motivoMap[m]) motivoMap[m] = { g: 0, p: 0 };
      if (isPositive(str(e.data?.resultado), mod.id)) motivoMap[m].g++;
      else motivoMap[m].p++;
    });

    // 1T/2T split
    const ev1T = propioEvents.filter((e) => e.tiempo === "1T").length;
    const ev2T = propioEvents.filter((e) => e.tiempo === "2T").length;

    return {
      mod,
      total: modEvents.length,
      propio: propioEvents.length,
      rival: rivalEvents.length,
      ganados: ganados.length,
      perdidos: perdidos.length,
      efectividad,
      motivoMap,
      ev1T,
      ev2T,
      hasPerspective,
    };
  }).filter((s) => s.total > 0);

  // Best/worst module
  const modulesWithEfec = moduleStats.filter((s) => s.efectividad !== null);
  const bestMod = modulesWithEfec.length > 0
    ? modulesWithEfec.reduce((a, b) => (a.efectividad! > b.efectividad! ? a : b))
    : null;
  const worstMod = modulesWithEfec.length > 0
    ? modulesWithEfec.reduce((a, b) => (a.efectividad! < b.efectividad! ? a : b))
    : null;

  // Timeline: all events sorted by timestamp, grouped by 1T/2T
  const sortedEvents = [...matchEvents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const events1T = sortedEvents.filter((e) => e.tiempo === "1T");
  const events2T = sortedEvents.filter((e) => e.tiempo === "2T");

  const INCIDENCIA_TYPES: Record<string, { icon: string; label: string }> = {
    tarjeta_roja: { icon: "🟥", label: "Tarjeta Roja" },
    tarjeta_amarilla: { icon: "🟨", label: "Tarjeta Amarilla" },
    lesion: { icon: "🏥", label: "Lesión" },
    publico: { icon: "👥", label: "Público" },
    disciplina: { icon: "⚠️", label: "Disciplina" },
  };

  async function exportPDF() {
    if (!informeRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(informeRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let yPos = 0;
      let remaining = imgHeight;

      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, -yPos, imgWidth, imgHeight);
        remaining -= pageHeight;
        yPos += pageHeight;
        if (remaining > 0) pdf.addPage();
      }

      const filename = `Informe_${localName}_vs_${visitanteName}_${partido.division}${partido.rama || ""}.pdf`;
      pdf.save(filename);
    } finally {
      setExporting(false);
    }
  }

  function shareWhatsApp() {
    const text = `*Informe de Partido — Los Tordos RC*\n${partido.division} ${partido.rama || ""}\n\n*${localName} ${partido.puntos_local} — ${partido.puntos_visitante} ${visitanteName}*\n\nTotal eventos: ${matchEvents.length}\n${bestMod ? `Mejor módulo: ${bestMod.mod.label} (${bestMod.efectividad}%)` : ""}\n${worstMod && worstMod !== bestMod ? `Módulo a mejorar: ${worstMod.mod.label} (${worstMod.efectividad}%)` : ""}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  return (
    <div>
      {/* Action buttons */}
      <div className="flex gap-2 mb-4 no-print">
        <button
          onClick={exportPDF}
          disabled={exporting}
          className="flex items-center gap-2 bg-nv text-white text-xs font-bold px-4 py-2.5 rounded hover:bg-nv-light transition-colors disabled:opacity-50"
        >
          📄 {exporting ? "Exportando..." : "Exportar PDF"}
        </button>
        <button
          onClick={shareWhatsApp}
          className="flex items-center gap-2 bg-[#25D366] text-white text-xs font-bold px-4 py-2.5 rounded hover:bg-[#1ebe5d] transition-colors"
        >
          💬 Compartir WhatsApp
        </button>
      </div>

      {/* Informe content (captured for PDF) */}
      <div
        ref={informeRef}
        className="bg-white rounded-lg overflow-hidden"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
      >
        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)" }} className="px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 relative flex-shrink-0">
                <Image
                  src="/logo-tordos.png"
                  alt="Los Tordos RC"
                  fill
                  className="object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div>
                <p className="text-white/70 text-[10px] font-semibold uppercase tracking-widest">Los Tordos Rugby Club</p>
                <p className="text-white text-[11px] font-bold">Informe de Partido</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-[10px]">{partido.division} {partido.rama || ""}</p>
              {partido.jornada && (
                <p className="text-white/70 text-[10px]">{partido.jornada.name}</p>
              )}
              {partido.jornada?.date && (
                <p className="text-white text-[11px] font-semibold">{formatDate(partido.jornada.date)}</p>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="mt-5 text-center">
            <div className="flex items-center justify-center gap-6">
              <div className="text-right flex-1">
                <p className="text-white font-bold text-sm leading-tight">{localName}</p>
                <p className="text-white/60 text-[10px]">Local</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold text-white">{partido.puntos_local}</span>
                <span className="text-white/40 text-2xl">—</span>
                <span className="text-4xl font-extrabold text-white">{partido.puntos_visitante}</span>
              </div>
              <div className="text-left flex-1">
                <p className="text-white font-bold text-sm leading-tight">{visitanteName}</p>
                <p className="text-white/60 text-[10px]">Visitante</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2">
              {partido.tiempo_inicio_1t && (
                <span className="text-white/60 text-[10px]">1T: {calcDuration(partido.tiempo_inicio_1t, partido.tiempo_fin_1t)}</span>
              )}
              {partido.tiempo_inicio_2t && (
                <span className="text-white/60 text-[10px]">2T: {calcDuration(partido.tiempo_inicio_2t, partido.tiempo_fin_2t)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* Resumen ejecutivo */}
          <div>
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resumen</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-center border border-gray-100">
                <p className="text-2xl font-extrabold text-[#0A1628]">{matchEvents.length}</p>
                <p className="text-[9px] text-gray-400 font-semibold uppercase">Eventos</p>
              </div>
              {bestMod && (
                <div className="bg-green-50 rounded-lg px-3 py-2.5 text-center border border-green-100">
                  <p className="text-lg font-extrabold text-green-700">{bestMod.efectividad}%</p>
                  <p className="text-[9px] text-green-500 font-semibold uppercase">Mejor: {bestMod.mod.label}</p>
                </div>
              )}
              {worstMod && worstMod !== bestMod && (
                <div className="bg-red-50 rounded-lg px-3 py-2.5 text-center border border-red-100">
                  <p className="text-lg font-extrabold text-red-600">{worstMod.efectividad}%</p>
                  <p className="text-[9px] text-red-400 font-semibold uppercase">A mejorar: {worstMod.mod.label}</p>
                </div>
              )}
            </div>
          </div>

          {/* Module summary table */}
          <div>
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resumen por Módulo</h2>
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Módulo</th>
                    <th className="text-center px-2 py-2 text-[9px] font-bold text-gray-400 uppercase">Total</th>
                    <th className="text-center px-2 py-2 text-[9px] font-bold text-gray-400 uppercase">Propio</th>
                    <th className="text-center px-2 py-2 text-[9px] font-bold text-gray-400 uppercase">Rival</th>
                    <th className="text-center px-2 py-2 text-[9px] font-bold text-gray-400 uppercase">1T</th>
                    <th className="text-center px-2 py-2 text-[9px] font-bold text-gray-400 uppercase">2T</th>
                    <th className="text-right px-3 py-2 text-[9px] font-bold text-gray-400 uppercase">Efec.</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleStats.map((s, i) => (
                    <tr key={s.mod.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{s.mod.icon}</span>
                          <span className="font-semibold text-[#0A1628]">{s.mod.label}</span>
                        </div>
                      </td>
                      <td className="text-center px-2 py-2.5 font-bold text-[#0A1628]">{s.total}</td>
                      <td className="text-center px-2 py-2.5 text-green-700 font-semibold">{s.propio || s.total}</td>
                      <td className="text-center px-2 py-2.5 text-red-600 font-semibold">{s.rival}</td>
                      <td className="text-center px-2 py-2.5 text-gray-500">{s.ev1T}</td>
                      <td className="text-center px-2 py-2.5 text-gray-500">{s.ev2T}</td>
                      <td className="text-right px-3 py-2.5">
                        {s.efectividad !== null ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${s.efectividad}%`,
                                  background: s.efectividad >= 70 ? "#10B981" : s.efectividad >= 50 ? "#F59E0B" : "#C8102E",
                                }}
                              />
                            </div>
                            <span
                              className="text-xs font-bold w-8 text-right"
                              style={{ color: s.efectividad >= 70 ? "#059669" : s.efectividad >= 50 ? "#92400E" : "#C8102E" }}
                            >
                              {s.efectividad}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-module detail */}
          <div>
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detalle por Módulo</h2>
            <div className="space-y-3">
              {moduleStats.map((s) => (
                <div key={s.mod.id} className="border border-gray-100 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span>{s.mod.icon}</span>
                      <span className="font-bold text-[#0A1628] text-sm">{s.mod.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="text-green-600 font-semibold">{s.ganados} ✓</span>
                      <span className="text-red-500 font-semibold">{s.perdidos} ✗</span>
                      {s.efectividad !== null && (
                        <span
                          className="font-bold px-2 py-0.5 rounded text-white text-[10px]"
                          style={{ background: s.efectividad >= 70 ? "#10B981" : s.efectividad >= 50 ? "#F59E0B" : "#C8102E" }}
                        >
                          {s.efectividad}%
                        </span>
                      )}
                    </div>
                  </div>
                  {Object.keys(s.motivoMap).length > 0 && (
                    <div className="px-4 py-3">
                      <div className="space-y-2">
                        {s.mod.motivos.map((m) => {
                          const entry = s.motivoMap[m.key];
                          if (!entry) return null;
                          const total = entry.g + entry.p;
                          const pct = total > 0 ? Math.round((entry.g / total) * 100) : 0;
                          return (
                            <div key={m.key}>
                              <div className="flex items-center justify-between mb-0.5 text-[11px]">
                                <span className="text-gray-600 font-medium">{m.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-green-600 font-semibold">{entry.g}✓</span>
                                  <span className="text-red-500 font-semibold">{entry.p}✗</span>
                                  <span className="text-gray-400 w-8 text-right">{pct}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${pct}%`,
                                    background: pct >= 70 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#C8102E",
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Timeline del Partido</h2>
            <div className="space-y-4">
              {[{ label: "Primer Tiempo", events: events1T, color: "#10B981" }, { label: "Segundo Tiempo", events: events2T, color: "#3B82F6" }].map(({ label, events, color }) => (
                events.length > 0 && (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded text-white text-center" style={{ background: color }}>
                        {label}
                      </span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>
                    <div className="space-y-1.5 pl-3 border-l-2" style={{ borderColor: color + "40" }}>
                      {events.map((ev) => {
                        const mod = MODULE_CONFIG.find((m) => m.id === ev.modulo);
                        const motivo = mod?.motivos.find((m) => m.key === str(ev.data?.motivo));
                        const resultado = str(ev.data?.resultado);
                        const positive = isPositive(resultado, ev.modulo);
                        const time = new Date(ev.timestamp).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                        return (
                          <div key={ev.id} className="flex items-center gap-2 text-[10px]">
                            <span className="text-gray-300 w-9 flex-shrink-0">{time}</span>
                            <span className="flex-shrink-0">{mod?.icon}</span>
                            <span className="font-semibold text-gray-600">{mod?.label}</span>
                            {ev.perspectiva === "rival" && (
                              <span className="text-red-400 text-[9px] font-bold">rival</span>
                            )}
                            {motivo && (
                              <span className="text-gray-400">· {motivo.label}</span>
                            )}
                            <span
                              className="ml-auto font-bold flex-shrink-0"
                              style={{ color: positive ? "#059669" : "#C8102E" }}
                            >
                              {positive ? "✓" : "✗"} {resultado.replace(/_/g, " ")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Incidencias */}
          <div>
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Incidencias</h2>
            {incidencias.length === 0 ? (
              <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-3 flex items-center gap-2">
                <span>✅</span>
                <span className="text-green-700 text-xs font-semibold">Sin incidencias en el partido</span>
              </div>
            ) : (
              <div className="space-y-2">
                {incidencias.map((ev) => {
                  const tipo = str(ev.data?.tipo) || str(ev.data?.motivo) || "otro";
                  const inc = INCIDENCIA_TYPES[tipo] || { icon: "📋", label: tipo };
                  const nombre = str(ev.data?.nombre);
                  const descripcion = str(ev.data?.descripcion) || str(ev.data?.resultado);
                  const borderColor = tipo === "tarjeta_roja" ? "#FCA5A5"
                    : tipo === "tarjeta_amarilla" ? "#FDE68A"
                    : tipo === "lesion" ? "#93C5FD"
                    : "#E5E7EB";
                  const bgColor = tipo === "tarjeta_roja" ? "#FEE2E2"
                    : tipo === "tarjeta_amarilla" ? "#FEF3C7"
                    : tipo === "lesion" ? "#DBEAFE"
                    : "#F9FAFB";

                  return (
                    <div key={ev.id} className="rounded-lg border px-4 py-3 flex items-start gap-2"
                      style={{ borderColor, backgroundColor: bgColor }}>
                      <span className="text-lg flex-shrink-0">{inc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">{inc.label}</span>
                          {nombre && <span className="text-xs text-gray-600">— {nombre}</span>}
                          {ev.tiempo && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
                              style={{ background: ev.tiempo === "1T" ? "#10B981" : "#3B82F6" }}>
                              {ev.tiempo}
                            </span>
                          )}
                        </div>
                        {descripcion && descripcion !== tipo && (
                          <p className="text-[11px] text-gray-500 mt-0.5">{descripcion}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 relative">
                <Image
                  src="/logo-tordos.png"
                  alt="Los Tordos RC"
                  fill
                  className="object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <span className="text-[9px] text-gray-400 font-medium">Los Tordos Rugby Club</span>
            </div>
            <span className="text-[9px] text-gray-300">Rugby Stats — Sistema de Estadísticas</span>
          </div>

        </div>
      </div>
    </div>
  );
}
