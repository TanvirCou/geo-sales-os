"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms, default 4000
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Single Toast Item ───────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    // Trigger enter animation on mount
    const enterTimer = setTimeout(() => setVisible(true), 10);

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 350);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, duration, onDismiss]);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 350);
  };

  const styles: Record<
    ToastType,
    { icon: React.ReactNode; bar: string; bg: string; text: string; border: string }
  > = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />,
      bar: "bg-emerald-500",
      bg: "bg-white dark:bg-slate-900",
      text: "text-slate-800 dark:text-slate-100",
      border: "border-slate-200 dark:border-slate-700",
    },
    error: {
      icon: <XCircle className="w-5 h-5 shrink-0 text-rose-500" />,
      bar: "bg-rose-500",
      bg: "bg-white dark:bg-slate-900",
      text: "text-slate-800 dark:text-slate-100",
      border: "border-slate-200 dark:border-slate-700",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />,
      bar: "bg-amber-500",
      bg: "bg-white dark:bg-slate-900",
      text: "text-slate-800 dark:text-slate-100",
      border: "border-slate-200 dark:border-slate-700",
    },
    info: {
      icon: <Info className="w-5 h-5 shrink-0 text-blue-500" />,
      bar: "bg-blue-500",
      bg: "bg-white dark:bg-slate-900",
      text: "text-slate-800 dark:text-slate-100",
      border: "border-slate-200 dark:border-slate-700",
    },
  };

  const s = styles[toast.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)",
        pointerEvents: visible ? "auto" : "none",
      }}
      className={`
        flex items-start gap-3 w-full max-w-sm
        ${s.bg} ${s.border} border rounded-xl
        shadow-lg shadow-black/10 dark:shadow-black/30
        overflow-hidden
      `}
    >
      {/* Left accent bar */}
      <div className={`w-1 self-stretch ${s.bar} rounded-l-xl shrink-0`} />

      {/* Icon + message */}
      <div className="flex items-start gap-2.5 py-3.5 flex-1 min-w-0">
        {s.icon}
        <p className={`text-sm font-medium leading-snug ${s.text} pr-1`}>
          {toast.message}
        </p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        className="p-2 mt-1.5 mr-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  // Avoid SSR mismatch — only portal after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  const value: ToastContextValue = {
    toast,
    success: useCallback((msg, dur) => toast(msg, "success", dur), [toast]),
    error: useCallback((msg, dur) => toast(msg, "error", dur), [toast]),
    warning: useCallback((msg, dur) => toast(msg, "warning", dur), [toast]),
    info: useCallback((msg, dur) => toast(msg, "info", dur), [toast]),
  };

  const toastContainer = (
    <div
      aria-label="Notifications"
      aria-live="polite"
      className="fixed bottom-24 lg:bottom-6 right-4 z-[9999] flex flex-col gap-2.5 items-end pointer-events-none"
      style={{ maxWidth: "min(calc(100vw - 2rem), 380px)" }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Portal renders directly on <body> — escapes any overflow:hidden parent */}
      {mounted && createPortal(toastContainer, document.body)}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
