"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, Lock, User, Phone, CheckCircle2, ShieldOff, Building2 } from "lucide-react";
import { ROLE_LABELS } from "@/lib/permissions";

interface AccessDeniedProps {
  moduleName?: string;
  userRole?: string;
  userName?: string;
  userPhone?: string;
  reason?: string;
}

export default function AccessDenied({
  moduleName = "Batch Data Imports",
  userRole = "CUSTOM",
  userName = "ব্যবহারকারী",
  userPhone,
  reason,
}: AccessDeniedProps) {
  const roleMeta = ROLE_LABELS[userRole] || {
    label: userRole,
    description: "কাস্টম পারমিশন",
    badgeClass: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20",
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      {/* Ambient background glows */}
      <div className="relative w-full max-w-xl">
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-amber-500/10 dark:bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-rose-500/10 dark:bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Access Denied Card */}
        <div className="relative z-10 bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-slate-300/40 dark:shadow-black/70 space-y-6 text-center animate-fade-in">
          {/* Animated Lock Shield Icon */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/20 dark:bg-amber-500/25 rounded-3xl blur-md animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ShieldOff className="w-8 h-8" />
            </div>
          </div>

          {/* Heading & Subheading */}
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              <Lock className="w-3.5 h-3.5" />
              <span>এক্সেস অনুমতি নেই • Access Restricted</span>
            </span>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              আপনার রোলের জন্য এই ফিচারে এক্সেস নেই
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              প্রিয় <strong className="text-slate-800 dark:text-slate-200">{userName}</strong>, আপনার বর্তমান রোল অনুযায়ী <span className="font-semibold text-slate-800 dark:text-slate-200">“{moduleName}”</span> মডিউলে প্রবেশের অনুমতি দেওয়া হয়নি।
            </p>
          </div>

          {/* Context Details Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-left space-y-3.5">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              অ্যাকাউন্ট ও রোলের বিবরণ (Account Context)
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {userName}
                  </div>
                  {userPhone && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      <span>{userPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">নির্ধারিত রোল:</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${roleMeta.badgeClass}`}
                >
                  {roleMeta.label}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span>কারণ: {reason || "এই অ্যাকাউন্টের জন্য 'canImport' (বাল্ক এক্সেল ইম্পোর্ট) পারমিশন নিষ্ক্রিয় রয়েছে।"}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                আপনার কাজের সুবিধার্থে এই ফিচারের প্রয়োজন হলে, অনুগ্রহ করে সিস্টেম অ্যাডমিনের সাথে যোগাযোগ করুন। অ্যাডমিন সেটিংস থেকে আপনার রোলের পারমিশন সক্রিয় করে দিতে পারবেন।
              </p>
            </div>
          </div>

          {/* Action Navigation Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ড্যাশবোর্ডে ফিরে যান (Dashboard)</span>
            </Link>

            <Link
              href="/dashboard/businesses"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>বিজনেস তালিকা দেখুন</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
