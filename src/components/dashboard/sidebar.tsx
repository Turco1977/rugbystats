"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { MODULE_CONFIG } from "@/lib/constants/modules";

const NAV_ITEMS = [
  { href: "/jornada", icon: "📋", label: "Jornadas" },
  { href: "/historial", icon: "📊", label: "Historial" },
];

const MODULE_NAV_ITEMS = MODULE_CONFIG.map((mod) => ({
  href: `/${mod.id === "SALIDA" ? "salidas" : mod.id.toLowerCase()}`,
  icon: mod.icon,
  label: mod.label,
  color: mod.color,
}));

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <aside
      className={`hidden md:flex flex-col bg-nv text-white transition-all duration-300 ${
        collapsed ? "w-12 min-w-12" : "w-[250px] min-w-[250px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm shrink-0">
          🏉
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold leading-tight">Rugby Stats</p>
            <p className="text-[9px] text-dk-4">Los Tordos RC</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              isActive(item.href)
                ? "text-white bg-white/10"
                : "text-dk-4 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}

        {/* Separator */}
        <div className="border-t border-white/10 my-3 mx-4" />
        {!collapsed && (
          <p className="px-4 mb-2 text-[9px] font-bold text-dk-4 uppercase tracking-widest">
            Módulos
          </p>
        )}

        {/* Module nav */}
        {MODULE_NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2 text-xs font-semibold transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              isActive(item.href)
                ? "text-white bg-white/10"
                : "text-dk-4 hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full ${item.color} shrink-0`}
              />
              <span className="text-sm">{item.icon}</span>
            </span>
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="border-t border-white/10 py-3 text-dk-4 text-[10px] hover:text-white transition-colors"
      >
        {collapsed ? "→" : "← Colapsar"}
      </button>
    </aside>
  );
}
