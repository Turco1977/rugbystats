"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import type { Division } from "@/lib/types/domain";

interface PartidoHistorial {
  id: string;
  division: Division;
  puntos_local: number;
  puntos_visitante: number;
  status: string;
  fecha_numero: number;
  equipo_local: { name: string; short_name: string } | null;
  equipo_visitante: { name: string; short_name: string } | null;
  jornadas: { name: string; date: string } | null;
}

const DIVISIONS: Division[] = ["M19", "M17", "M16", "M15"];

export default function HistorialPage() {
  const [selectedDivision, setSelectedDivision] = useState<Division>("M19");
  const [partidos, setPartidos] = useState<PartidoHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState("");

  useEffect(() => {
    async function fetchHistorial() {
      setLoading(true);
      try {
        const supabase = createClient();
        let query = supabase
          .from("partidos")
          .select(`
            id, division, puntos_local, puntos_visitante, status, fecha_numero,
            equipo_local:teams!equipo_local_id(name, short_name),
            equipo_visitante:teams!equipo_visitante_id(name, short_name),
            jornadas(name, date)
          `)
          .eq("division", selectedDivision)
          .eq("status", "finished")
          .order("fecha_numero", { ascending: false });

        const { data } = await query;
        if (data) setPartidos(data as unknown as PartidoHistorial[]);
      } catch {
        // Demo fallback
        setPartidos([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistorial();
  }, [selectedDivision]);

  // Filter by date if search is active
  const filteredPartidos = searchDate
    ? partidos.filter((p) => {
        const jornadaDate = (p.jornadas as { date: string } | null)?.date ?? "";
        return jornadaDate.includes(searchDate);
      })
    : partidos;

  // Demo data if no real data
  const demoResults = [
    { fecha: 1, date: "7/3", rival: "Peumayen", resultado: "G", score: "21-14", totalEventos: 47 },
    { fecha: 2, date: "21/3", rival: "Marista A", resultado: "P", score: "10-24", totalEventos: 52 },
    { fecha: 3, date: "28/3", rival: "Liceo A", resultado: "G", score: "28-7", totalEventos: 38 },
  ];
  const showDemo = !loading && filteredPartidos.length === 0 && !searchDate;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-nv">Historial de Temporada</h2>
          <p className="text-sm text-g-4 mt-0.5">
            Torneo Apertura 2026 — Zona 1
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Date search */}
          <input
            type="date"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="text-xs px-3 py-1.5 rounded border border-g-3 bg-white"
            placeholder="Buscar fecha"
          />

          {/* Division filter */}
          <div className="flex gap-1.5">
            {DIVISIONS.map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${
                  div === selectedDivision
                    ? "bg-nv text-white"
                    : "bg-g-1 border border-g-2 text-g-5 hover:bg-g-2"
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="card !p-0 overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-g-1">
              <th className="text-left text-xs font-bold text-g-4 uppercase tracking-wider py-2.5 px-3">
                Fecha
              </th>
              <th className="text-left text-xs font-bold text-g-4 uppercase tracking-wider py-2.5 px-3">
                Rival
              </th>
              <th className="text-center text-xs font-bold text-g-4 uppercase tracking-wider py-2.5 px-3">
                Res.
              </th>
              <th className="text-center text-xs font-bold text-g-4 uppercase tracking-wider py-2.5 px-3">
                Score
              </th>
              <th className="text-center text-xs font-bold text-g-4 uppercase tracking-wider py-2.5 px-3">
                Eventos
              </th>
              <th className="text-xs font-bold text-g-4 py-2.5 px-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-g-4 animate-pulse">
                  Cargando historial...
                </td>
              </tr>
            ) : filteredPartidos.length > 0 ? (
              filteredPartidos.map((p) => {
                const isWin = p.puntos_local > p.puntos_visitante;
                const rival = p.equipo_visitante?.short_name || p.equipo_visitante?.name || "—";
                return (
                  <tr
                    key={p.id}
                    className="border-t border-g-2 hover:bg-g-1 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3">
                      <span className="text-sm font-semibold text-nv">#{p.fecha_numero}</span>
                    </td>
                    <td className="py-3 px-3 text-sm font-semibold text-g-5">{rival}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`badge ${isWin ? "bg-gn-bg text-gn-forest" : "bg-rd-bg text-rd"}`}>
                        {isWin ? "Ganado" : "Perdido"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-sm font-bold text-nv">
                      {p.puntos_local} - {p.puntos_visitante}
                    </td>
                    <td className="py-3 px-3 text-center text-sm text-g-4">—</td>
                    <td className="py-3 px-3 text-right">
                      <a href={`/partido/${p.id}`} className="text-xs text-bl hover:underline">
                        Ver →
                      </a>
                    </td>
                  </tr>
                );
              })
            ) : showDemo ? (
              demoResults.map((row) => (
                <tr key={row.fecha} className="border-t border-g-2 hover:bg-g-1 transition-colors cursor-pointer">
                  <td className="py-3 px-3">
                    <span className="text-sm font-semibold text-nv">#{row.fecha}</span>
                    <span className="text-xs text-g-4 ml-1.5">{row.date}</span>
                  </td>
                  <td className="py-3 px-3 text-sm font-semibold text-g-5">{row.rival}</td>
                  <td className="py-3 px-3 text-center">
                    <span className={`badge ${row.resultado === "G" ? "bg-gn-bg text-gn-forest" : "bg-rd-bg text-rd"}`}>
                      {row.resultado === "G" ? "Ganado" : "Perdido"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-sm font-bold text-nv">{row.score}</td>
                  <td className="py-3 px-3 text-center text-sm text-g-4">{row.totalEventos}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="text-xs text-g-3">Demo</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-g-4">
                  No se encontraron partidos {searchDate ? `para la fecha ${searchDate}` : ""}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Module summary */}
      <h3 className="text-xs font-bold text-g-4 uppercase tracking-wider mb-3">
        Acumulado por Módulo — {selectedDivision}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MODULE_CONFIG.map((mod) => (
          <a key={mod.id} href={`/${mod.id === "SALIDA" ? "salidas" : mod.id.toLowerCase()}`} className="card-compact text-center hover:shadow-card-sm transition-shadow">
            <span className="text-xl">{mod.icon}</span>
            <p className="text-xs font-bold text-g-4 uppercase tracking-wider mt-1">
              {mod.label}
            </p>
            <p className="text-xl font-extrabold text-nv mt-1">—</p>
            <p className="text-[10px] text-g-3">Ver detalle →</p>
          </a>
        ))}
      </div>
    </div>
  );
}
