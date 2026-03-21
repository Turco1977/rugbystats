"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface IncidenciaRow {
  id: string;
  partido_id: string;
  data: {
    tipo?: string;
    motivo?: string;
    resultado?: string;
    nombre?: string;
    descripcion?: string;
  };
  cargado_por: string;
  created_at: string;
  partidos: {
    id: string;
    division: string;
    equipo_local: { name: string; short_name: string } | null;
    equipo_visitante: { name: string; short_name: string } | null;
    jornadas: { date: string; name: string } | null;
  } | null;
}

// Helper to extract tipo from data (supports both old and new format)
function getTipo(data: IncidenciaRow["data"]): string {
  return data.tipo || data.motivo || "desconocido";
}

const TIPO_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  tarjeta_roja: { icon: "\u{1F7E5}", label: "Tarjeta Roja", color: "bg-rd/20 border-rd/40 text-rd-light" },
  tarjeta_amarilla: { icon: "\u{1F7E8}", label: "Tarjeta Amarilla", color: "bg-yl/20 border-yl/40 text-yl" },
  lesion: { icon: "\u{1F3E5}", label: "Lesion", color: "bg-bl/20 border-bl/40 text-bl" },
  publico: { icon: "\u{1F465}", label: "Publico", color: "bg-nv-light/20 border-nv-light/40 text-white" },
  disciplina: { icon: "\u26A0\uFE0F", label: "Disciplina", color: "bg-or/20 border-or/40 text-or" },
};

const DIV_FILTERS = ["Todos", "M19", "M17", "M16", "M15"] as const;

