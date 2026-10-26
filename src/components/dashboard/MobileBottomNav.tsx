"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/actions/auth";

export function MobileBottomNav({ adminName = "Admin User" }: { adminName?: string }) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const avatarLetter = (adminName || "A").trim().charAt(0).toUpperCase() || "A";

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isMapActive = pathname.startsWith("/dashboard/map");

  const handleLogout = async () => {
    setLogoutPending(true);
    await logoutAction();
  };

  const closeMore = () => setIsMoreOpen(false);

  const primaryTabs = [
    {
      label: "Overview",
      href: "/dashboard",
      active: pathname === "/dashboard",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      label: "Businesses",
      href: "/dashboard/businesses",
      active: pathname.startsWith("/dashboard/businesses"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M19 21v-4" />
          <path d="M19 13V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
          <path d="M9 7h2" /><path d="M9 11h2" /><path d="M9 15h2" />
        </svg>
      ),
    },
    {
      label: "Orders",
      href: "/dashboard/orders",
      active: pathname.startsWith("/dashboard/orders"),
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
    },
    {
      label: "Map",
      href: "/dashboard/map/geoapify",
      active: isMapActive,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Fixed Native App-Style Bottom Bar (Mobile Only) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {primaryTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
                tab.active
                  ? "text-blue-600 dark:text-blue-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  tab.active ? "bg-blue-50 dark:bg-blue-500/15" : ""
                }`}
              >
                {tab.icon}
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">{tab.label}</span>
            </Link>
          ))}

          {/* "More" Action Button */}
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
              isMoreOpen
                ? "text-blue-600 dark:text-blue-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <div
              className={`p-1 rounded-lg transition-colors ${
                isMoreOpen ? "bg-blue-50 dark:bg-blue-500/15" : ""
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </div>
            <span className="text-[11px] tracking-tight mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* Modern Slide-Up Bottom Sheet for "More" */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in transition-opacity"
            onClick={closeMore}
            aria-hidden="true"
          />

          {/* Bottom Sheet Modal Container */}
          <div
            className="fixed bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-5 shadow-2xl z-50 text-slate-900 dark:text-slate-100 space-y-4"
          >
            {/* Drag Handle Indicator */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  B
                </div>
                <div>
                  <h3 className="text-sm font-bold">BSM Sales CRM</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">All Modules & Engines</p>
                </div>
              </div>

              <button
                onClick={closeMore}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Menu Links */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                Products & Catalog
              </div>
              <Link
                href="/dashboard/products"
                onClick={closeMore}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/dashboard/products")
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  📦
                </span>
                <span>Product Catalog & SKUs</span>
              </Link>

              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 pt-2">
                Dual Geospatial Engines
              </div>
              <Link
                href="/dashboard/map/google"
                onClick={closeMore}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/dashboard/map/google")
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  🌐
                </span>
                <div className="flex flex-col">
                  <span>Google Maps Engine</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Google JS API live pins</span>
                </div>
              </Link>

              <Link
                href="/dashboard/map/geoapify"
                onClick={closeMore}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/dashboard/map/geoapify")
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  🗺️
                </span>
                <div className="flex flex-col">
                  <span>MapLibre + Geoapify Engine</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Open OSM tiles & live routing</span>
                </div>
              </Link>

              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 pt-2">
                Data Management
              </div>
              <Link
                href="/dashboard/imports"
                onClick={closeMore}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/dashboard/imports")
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  📥
                </span>
                <span>Batch Imports (Excel / Steadfast)</span>
              </Link>

              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 pt-2">
                Preferences & Security
              </div>
              <Link
                href="/dashboard/settings"
                onClick={closeMore}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive("/dashboard/settings")
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  ⚙️
                </span>
                <span>Settings</span>
              </Link>
            </div>

            {/* Profile & Logout Section */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <Link
                href="/dashboard/settings"
                onClick={closeMore}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {avatarLetter}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{adminName}</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      PIN Verified
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 group-hover:text-slate-600">⚙️</span>
              </Link>

              <button
                onClick={handleLogout}
                disabled={logoutPending}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold transition-all active:scale-98 disabled:opacity-50"
              >
                {logoutPending ? "Signing out…" : "🚪 Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
