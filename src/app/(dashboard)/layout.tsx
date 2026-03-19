"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { MODULE_CONFIG } from "@/lib/constants/modules";
import { useState } from "react";

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

  return (
    <div className="flex min-h-screen bg-g-1">
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
              <a href="/jornada" className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-dk-4 hover:text-white hover:bg-white/5">
                <span>📋</span> Jornadas
              </a>
              <a href="/historial" className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-dk-4 hover:text-white hover:bg-white/5">
                <span>📊</span> Historial
              </a>
              <a href="/captura" className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-gn hover:bg-white/5">
                <span>🏉</span> Captura en Vivo
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
                  className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-dk-4 hover:text-white hover:bg-white/5"
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
        <header className="sticky top-0 z-30 bg-white border-b border-g-2 px-4 py-2.5 flex items-center justify-between shadow-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-g-5 hover:text-nv"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1 className="text-sm font-bold text-nv">Rugby Stats</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-gn-bg text-gn-forest">
              Temporada 2026
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