export default function IncidenciasPage() {
  const [incidencias, setIncidencias] = useState<IncidenciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [divFilter, setDivFilter] = useState<string>("Todos");

  const fetchIncidencias = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("eventos")
      .select(`
        id, partido_id, data, cargado_por, created_at,
        partidos(
          id, division,
          equipo_local:teams!equipo_local_id(name, short_name),
          equipo_visitante:teams!equipo_visitante_id(name, short_name),
          jornadas:jornadas!jornada_id(date, name)
        )
      `)
      .eq("modulo", "INCIDENCIA")
      .order("created_at", { ascending: false });
    if (data) setIncidencias(data as unknown as IncidenciaRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchIncidencias(); }, [fetchIncidencias]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta incidencia?")) return;
    const supabase = createClient();
    await supabase.from("eventos").delete().eq("id", id);
    fetchIncidencias();
  };

  // Filter
  const filtered = divFilter === "Todos"
    ? incidencias
    : incidencias.filter((i) => i.partidos?.division?.startsWith(divFilter));

  // Group by date
  const grouped = filtered.reduce<Record<string, IncidenciaRow[]>>((acc, i) => {
    const dateKey = i.partidos?.jornadas?.date || "Sin fecha";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(i);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatDate = (dateStr: string) => {
    if (dateStr === "Sin fecha") return dateStr;
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  // Generate WhatsApp report text
  const generateReport = () => {
    let text = `\u{1F6A8} *INFORME DE INCIDENCIAS*\n`;
    text += `Rugby Stats - Los Tordos RC\n`;
    text += `Generado: ${new Date().toLocaleDateString("es-AR")}\n`;
    text += `${"─".repeat(30)}\n\n`;

    // Group by division for the report
    const byDivision = filtered.reduce<Record<string, IncidenciaRow[]>>((acc, i) => {
      const div = i.partidos?.division || "Sin division";
      if (!acc[div]) acc[div] = [];
      acc[div].push(i);
      return acc;
    }, {});

    const divOrder = ["M19", "M17", "M16", "M15"];
    const sortedDivs = Object.keys(byDivision).sort((a, b) => {
      const ai = divOrder.indexOf(a);
      const bi = divOrder.indexOf(b);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    for (const div of sortedDivs) {
      const items = byDivision[div];
      const local = items[0]?.partidos?.equipo_local?.short_name || "Los Tordos";
      const visitante = items[0]?.partidos?.equipo_visitante?.short_name || "";
      text += `\u{1F3C9} *${div}* - ${local} vs ${visitante}\n`;

      for (const item of items) {
        const d = item.data;
        const cfg = TIPO_CONFIG[getTipo(d)];
        const icon = cfg?.icon || "\u{1F6A8}";
        const label = cfg?.label || getTipo(d);

        if (getTipo(d) === "tarjeta_roja" || getTipo(d) === "tarjeta_amarilla") {
          text += `  ${icon} ${label}: ${d.nombre || "—"}\n`;
        } else if (getTipo(d) === "lesion") {
          text += `  ${icon} ${d.nombre || "—"}: ${d.descripcion || "—"}\n`;
        } else {
          text += `  ${icon} ${label}: ${d.descripcion || "—"}\n`;
        }
      }
      text += `\n`;
    }

    if (filtered.length === 0) {
      text += `\u2705 Sin incidencias reportadas.\n`;
    }

    text += `${"─".repeat(30)}\n`;
    text += `_Enviado desde Rugby Stats_`;

    return text;
  };

  const shareWhatsApp = () => {
    const text = generateReport();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  const copyReport = () => {
    const text = generateReport();
    navigator.clipboard.writeText(text);
    alert("Informe copiado al portapapeles");
  };

  // Counts
  const tarjetasRojas = filtered.filter((i) => getTipo(i.data) === "tarjeta_roja").length;
  const tarjetasAmarillas = filtered.filter((i) => getTipo(i.data) === "tarjeta_amarilla").length;
  const lesiones = filtered.filter((i) => getTipo(i.data) === "lesion").length;
  const disciplinaCount = filtered.filter((i) => getTipo(i.data) === "disciplina" || getTipo(i.data) === "publico").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-nv dark:text-white flex items-center gap-2">
            <span>&#x1F6A8;</span> Incidencias
          </h2>
          <p className="text-xs text-g-4 mt-0.5">Reporte del fin de semana</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyReport}
            className="text-xs font-semibold px-3 py-2 rounded-md bg-dk-2 border border-dk-3 text-dk-4 hover:text-white transition-colors"
          >
            Copiar
          </button>
          <button
            onClick={shareWhatsApp}
            className="text-xs font-bold px-4 py-2 rounded-md bg-gn text-white hover:bg-gn-dark transition-colors flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
        </div>
      </div>

      {/* Division filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {DIV_FILTERS.map((d) => (
          <button
            key={d}
            onClick={() => setDivFilter(d)}
            className={`text-xs font-bold px-4 py-2 rounded-md whitespace-nowrap transition-colors ${
              d === divFilter
                ? "bg-nv text-white"
                : "bg-dk-2 border border-dk-3 text-g-4 hover:bg-dk-3"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card-compact text-center">
          <span className="text-lg">{"\u{1F7E5}"}</span>
          <p className="text-xl font-extrabold text-rd mt-1">{tarjetasRojas}</p>
          <p className="text-[9px] text-g-4 uppercase">Rojas</p>
        </div>
        <div className="card-compact text-center">
          <span className="text-lg">{"\u{1F7E8}"}</span>
          <p className="text-xl font-extrabold text-yl mt-1">{tarjetasAmarillas}</p>
          <p className="text-[9px] text-g-4 uppercase">Amarillas</p>
        </div>
        <div className="card-compact text-center">
          <span className="text-lg">{"\u{1F3E5}"}</span>
          <p className="text-xl font-extrabold text-bl mt-1">{lesiones}</p>
          <p className="text-[9px] text-g-4 uppercase">Lesiones</p>
        </div>
        <div className="card-compact text-center">
          <span className="text-lg">{"\u26A0\uFE0F"}</span>
          <p className="text-xl font-extrabold text-or mt-1">{disciplinaCount}</p>
          <p className="text-[9px] text-g-4 uppercase">Disciplina</p>
        </div>
      </div>

      {/* Incidencias list */}
      {loading ? (
        <div className="card text-center py-8">
          <p className="text-g-4 text-sm animate-pulse">Cargando...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-2">{"\u2705"}</p>
          <p className="text-g-4 text-sm font-semibold">Sin incidencias</p>
          <p className="text-g-3 text-xs mt-1">No se registraron incidencias en este periodo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const items = grouped[dateKey];
            return (
              <div key={dateKey}>
                <h3 className="text-xs font-bold text-g-4 uppercase tracking-wider mb-3">
                  <span className="capitalize">{formatDate(dateKey)}</span>
                </h3>
                <div className="space-y-2">
                  {items.map((inc) => {
                    const cfg = TIPO_CONFIG[getTipo(inc.data)] || { icon: "\u{1F6A8}", label: getTipo(inc.data), color: "bg-dk-2 border-dk-3 text-dk-4" };
                    const rival = inc.partidos?.equipo_visitante?.short_name || inc.partidos?.equipo_visitante?.name || "—";
                    const division = inc.partidos?.division || "—";

                    return (
                      <div
                        key={inc.id}
                        className={`rounded-lg border px-4 py-3 ${cfg.color}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{cfg.icon}</span>
                              <span className="text-sm font-bold">{cfg.label}</span>
                              <span className="text-[10px] bg-white/10 rounded px-1.5 py-0.5 font-bold">
                                {division}
                              </span>
                            </div>
                            {inc.data.nombre && (
                              <p className="text-sm font-semibold ml-7">{inc.data.nombre}</p>
                            )}
                            {inc.data.descripcion && (
                              <p className="text-xs opacity-80 ml-7">{inc.data.descripcion}</p>
                            )}
                            <p className="text-[10px] opacity-50 mt-1 ml-7">
                              vs {rival} &middot; {inc.cargado_por}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(inc.id)}
                            className="text-white/30 hover:text-rd text-sm transition-colors ml-2"
                            title="Eliminar"
                          >
                            &#x2715;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
