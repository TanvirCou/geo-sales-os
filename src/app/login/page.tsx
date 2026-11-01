"use client";

import { useState, useTransition, useRef } from "react";
import { loginAction } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Phone, Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phoneRef = useRef<HTMLInputElement>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
    setError(null);
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Move focus forward
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled and phone is present
    if (value && index === 5 && newPin.every((d) => d)) {
      handleSubmit(newPin.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleSubmit(pin.join(""));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newPin = [...pin];
    pasted.split("").forEach((ch, i) => {
      newPin[i] = ch;
    });
    setPin(newPin);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) {
      handleSubmit(pasted);
    }
  };

  const handleSubmit = (pinValue: string) => {
    if (pinValue.length !== 6) return;
    if (!phone.trim()) {
      setError("Please enter your mobile phone number.");
      phoneRef.current?.focus();
      return;
    }

    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("phone", phone.trim());
      fd.set("pin", pinValue);
      const result = await loginAction(fd);
      if (result?.error) {
        setError(result.error);
        setPin(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    });
  };

  const filledCount = pin.filter(Boolean).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-hidden p-4 transition-colors duration-150">
      {/* Subtle Dot Grid Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(100,116,139,0.12)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Floating Theme Toggle (Top-Right) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Ambient background glow effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/10 dark:bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-sky-400/10 dark:bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-7 sm:p-8 backdrop-blur-2xl shadow-xl shadow-slate-300/40 dark:shadow-2xl dark:shadow-black/80 space-y-6 animate-fade-in transition-colors duration-150">
        {/* Brand header */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              GeoSales OS
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Territory Sales & Team OS</p>
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800/80" />

        {/* Form Inputs */}
        <div className="space-y-4">
          {/* Mobile Number Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              <span>Mobile Number</span>
            </label>
            <div className="relative">
              <input
                ref={phoneRef}
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="01859594373"
                autoFocus
                disabled={isPending}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-500/20 disabled:opacity-50 transition-all font-mono"
              />
            </div>
          </div>

          {/* 6-Digit PIN Prompt & Inputs */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                <span>6-Digit Access PIN</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Secret PIN</span>
            </label>

            {/* PIN input boxes */}
            <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
              {pin.map((digit, i) => (
                <input
                  key={i}
                  id={`pin-${i}`}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={isPending}
                  autoComplete="off"
                  className="w-full aspect-square bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700/80 rounded-xl text-center text-xl font-bold font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/15 dark:focus:ring-blue-500/20 disabled:opacity-50 transition-all cursor-text"
                  aria-label={`PIN digit ${i + 1}`}
                />
              ))}
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pt-1">
              {pin.map((d, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    d ? "bg-blue-600 dark:bg-blue-500 scale-125" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-rose-500 dark:text-rose-400">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          id="login-submit-btn"
          onClick={() => handleSubmit(pin.join(""))}
          disabled={filledCount < 6 || isPending || !phone.trim()}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
        >
          {isPending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <span>Verifying credentials…</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          5 incorrect attempts will temporarily lock the account for 15 minutes.
        </p>
      </div>
    </div>
  );
}
