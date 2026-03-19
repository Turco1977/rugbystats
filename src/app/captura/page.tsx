"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CapturaJoinPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (code.length === 6 && name.trim()) {
      router.push(`/captura/${code}?name=${encodeURIComponent(name.trim())}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-login-gradient">
      {/* Top bar */}
      <div className="px-4 py-3">
        <a href="/" className="text-white/60 text-xs hover:text-white">
          ← Volver
        </a>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        {/* Logo area */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏉</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Captura en Vivo</h1>
          <p className="mt-1 text-sm text-white/60">
            Ingresá el código del partido y tu nombre
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          {/* Name input */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold block mb-1.5">
              Tu nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Juan"
              className="w-full rounded border border-white/20 bg-white/10 px-4 py-3 text-sm text-white
                         placeholder:text-white/30 focus:border-white/50 focus:outline-none"
            />
          </div>

          {/* Code input */}
          <div>
            <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold block mb-1.5">
              Código de sesión
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full rounded border border-white/20 bg-white/10 px-4 py-4 text-center
                         text-2xl font-mono font-bold tracking-[0.4em] text-white
                         placeholder:text-white/20 focus:border-white/50 focus:outline-none"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={code.length !== 6 || !name.trim()}
            className="w-full rounded bg-white px-6 py-3.5 text-sm font-bold text-nv
                       hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Unirse al Partido
          </button>
        </div>
      </div>

      <p className="text-center text-white/20 text-[10px] pb-4">
        Rugby Stats — Los Tordos RC
      </p>
    </main>
  );
}
