"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    // Detect division from email: m19@... → M19
    const divMatch = email.match(/^(m\d+)@/i);
    if (divMatch) {
      const div = divMatch[1].toUpperCase();
      router.push(`/director?div=${div}`);
    } else {
      router.push("/director");
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-login-gradient">
      <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">🏉</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Rugby Stats</h1>
          <p className="mt-1.5 text-sm text-white/50">Los Tordos Rugby Club</p>
        </div>

        {/* Login form */}
        <div className="w-full max-w-xs space-y-4">
          <div>
            <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="m19@lostordos.com.ar"
              className="w-full rounded border border-white/20 bg-white/10 px-4 py-3 text-base text-white
                         placeholder:text-white/30 focus:border-white/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] text-white/50 uppercase tracking-widest font-semibold block mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full rounded border border-white/20 bg-white/10 px-4 py-3 text-base text-white
                         placeholder:text-white/30 focus:border-white/50 focus:outline-none"
            />
          </div>

          {error && (
            <p className="text-rd-light text-sm font-semibold text-center">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={!email || !password || loading}
            className="w-full rounded bg-white px-6 py-3.5 text-base font-bold text-nv
                       hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          {/* Separator */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 border-t border-white/15" />
            <span className="text-white/30 text-xs">o</span>
            <div className="flex-1 border-t border-white/15" />
          </div>

          {/* Join without login */}
          <a
            href="/captura"
            className="block w-full rounded bg-gn px-6 py-3.5 text-center text-base font-bold text-white
                       hover:bg-gn-dark transition-colors"
          >
            Unirse con código (sin login)
          </a>
        </div>
      </div>

      <p className="text-center text-white/15 text-[10px] pb-4">
        Rugby Stats v0.1 — Los Tordos RC
      </p>
    </main>
  );
}
