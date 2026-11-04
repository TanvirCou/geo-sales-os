import { MapPin, Navigation } from "lucide-react";

export default function MapLoading() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in w-full pb-6">
      {/* 1. Header Area Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/90 dark:border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="skeleton h-6 sm:h-7 w-44 sm:w-56 rounded-xl" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
          <div className="skeleton h-3.5 w-60 sm:w-96 rounded-md" />
        </div>
      </div>

      {/* 2. Map Filter Command Bar Skeleton (Mobile Scrollable) */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input skeleton */}
        <div className="skeleton h-10 w-full md:w-80 rounded-xl shrink-0" />

        {/* Filter pills horizontal scroll row for mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1">
          <div className="skeleton h-9 w-24 rounded-xl shrink-0" />
          <div className="skeleton h-9 w-24 rounded-xl shrink-0" />
          <div className="skeleton h-9 w-24 rounded-xl shrink-0" />
          <div className="skeleton h-9 w-28 rounded-xl shrink-0" />
        </div>
      </div>

      {/* 3. Main Map Canvas Skeleton Container */}
      <div className="relative w-full h-[55vh] min-h-[360px] sm:min-h-[480px] lg:h-[calc(100vh-16rem)] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col justify-between">
        
        {/* Map Coordinate Grid Lines */}
        <div
          className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        {/* Floating Pin Skeletons */}
        <div className="absolute top-1/4 left-1/4 skeleton w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />
        <div className="absolute top-1/2 left-1/6 skeleton w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />
        <div className="absolute top-1/3 right-1/4 skeleton w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />
        <div className="absolute bottom-1/4 right-1/3 skeleton w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />

        {/* Central Radar Pulse Card (Properly padded for mobile) */}
        <div className="relative z-10 m-auto flex flex-col items-center text-center p-4 sm:p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl max-w-[270px] sm:max-w-xs space-y-3 sm:space-y-4">
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 radar-ping" />
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Loading Map Engine...
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Syncing client locations and prospect data...
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">
            <Navigation className="w-3 h-3 animate-spin" />
            <span>CALIBRATING GPS BOUNDS</span>
          </div>
        </div>

        {/* Bottom Floating Stats Bar Skeleton */}
        <div className="relative z-10 p-2.5 sm:p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="skeleton h-3.5 w-20 sm:w-28 rounded-md" />
            <div className="skeleton h-3.5 w-24 sm:w-32 rounded-md" />
          </div>
          <div className="skeleton h-3.5 w-16 rounded-md" />
        </div>
      </div>
    </div>
  );
}
