import Link from "next/link";
import { FileQuestion, ArrowLeft, Home, Building2, Package } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg">
        {/* Ambient glow */}
        <div className="absolute -top-12 -left-12 w-56 h-56 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-56 h-56 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl text-center space-y-6 animate-fade-in">
          {/* Icon */}
          <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <FileQuestion className="w-8 h-8" />
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
              404 • ডেটা পাওয়া যায়নি
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              নির্দিষ্ট রেকর্ডটি বিদ্যমান নেই
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
              আপনি যে ব্যবসা প্রতিষ্ঠান, অর্ডার বা রেকর্ড দেখতে চাইছেন, তা ডেটাবেজে খুঁজে পাওয়া যায়নি অথবা মুছে ফেলা হয়েছে।
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>ড্যাশবোর্ড ওভারভিউ</span>
            </Link>

            <Link
              href="/dashboard/businesses"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-blue-500" />
              <span>ব্যবসা তালিকা</span>
            </Link>

            <Link
              href="/dashboard/orders"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-95 transition-all cursor-pointer"
            >
              <Package className="w-4 h-4 text-amber-500" />
              <span>অর্ডার তালিকা</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
