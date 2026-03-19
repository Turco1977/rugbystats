import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-login-gradient">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-10 p-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">🏉</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Rugby Stats</h1>
          <p className="mt-1.5 text-sm text-white/50">
            Los Tordos Rugby Club
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/jornada"
            className="rounded bg-white px-6 py-3.5 text-center text-sm font-bold text-nv
                       hover:bg-white/90 transition-colors shadow-card"
          >
            Dashboard — Jornadas
          </Link>

          <Link
            href="/captura"
            className="rounded bg-gn px-6 py-3.5 text-center text-sm font-bold text-white
                       hover:bg-gn-dark transition-colors shadow-card"
          >
            Captura en Vivo
          </Link>
        </div>

        {/* Quick stats teaser */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
          {[
            { label: "Partidos", value: "0" },
            { label: "Eventos", value: "0" },
            { label: "Temporada", value: "2026" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-xl font-extrabold text-white">{stat.value}</p>
              <p className="text-[9px] text-white/40 uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-white/15 text-[9px] pb-4">
        Rugby Stats v0.1 — Los Tordos RC
      </p>
    </main>
  );
}
