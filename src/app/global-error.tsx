"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="m-0 bg-slate-950 text-slate-100 font-sans antialiased min-h-screen flex items-center justify-center p-4">
        {/* Ambient glow */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-rose-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-600/15 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">
          {/* Icon */}
          <div className="relative mx-auto w-18 h-18 flex items-center justify-center">
            <div className="absolute inset-0 bg-rose-500/25 rounded-3xl blur-md animate-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20">
              সিস্টেম এরর • System Level Failure
            </span>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              অ্যাপ্লিকেশন লোড করতে সমস্যা হয়েছে
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
              সিস্টেম রুট কম্পোনেন্টে অনাকাঙ্ক্ষিত ত্রুটি ঘটেছে। অনুগ্রহ করে পেজটি পুনরায় রিফ্রেশ করুন।
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/25 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>পুনরায় লোড করুন (Reload)</span>
            </button>

            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>ড্যাশবোর্ডে যান</span>
            </a>
          </div>

          {/* Error Digest */}
          {(error.message || error.digest) && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 text-left overflow-x-auto space-y-1">
              {error.message && <div className="text-rose-400">Error: {error.message}</div>}
              {error.digest && <div className="text-slate-500 text-[10px]">Digest: {error.digest}</div>}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
