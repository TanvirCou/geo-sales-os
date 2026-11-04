import { Compass, Navigation } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden select-none">
      {/* Ambient background glow orbs - scaled for mobile */}
      <div className="absolute top-1/4 -left-16 sm:-left-20 w-48 sm:w-80 h-48 sm:h-80 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-2xl sm:blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-16 sm:-right-20 w-48 sm:w-80 h-48 sm:h-80 bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-2xl sm:blur-3xl pointer-events-none" />

      {/* Center Radar Loading Card - optimized for mobile & desktop */}
      <div className="relative z-10 w-full max-w-[330px] sm:max-w-sm mx-auto bg-white/95 dark:bg-slate-900/85 border border-slate-200/90 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 md:p-10 backdrop-blur-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/70 flex flex-col items-center text-center space-y-5 sm:space-y-6 animate-fade-in">
        
        {/* Animated Geospatial Radar Icon */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          {/* Pulsing radar ripple ring 1 */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 dark:border-blue-400/30 radar-ping" />
          
          {/* Pulsing radar ripple ring 2 */}
          <div 
            className="absolute inset-1.5 sm:inset-2 rounded-full border-2 border-cyan-500/25 dark:border-cyan-400/25 radar-ping" 
            style={{ animationDelay: "0.8s" }} 
          />

          {/* Rotating dashed navigation ring */}
          <div className="absolute inset-1 rounded-full border border-dashed border-slate-300 dark:border-slate-700 spin-slow" />

          {/* Core Glowing Orb */}
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40">
            <Compass className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
          </div>
        </div>

        {/* Brand & Loading Status */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            <span>GeoSales OS • Loading</span>
          </div>

          <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Synchronizing Data...
          </h2>

          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed px-1">
            Preparing locations, territory maps, and sales analytics...
          </p>
        </div>

        {/* Smooth Shimmer Progress Bar */}
        <div className="w-full space-y-1.5 sm:space-y-2 pt-1">
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 skeleton rounded-full" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            <span>CONNECTING...</span>
            <span className="flex items-center gap-1">
              <Navigation className="w-2.5 h-2.5 animate-spin" />
              <span>BD REGION</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
