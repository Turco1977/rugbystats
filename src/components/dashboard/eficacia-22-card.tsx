"use client";

import { DonutChart } from "./donut-chart";

interface RealtimeEvento {
  modulo: string;
  perspectiva: "propio" | "rival";
  data: Record<string, unknown>;
}

interface Eficacia22CardProps {
  eventos: RealtimeEvento[];
}

export function Eficacia22Card({ eventos }: Eficacia22CardProps) {
  const ataqueE22 = eventos.filter(
    (e) => e.modulo === "ATAQUE" && (e.data?.motivo as string) === "E22"
  );
  const ataqueTotal = ataqueE22.length;
  const ataqueConPuntos = ataqueE22.filter((e) => (e.data?.resultado as string) === "puntos").length;
  const ataqueSinPuntos = ataqueTotal - ataqueConPuntos;
  const ataqueEficacia = ataqueTotal > 0 ? Math.round((ataqueConPuntos / ataqueTotal) * 100) : 0;

  const defensaE22 = eventos.filter(
    (e) => e.modulo === "DEFENSA" && (e.data?.motivo as string) === "E22"
  );
  const defensaTotal = defensaE22.length;
  const defensaConPuntos = defensaE22.filter((e) => (e.data?.resultado as string) === "puntos").length;
  const defensaRecuperada = defensaE22.filter((e) => (e.data?.resultado as string) === "recuperada").length;
  const defensaEficacia = defensaTotal > 0 ? Math.round((defensaRecuperada / defensaTotal) * 100) : 0;

  if (ataqueTotal === 0 && defensaTotal === 0) return null;

  return (
    <div className="card">
      <h3 className="text-xs font-bold text-g-4 uppercase tracking-wider mb-5">
        Eficacia en 22
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Ataque */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-bold text-gn-dark mb-3">→ Ataque — Entradas a sus 22</p>
          {ataqueTotal === 0 ? (
            <p className="text-sm text-g-3 py-6">Sin entradas</p>
          ) : (
            <>
              <DonutChart
                segments={[
                  { label: "Con puntos", value: ataqueConPuntos, color: "#10B981" },
                  { label: "Sin puntos", value: ataqueSinPuntos, color: "#C8102E" },
                ]}
                size={180}
                strokeWidth={28}
                centerValue={`${ataqueEficacia}%`}
                centerLabel="Conversión"
              />
              <div className="flex gap-6 mt-3">
                <span className="text-xs font-semibold text-gn-dark">✓ Puntos: {ataqueConPuntos}</span>
                <span className="text-xs font-semibold text-rd">✗ Perdida: {ataqueSinPuntos}</span>
              </div>
              <p className="text-[10px] text-g-3 mt-1">{ataqueTotal} entradas a las 22</p>
            </>
          )}
        </div>
        {/* Defensa */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-bold text-pr mb-3">🛡 Defensa — Entradas rivales a nuestras 22</p>
          {defensaTotal === 0 ? (
            <p className="text-sm text-g-3 py-6">Sin entradas</p>
          ) : (
            <>
              <DonutChart
                segments={[
                  { label: "Recuperada", value: defensaRecuperada, color: "#10B981" },
                  { label: "Nos marcaron", value: defensaConPuntos, color: "#C8102E" },
                ]}
                size={180}
                strokeWidth={28}
                centerValue={`${defensaEficacia}%`}
                centerLabel="Defensa"
              />
              <div className="flex gap-6 mt-3">
                <span className="text-xs font-semibold text-gn-dark">✓ Recuperada: {defensaRecuperada}</span>
                <span className="text-xs font-semibold text-rd">✗ Nos marcaron: {defensaConPuntos}</span>
              </div>
              <p className="text-[10px] text-g-3 mt-1">{defensaTotal} entradas a nuestras 22</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
