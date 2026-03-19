"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MODULE_NAV_ITEMS = MODULE_CONFIG.map((mod) => ({
  href: `/${mod.id === "SALIDA" ? "salidas" : mod.id.toLowerCase()}`,
  icon: mod.icon,
  label: mod.label,
  color: mod.color,
}));

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("rugbystats-dark");
    if (saved === "true") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }

    // Check auth
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email ?? null);
      } else {
        router.push("/");
      }
      setAuthChecked(true);
    });
  }, [router]);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("rugbystats-dark", String(next));
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-g-1 dark:bg-dk-1">
        <p className="text-g-4 animate-pulse">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-g-1 dark:bg-dk-1">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-nv/60 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="fixed left-0 top-0 bottom-0 w-[260px] bg-nv shadow-sidebar overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                🏉
              </div>
              <div>
                <p className="text-sm font-bold text-white">Rugby Stats</p>
                <p className="text-[9px] text-dk-4">Los Tordos RC</p>
              </div>
            </div>
            <nav className="py-3">
              <a href="/director" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-dk-4 hover:text-white hover:bg-white/5">
                <span className="text-lg">🎯</span> Director Deportivo
              </a>
              <a href="/jornada" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-dk-4 hover:text-white hover:bg-white/5">
                <span className="text-lg">📋</span> Fixture
              </a>
              <a href="/historial" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-dk-4 hover:text-white hover:bg-white/5">
                <span className="text-lg">📊</span> Historial
              </a>
              <a href="/captura" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gn hover:bg-white/5">
                <span className="text-lg">🏉</span> Captura en Vivo
              </a>

              {/* Module links */}
              <div className="border-t border-white/10 my-3 mx-4" />
              <p className="px-4 mb-2 text-[9px] font-bold text-dk-4 uppercase tracking-widest">
                Módulos
              </p>
              {MODULE_NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-dk-4 hover:text-white hover:bg-white/5"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                    <span className="text-sm">{item.icon}</span>
                  </span>
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-dk-2 border-b border-g-2 dark:border-white/10 px-4 py-2.5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-g-5 dark:text-dk-4 hover:text-nv dark:hover:text-white"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1 className="text-base font-bold text-nv dark:text-white">Rugby Stats</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-g-1 dark:hover:bg-white/10 transition-colors"
              title={dark ? "Modo claro" : "Modo oscuro"}
            >
              {dark ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </button>
            <span className="badge bg-gn-bg text-gn-forest">
              Temporada 2026
            </span>
            {userEmail && (
              <button
                onClick={handleLogout}
                className="text-xs text-g-4 hover:text-rd transition-colors ml-1"
                title="Cerrar sesión"
              >
                Salir
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
