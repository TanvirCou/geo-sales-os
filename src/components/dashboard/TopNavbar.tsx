"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (pathname === "/dashboard") {
    return [{ label: "Overview" }];
  }

  // Dedicated Business Details route: /dashboard/businesses/[id]
  if (pathname.startsWith("/dashboard/businesses/")) {
    return [
      { label: "Businesses", href: "/dashboard/businesses" },
      { label: "Business Details" },
    ];
  }

  // Dedicated Order Details route: /dashboard/orders/[id]
  if (pathname.startsWith("/dashboard/orders/")) {
    return [
      { label: "Field Orders", href: "/dashboard/orders" },
      { label: "Order Details" },
    ];
  }

  // Top level sections
  if (pathname === "/dashboard/businesses") {
    return [{ label: "Businesses & Prospects" }];
  }
  if (pathname === "/dashboard/products") {
    return [{ label: "Product Catalog" }];
  }
  if (pathname === "/dashboard/orders") {
    return [{ label: "Field Orders" }];
  }
  if (pathname === "/dashboard/imports") {
    return [{ label: "Data Imports" }];
  }
  if (pathname === "/dashboard/settings") {
    return [{ label: "Account Settings" }];
  }
  if (pathname === "/dashboard/map/google") {
    return [
      { label: "Map Engine", href: "/dashboard/map/geoapify" },
      { label: "Google Maps" },
    ];
  }
  if (pathname.startsWith("/dashboard/map")) {
    return [
      { label: "Map Engine", href: "/dashboard/map/geoapify" },
      { label: "Geoapify Engine" },
    ];
  }

  // Fallback for any other path
  const segments = pathname.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Overview" }];
  return segments.map((seg, idx) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: idx < segments.length - 1 ? `/dashboard/${segments.slice(0, idx + 1).join("/")}` : undefined,
  }));
}

export function TopNavbar() {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname);

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

        {/* Hierarchical Breadcrumb Path */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
          <Link
            href="/dashboard"
            className="hidden lg:inline text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-medium shrink-0"
          >
            Dashboard
          </Link>

          {crumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
              <span className="text-slate-300 dark:text-slate-600">/</span>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors font-medium truncate max-w-[120px] sm:max-w-none"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-slate-900 dark:text-slate-100 font-semibold truncate max-w-[140px] sm:max-w-xs md:max-w-md">
                  {crumb.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Right Actions: Theme Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Theme Toggle Button */}
        <ThemeToggle />
      </div>
    </header>
  );
}
