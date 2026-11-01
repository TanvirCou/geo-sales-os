"use client";

import { X, RotateCcw, CheckCircle2 } from "lucide-react";
import { UnifiedMapPoint } from "./BusinessMapFilters";

interface RestoreBusinessFromMapModalProps {
  business: UnifiedMapPoint | null;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RestoreBusinessFromMapModal({
  business,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: RestoreBusinessFromMapModalProps) {
  if (!isOpen || !business) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Re-activate / Restore Client
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Re-activate and return this account to the active directory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business summary card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {business.name}
            </span>
            <span className="px-2 py-0.5 rounded-full font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              📁 Archived
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            {business.category} • {business.address}
          </p>
          {business.phoneRaw && (
            <p className="text-slate-500 dark:text-slate-400">
              Phone: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{business.phoneRaw}</span>
            </p>
          )}
        </div>

        {/* Helpful Info Callout */}
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          <div>
            Re-activating this business will immediately turn its map marker <strong>Green (🟢 Client)</strong>. All <strong>{business.orderCount || 0} historical order(s)</strong> remain completely intact.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isPending}
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Restoring…</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm & Restore</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
