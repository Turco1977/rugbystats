"use client";

import { useState } from "react";
import { useCaptureStore } from "@/hooks/use-capture-store";

type FieldName = "nombre" | "descripcion";

const INCIDENCIA_TYPES: readonly {
  key: string;
  label: string;
  icon: string;
  color: string;
  fields: FieldName[];
}[] = [
  { key: "tarjeta_roja", label: "Tarjeta Roja", icon: "\u{1F7E5}", color: "bg-rd", fields: ["nombre"] },
  { key: "tarjeta_amarilla", label: "Tarjeta Amarilla", icon: "\u{1F7E8}", color: "bg-yl", fields: ["nombre"] },
  { key: "lesion", label: "Lesion", icon: "\u{1F3E5}", color: "bg-bl", fields: ["nombre", "descripcion"] },
  { key: "publico", label: "Publico", icon: "\u{1F465}", color: "bg-nv-light", fields: ["descripcion"] },
  { key: "disciplina", label: "Disciplina", icon: "\u26A0\uFE0F", color: "bg-or", fields: ["descripcion"] },
];

type IncType = string;

export function IncidenciaForm() {
  const submitIncidencia = useCaptureStore((s) => s.submitIncidencia);
  const resetFlow = useCaptureStore((s) => s.resetFlow);

  const [selectedType, setSelectedType] = useState<IncType | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const typeConfig = INCIDENCIA_TYPES.find((t) => t.key === selectedType);

  const handleSubmit = () => {
    if (!selectedType) return;
    // Validate required fields
    if (typeConfig?.fields.includes("nombre") && !nombre.trim()) return;
    if (typeConfig?.fields.includes("descripcion") && !descripcion.trim()) return;

    submitIncidencia({
      tipo: selectedType,
      nombre: nombre.trim() || undefined,
      descripcion: descripcion.trim() || undefined,
    });

    // Reset form
    setSelectedType(null);
    setNombre("");
    setDescripcion("");
  };

  // Step 1: Pick type
  if (!selectedType) {
    return (
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-dk-4 uppercase tracking-wider">
            Tipo de Incidencia
          </h2>
          <button
            onClick={resetFlow}
            className="text-[10px] text-dk-4 bg-dk-2 border border-dk-3 rounded px-2.5 py-1 hover:text-white"
          >
            ESC
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 flex-1 content-center">
          {INCIDENCIA_TYPES.slice(0, 4).map((type) => (
            <button
              key={type.key}
              onClick={() => setSelectedType(type.key)}
              className={`capture-btn ${type.color} hover:opacity-90`}
            >
              <span className="text-2xl leading-none">{type.icon}</span>
              <span className="text-xs font-bold tracking-wide uppercase">
                {type.label}
              </span>
            </button>
          ))}
          {/* Disciplina - full width */}
          <button
            onClick={() => setSelectedType("disciplina")}
            className="capture-btn bg-or hover:opacity-90 col-span-2 !min-h-[60px]"
          >
            <span className="text-2xl leading-none">{INCIDENCIA_TYPES[4].icon}</span>
            <span className="text-xs font-bold tracking-wide uppercase">
              Disciplina
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Form for selected type
  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedType(null)}
            className="text-dk-4 hover:text-white text-sm"
          >
            &larr;
          </button>
          <span className="text-lg">{typeConfig?.icon}</span>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            {typeConfig?.label}
          </h2>
        </div>
        <button
          onClick={resetFlow}
          className="text-[10px] text-dk-4 bg-dk-2 border border-dk-3 rounded px-2.5 py-1 hover:text-white"
        >
          ESC
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
        {/* Nombre field */}
        {typeConfig?.fields.includes("nombre") && (
          <div>
            <label className="text-[11px] text-dk-4 uppercase tracking-widest font-semibold block mb-1.5">
              Nombre del jugador
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Perez"
              autoFocus
              className="w-full rounded border border-dk-3 bg-dk-2 px-4 py-3 text-sm text-white
                         placeholder:text-dk-4 focus:border-bl focus:outline-none"
            />
          </div>
        )}

        {/* Descripcion field */}
        {typeConfig?.fields.includes("descripcion") && (
          <div>
            <label className="text-[11px] text-dk-4 uppercase tracking-widest font-semibold block mb-1.5">
              {selectedType === "lesion" ? "Tipo de lesion" : "Descripcion"}
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder={
                selectedType === "lesion"
                  ? "Ej: Esguince tobillo izquierdo"
                  : selectedType === "publico"
                  ? "Ej: Padres insultando al referí"
                  : "Ej: Pelea entre jugadores"
              }
              autoFocus={!typeConfig?.fields.includes("nombre")}
              rows={3}
              className="w-full rounded border border-dk-3 bg-dk-2 px-4 py-3 text-sm text-white
                         placeholder:text-dk-4 focus:border-bl focus:outline-none resize-none"
            />
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={
            (typeConfig?.fields.includes("nombre") && !nombre.trim()) ||
            (typeConfig?.fields.includes("descripcion") && !descripcion.trim())
          }
          className={`w-full rounded px-6 py-4 text-base font-bold text-white transition-colors
                      disabled:opacity-30 disabled:cursor-not-allowed
                      ${typeConfig?.color} hover:opacity-90`}
        >
          Guardar Incidencia
        </button>
      </div>
    </div>
  );
}
