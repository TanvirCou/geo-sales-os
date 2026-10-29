"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const breadcrumbs: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/businesses": "Businesses & Prospects",
  "/dashboard/products": "Product Catalog",
  "/dashboard/orders": "Field Orders",
  "/dashboard/map/google": "Google Maps Engine",
  "/dashboard/map/geoapify": "Geoapify / MapLibre Engine",
  "/dashboard/imports": "Data Imports",
  "/dashboard/settings": "Account Settings",
};

export function TopNavbar() {
  const pathname = usePathname();

  const currentLabel =
    Object.keys(breadcrumbs).find((k) =>
      k === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(k)
    ) ? breadcrumbs[pathname] || "Dashboard" : "Dashboard";

  return (
    <header className="h-14 sm:h-16 px-4 sm:px-6 lg:px-8 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between shrink-0 z-30 select-none transition-colors duration-150">
      {/* Left: Mobile Brand Logo / Desktop Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Mini Logo Badge */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-blue-600/30">
            G
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
            GeoSales OS
          </span>
        </div>

        {/* Separator on mobile */}
        <span className="text-slate-300 dark:text-slate-700 lg:hidden">/</span>

        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
          <Link
            href="/dashboard"
            className="hidden lg:inline text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-medium shrink-0"
          >
            Dashboard
          </Link>
          <span className="hidden lg:inline text-slate-300 dark:text-slate-600 shrink-0">/</span>
          <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[140px] sm:max-w-xs md:max-w-md">
            {currentLabel}
          </span>
        </div>
      </div>

      {/* Right Actions: DB indicator, Quick Map & Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* PostgreSQL Database Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">PostgreSQL Connected</span>
        </div>

        {/* Desktop Quick Map link */}
        <Link
          href="/dashboard/map/geoapify"
          title="Open Geo-Map"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm shadow-blue-600/30 transition-all active:scale-95"
        >
          <span>🗺️</span>
          <span>Dual Map</span>
        </Link>

        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  );
}
