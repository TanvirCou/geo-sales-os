import { Compass, Navigation } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Ambient background glow orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/10 dark:bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Center Radar Loading Card */}
      <div className="relative z-10 w-full max-w-sm mx-auto bg-white/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-8 sm:p-10 backdrop-blur-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/70 flex flex-col items-center text-center space-y-6 animate-fade-in">
        
        {/* Animated Geospatial Radar Icon */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Pulsing radar ripple ring 1 */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 dark:border-blue-400/30 radar-ping" />
          
          {/* Pulsing radar ripple ring 2 */}
          <div 
            className="absolute inset-2 rounded-full border-2 border-cyan-500/25 dark:border-cyan-400/25 radar-ping" 
            style={{ animationDelay: "0.8s" }} 
          />

          {/* Rotating dashed navigation ring */}
          <div className="absolute inset-1 rounded-full border border-dashed border-slate-300 dark:border-slate-700 spin-slow" />

          {/* Core Glowing Orb */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/40">
            <Compass className="w-7 h-7 animate-pulse" />
          </div>
        </div>

        {/* Brand & Loading Status */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            <span>GeoSales OS • লোডিং হচ্ছে</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            ডেটা সিনক্রোনাইজেশন হচ্ছে
          </h2>

          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
            লোকেশন, টেরিটরি ম্যাপ ও সেলস অ্যানালিটিক্স প্রস্তুত করা হচ্ছে...
          </p>
        </div>

        {/* Smooth Shimmer Progress Bar */}
        <div className="w-full space-y-2 pt-2">
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
