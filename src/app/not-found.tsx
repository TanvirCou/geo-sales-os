import Link from "next/link";
import { Compass, Home, MapPin, Building2, Package, Settings, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-rose-500/10 dark:bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl mx-auto text-center space-y-6 sm:space-y-8 animate-fade-in">
        
        {/* 404 Animated Visual Header */}
        <div className="relative inline-flex flex-col items-center">
          <div className="relative w-28 h-28 flex items-center justify-center mb-2">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-rose-500/20 dark:border-rose-400/20 radar-ping" />
            <div className="absolute inset-2 rounded-full border border-dashed border-slate-300 dark:border-slate-700 spin-slow" />
            
            {/* Center Orb */}
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xl shadow-rose-500/25">
              <Compass className="w-8 h-8" />
            </div>
          </div>

          <div className="text-6xl sm:text-7xl font-black tracking-tight font-mono bg-gradient-to-r from-rose-600 via-indigo-600 to-blue-600 dark:from-rose-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
            404
          </div>
        </div>

        {/* Text Details */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
            <MapPin className="w-3.5 h-3.5" />
            <span>স্থানাঙ্ক মেলেনি • Coordinates Out of Range</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            পেজটি খুঁজে পাওয়া যায়নি
          </h1>

          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            আপনি যে পেজ বা লোকেশনে প্রবেশের চেষ্টা করছেন, তা মুছে ফেলা হয়েছে অথবা লিংকটিতে কোনো ত্রুটি রয়েছে।
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/25 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>ড্যাশবোর্ডে ফিরে যান</span>
          </Link>

          <Link
            href="/dashboard/map"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-emerald-500" />
            <span>লাইভ ম্যাপ দেখুন</span>
          </Link>
        </div>

        {/* Quick Nav Shortcut Cards */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            গুরুত্বপূর্ণ মডিউল শর্টকাট (Quick Shortcuts)
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { href: "/dashboard/map", label: "টেরিটরি ম্যাপ", icon: MapPin, color: "text-emerald-500" },
              { href: "/dashboard/businesses", label: "ব্যবসা প্রতিষ্ঠান", icon: Building2, color: "text-blue-500" },
              { href: "/dashboard/orders", label: "অর্ডার ট্র্যাকিং", icon: Package, color: "text-amber-500" },
              { href: "/dashboard/settings", label: "সিস্টেম সেটিংস", icon: Settings, color: "text-purple-500" },
            ].map((mod, i) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={i}
                  href={mod.href}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 transition-all text-left flex items-center gap-2 group shadow-xs cursor-pointer"
                >
                  <Icon className={`w-4 h-4 ${mod.color} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {mod.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
