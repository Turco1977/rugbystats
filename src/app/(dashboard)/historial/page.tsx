"use client";

import { MODULE_CONFIG } from "@/lib/constants/modules";

// Demo fixture results
const FIXTURE_RESULTS = [
  { fecha: 1, date: "7/3", rival: "Peumayen", resultado: "G", score: "21-14", totalEventos: 47 },
  { fecha: 2, date: "21/3", rival: "Marista A", resultado: "P", score: "10-24", totalEventos: 52 },
  { fecha: 3, date: "28/3", rival: "Liceo A", resultado: "G", score: "28-7", totalEventos: 38 },
];

export default function HistorialPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-nv">Historial de Temporada</h2>
          <p className="text-xs text-g-4 mt-0.5">
            Torneo Apertura 2026 — Zona 1
          </p>
        </div>

        {/* Division filter */}
        <div className="flex gap-1.5">
          {["M15", "M16", "M17", "M19"].map((div) => (
            <button
              key={div}
              className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors ${
                div === "M19"
                  ? "bg-nv text-white"
                  : "bg-g-1 border border-g-2 text-g-5 hover:bg-g-2"
              }`}
            >
              {div}
            </button>
          ))}
        </div>
      </div>

      {/* Results table */}
      <div className="card !p-0 overflow-hidden mb-6">
        <table className="w-full">
          <thead>
            <tr className="bg-g-1">
              <th className="text-left text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                Fecha
              </th>
              <th className="text-left text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                Rival
              </th>
              <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                Res.
              </th>
              <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                Score
              </th>
              <th className="text-center text-[10px] font-bold text-g-4 uppercase tracking-wider py-2 px-3">
                Eventos
              </th>
              <th className="text-[10px] font-bold text-g-4 py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {FIXTURE_RESULTS.map((row) => (
              <tr
                key={row.fecha}
                className="border-t border-g-2 hover:bg-g-1 transition-colors cursor-pointer"
              >
                <td className="py-2.5 px-3">
                  <span className="text-xs font-semibold text-nv">
                    #{row.fecha}
                  </span>
                  <span className="text-[10px] text-g-4 ml-1.5">
                    {row.date}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-xs font-semibold text-g-5">
                  {row.rival}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`badge ${
                      row.resultado === "G"
                        ? "bg-gn-bg text-gn-forest"
                        : "bg-rd-bg text-rd"
                    }`}
                  >
                    {row.resultado === "G" ? "Ganado" : "Perdido"}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-center text-xs font-bold text-nv">
                  {row.score}
                </td>
                <td className="py-2.5 px-3 text-center text-xs text-g-4">
                  {row.totalEventos}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-[10px] text-g-3 hover:text-nv">
                    Ver →
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Module summary */}
      <h3 className="text-[10px] font-bold text-g-4 uppercase tracking-wider mb-3">
        Acumulado por Módulo (3 fechas)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MODULE_CONFIG.map((mod) => (
          <div key={mod.id} className="card-compact text-center">
            <span className="text-lg">{mod.icon}</span>
            <p className="text-[10px] font-bold text-g-4 uppercase tracking-wider mt-1">
              {mod.label}
            </p>
            <p className="text-xl font-extrabold text-nv mt-1">—</p>
            <p className="text-[9px] text-g-3">Sin datos</p>
          </div>
        ))}
      </div>
    </div>
  );
}
