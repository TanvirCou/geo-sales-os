"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Terminal, ChevronDown, ChevronUp } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error("Dashboard Module Error Boundary Caught:", error);
  }, [error]);

  const handleRetry = () => {
    setIsRetrying(true);
    reset();
    setTimeout(() => setIsRetrying(false), 1000);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        {/* Ambient glow */}
        <div className="absolute -top-12 -left-12 w-60 h-60 bg-rose-500/10 dark:bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-60 h-60 bg-amber-500/10 dark:bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl text-center space-y-6 animate-fade-in">
          {/* Icon */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/25">
            <AlertCircle className="w-8 h-8 animate-pulse" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
              মডিউল ত্রুটি • Module Error
            </span>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              এই সেকশনটি লোড করা সম্ভব হয়নি
            </h2>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              সার্ভার বা ডেটাবেজ সংযোগে সাময়িক সমস্যা দেখা দিয়েছে। পুনরায় রিলোড করে চেষ্টা করতে পারেন।
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`} />
              <span>{isRetrying ? "চেষ্টা করা হচ্ছে..." : "পুনরায় চেষ্টা করুন (Retry)"}</span>
            </button>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>ড্যাশবোর্ড হোম</span>
            </Link>
          </div>

          {/* Technical Collapsible */}
          <div className="pt-2 text-left">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-[11px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-slate-400" />
                <span>ত্রুটির বিবরণ (Debug Info)</span>
              </span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDetails && (
              <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-[10px] leading-relaxed border border-slate-800 overflow-x-auto space-y-1">
                <div className="text-rose-400 font-semibold">
                  {error.message || "An unexpected error occurred."}
                </div>
                {error.digest && (
                  <div className="text-slate-500">
                    Digest ID: {error.digest}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
