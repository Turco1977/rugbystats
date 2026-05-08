"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { MODULE_CONFIG } from "@/lib/constants/modules";

type ModConfig = typeof MODULE_CONFIG[number];

interface MotivStat {
  key: string;
  label: string;
  ganados: number;
  perdidos: number;
  total: number;
  pct: number;
}

interface PerMatchStat {
  label: string;
  value: number;
}

interface Props {
  moduleConfig: ModConfig;
  selectedDivision: string;
  selectedPerspective: "total" | "propio" | "rival";
  totalAll: number;
  totalPropio: number;
  totalRival: number;
  ganados: number;
  perdidos: number;
  ganadosPct: number;
  motivStats: MotivStat[];
  perMatchData: PerMatchStat[];
  onClose: () => void;
}

const efecColor = (pct: number) => pct >= 70 ? "#065F46" : pct >= 50 ? "#92400E" : "#C8102E";
const efecBg   = (pct: number) => pct >= 70 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#C8102E";

const PERSP_LABEL: Record<string, string> = {
  total: "Total (Propio + Rival)",
  propio: "Sólo Propio",
  rival: "Sólo Rival",
};

export function InformeModulo({
  moduleConfig, selectedDivision, selectedPerspective,
  totalAll, totalPropio, totalRival,
  ganados, perdidos, ganadosPct,
  motivStats, perMatchData, onClose,
}: Props) {
  const informeRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  async function exportPDF() {
    if (!informeRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(informeRef.current, {
        scale: 2, useCORS: true, backgroundColor: "#F7F8FA", logging: false,
      });
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
      pdf.save(`Informe_${moduleConfig.label}_${selectedDivision}.pdf`);
    } finally { setExporting(false); }
  }

  function shareWhatsApp() {
    const perspLabel = PERSP_LABEL[selectedPerspective];
    const lines = [
      `*🏉 Informe ${moduleConfig.label} — Los Tordos RC*`,
      `${selectedDivision} · ${perspLabel}`,
      ``,
      `📊 *Resumen:*`,
      `Total: ${totalAll}  |  Propio: ${totalPropio}  |  Rival: ${totalRival}`,
      ``,
      `✅ Efectividad: *${ganadosPct}%*`,
      `Ganados: ${ganados}  |  Perdidos: ${perdidos}`,
      ``,
      motivStats.length > 0 ? `📋 *Por motivo:*` : "",
      ...motivStats.map((m) => `${m.label}: ${m.ganados}✓ ${m.perdidos}✗ (${m.pct}%)`),
      perMatchData.length > 0 ? `\n📅 *Por partido:*` : "",
      ...perMatchData.map((p) => `${p.label}: ${p.value}%`),
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
  }

  const activeCount = selectedPerspective === "total" ? totalAll : selectedPerspective === "propio" ? totalPropio : totalRival;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4">
      <div className="w-full max-w-lg">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3">
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
          <button
            onClick={onClose}
            className="ml-auto flex items-center gap-1 text-white/70 text-xs font-bold px-3 py-2.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Informe */}
        <div ref={informeRef} className="bg-[#F7F8FA] rounded-xl overflow-hidden space-y-4 p-4">

          {/* HEADER */}
          <div className="rounded-xl overflow-hidden">
            <div className="px-5 py-4" style={{ background: "linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 relative flex-shrink-0">
                    <Image src="/logo-tordos.png" alt="LTRC" fill className="object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <div>
                    <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Los Tordos Rugby Club</p>
                    <p className="text-white font-bold text-xs">Informe de Módulo</p>
                  </div>
                </div>
                <span className="bg-white/10 text-white/80 text-[10px] font-bold px-2 py-1 rounded">
                  {selectedDivision}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{moduleConfig.icon}</span>
                <div>
                  <p className="text-white font-extrabold text-xl leading-tight">{moduleConfig.label}</p>
                  <p className="text-white/50 text-[10px]">{PERSP_LABEL[selectedPerspective]}</p>
                </div>
              </div>
            </div>
          </div>

          {/* TOTALES */}
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Totales</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total", value: totalAll, color: "#6366F1" },
                { label: "Propio", value: totalPropio, color: "#10B981" },
                { label: "Rival", value: totalRival, color: "#C8102E" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-lg px-3 py-3 text-center shadow-sm"
                  style={label === PERSP_LABEL[selectedPerspective]?.split(" ")[0] ? { outline: `2px solid ${color}` } : {}}>
                  <p className="text-[9px] font-bold uppercase" style={{ color }}>{label}</p>
                  <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* EFECTIVIDAD */}
          <div className="bg-white rounded-xl shadow-sm px-4 py-4">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Efectividad</p>
            <div className="flex items-center gap-4 mb-3">
              <p className="text-4xl font-extrabold" style={{ color: efecColor(ganadosPct) }}>{ganadosPct}%</p>
              <div className="flex-1">
                <div className="h-4 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${ganadosPct}%`, background: efecBg(ganadosPct) }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] font-bold text-green-700">✓ Ganados: {ganados}</span>
                  <span className="text-[10px] font-bold text-red-600">✗ Perdidos: {perdidos}</span>
                </div>
              </div>
            </div>
            <p className="text-[9px] text-gray-400">Sobre {activeCount} eventos</p>
          </div>

          {/* DESGLOSE POR MOTIVO */}
          {motivStats.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm px-4 py-4">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Desglose por Motivo</p>
              <div className="space-y-3">
                {motivStats.map((m) => (
                  <div key={m.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{m.label}</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="font-bold text-green-700">{m.ganados}✓</span>
                        <span className="font-bold text-red-600">{m.perdidos}✗</span>
                        <span className="font-extrabold w-8 text-right" style={{ color: efecColor(m.pct) }}>{m.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: efecBg(m.pct) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROGRESIÓN POR PARTIDO */}
          {perMatchData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm px-4 py-4">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3">Progresión por Partido</p>
              <div className="space-y-2">
                {perMatchData.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-500 w-28 truncate flex-shrink-0">{p.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.value}%`, background: efecBg(p.value) }} />
                    </div>
                    <span className="text-[10px] font-bold w-8 text-right" style={{ color: efecColor(p.value) }}>{p.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 relative">
                <Image src="/logo-tordos.png" alt="LTRC" fill className="object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <span className="text-[9px] text-gray-400 font-semibold">Los Tordos Rugby Club</span>
            </div>
            <span className="text-[9px] text-gray-300">Rugby Stats</span>
          </div>

        </div>
      </div>
    </div>
  );
}
