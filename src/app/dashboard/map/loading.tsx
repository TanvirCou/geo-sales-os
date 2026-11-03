import { MapPin, Navigation } from "lucide-react";

export default function MapLoading() {
  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col animate-fade-in">
      {/* Top Filter & Search Bar Skeleton */}
      <div className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px] max-w-md">
          <div className="skeleton h-10 w-full rounded-xl" />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="skeleton h-9 w-24 rounded-xl" />
          <div className="skeleton h-9 w-28 rounded-xl" />
          <div className="skeleton h-9 w-24 rounded-xl" />
          <div className="skeleton h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Map Canvas Skeleton Area */}
      <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-hidden">
        {/* Subtle Map Coordinate Grid lines */}
        <div
          className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(148, 163, 184, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(148, 163, 184, 0.25) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Floating Pin Skeletons */}
        <div className="absolute top-1/4 left-1/3 skeleton w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />
        <div className="absolute top-1/2 left-1/5 skeleton w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />
        <div className="absolute top-1/3 right-1/4 skeleton w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />
        <div className="absolute bottom-1/3 right-1/3 skeleton w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md" />

        {/* Central Radar Pulse */}
        <div className="relative z-10 flex flex-col items-center text-center p-6 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl max-w-xs space-y-4">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 radar-ping" />
            <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
              <MapPin className="w-6 h-6 animate-bounce" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              ম্যাপ ইঞ্জিন লোড হচ্ছে...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ক্লায়েন্ট লোকেশন ও প্রসপেক্টস ডেটা সিঙ্ক করা হচ্ছে
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 font-mono font-medium">
            <Navigation className="w-3 h-3 animate-spin" />
            <span>CALIBRATING GPS BOUNDS</span>
          </div>
        </div>
      </div>

      {/* Bottom Floating Legend Bar Skeleton */}
      <div className="p-2.5 sm:p-3 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="skeleton h-4 w-28 rounded-md" />
          <div className="skeleton h-4 w-32 rounded-md" />
        </div>
        <div className="skeleton h-4 w-20 rounded-md" />
      </div>
    </div>
  );
}
