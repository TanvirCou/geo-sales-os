"use client";

import { useState, useTransition } from "react";
import { updateAdminName, changeAdminPin } from "@/actions/settings";
import { logoutAction } from "@/actions/auth";

interface SettingsClientProps {
  initialName: string;
}

export default function SettingsClient({ initialName }: SettingsClientProps) {
  const [adminName, setAdminName] = useState(initialName);
  const [nameInput, setNameInput] = useState(initialName);

  // PIN Form States
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Show/Hide PIN toggles
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Feedback Messages
  const [nameFeedback, setNameFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [pinFeedback, setPinFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [isNamePending, startNameTransition] = useTransition();
  const [isPinPending, startPinTransition] = useTransition();
  const [isLogoutPending, startLogoutTransition] = useTransition();

  // Handle Name Update
  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    setNameFeedback(null);

    if (!nameInput.trim() || nameInput.trim().length < 2) {
      setNameFeedback({ text: "Name must be at least 2 characters long.", type: "error" });
      return;
    }

    startNameTransition(async () => {
      const res = await updateAdminName(nameInput);
      if (res.error) {
        setNameFeedback({ text: res.error, type: "error" });
      } else if (res.success && res.name) {
        setAdminName(res.name);
        setNameFeedback({ text: `Admin name updated to "${res.name}" successfully!`, type: "success" });
      }
    });
  };

  // Handle PIN Change
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinFeedback(null);

    // Frontend validations
    if (!/^\d{6}$/.test(currentPin)) {
      setPinFeedback({ text: "Current PIN must be exactly 6 digits.", type: "error" });
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      setPinFeedback({ text: "New PIN must be exactly 6 digits (numbers only).", type: "error" });
      return;
    }

    if (newPin !== confirmPin) {
      setPinFeedback({ text: "New PIN and Confirm PIN do not match.", type: "error" });
      return;
    }

    if (currentPin === newPin) {
      setPinFeedback({ text: "New PIN cannot be the same as your current PIN.", type: "error" });
      return;
    }

    startPinTransition(async () => {
      const res = await changeAdminPin({
        currentPin,
        newPin,
        confirmPin,
      });

      if (res.error) {
        setPinFeedback({ text: res.error, type: "error" });
      } else if (res.success) {
        setPinFeedback({
          text: res.message || "PIN changed successfully! Use your new PIN for future logins.",
          type: "success",
        });
        // Clear PIN fields after success
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      }
    });
  };

  const handleLogout = () => {
    startLogoutTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ─── 1. Admin Profile Card ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg shadow-inner">
            👤
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Administrator Profile
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Update the display name shown across the system and navigation.
            </p>
          </div>
        </div>

        {nameFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between ${
              nameFeedback.type === "error"
                ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300"
                : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <span>{nameFeedback.text}</span>
            <button
              onClick={() => setNameFeedback(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div className="max-w-md space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Admin Display Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Operations Manager, Admin User"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Current registered name: <strong className="text-slate-800 dark:text-slate-200">{adminName}</strong>
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isNamePending || nameInput.trim() === adminName}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm shadow-blue-600/30 transition-colors duration-150 active:scale-95 disabled:opacity-50"
            >
              {isNamePending ? "Saving Name…" : "Save Name"}
            </button>
          </div>
        </form>
      </div>

      {/* ─── 2. Security PIN Change Card ───────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shadow-inner">
            🔐
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Change Security PIN
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Provide your existing PIN to authorize setting a new 6-digit login PIN.
            </p>
          </div>
        </div>

        {pinFeedback && (
          <div
            className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between ${
              pinFeedback.type === "error"
                ? "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300"
                : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <span>{pinFeedback.text}</span>
            <button
              onClick={() => setPinFeedback(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleChangePin} className="space-y-5 max-w-md">
          {/* Step 1: Current PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Current PIN (আগের পিন) *</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                6 digits
              </span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPin ? "text" : "password"}
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter current 6-digit PIN"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono tracking-widest shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded"
              >
                {showCurrentPin ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800" />

          {/* Step 2: New PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>New PIN (নতুন পিন) *</span>
              <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                6 digits
              </span>
            </label>
            <div className="relative">
              <input
                type={showNewPin ? "text" : "password"}
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter new 6-digit PIN"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono tracking-widest shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded"
              >
                {showNewPin ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Step 3: Confirm New PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Confirm New PIN (নতুন পিন পুনরায় লিখুন) *</span>
              {confirmPin && (
                <span
                  className={`text-[11px] font-semibold ${
                    newPin === confirmPin
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {newPin === confirmPin ? "✓ PIN Matches" : "✕ Must match"}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? "text" : "password"}
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Re-enter new 6-digit PIN"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono tracking-widest shadow-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs px-1.5 py-0.5 rounded"
              >
                {showConfirmPin ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isPinPending ||
                currentPin.length !== 6 ||
                newPin.length !== 6 ||
                confirmPin.length !== 6 ||
                newPin !== confirmPin
              }
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm shadow-blue-600/30 transition-colors duration-150 active:scale-95 disabled:opacity-40"
            >
              {isPinPending ? "Verifying & Updating PIN…" : "Confirm & Change PIN"}
            </button>
          </div>
        </form>
      </div>

      {/* ─── 3. Session & Security Info ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Active Session & System Security
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Session Status</span>
            <div className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Authenticated (PIN Active)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Database Node</span>
            <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">
              PostgreSQL 5432
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Session Duration</span>
            <div className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
              8 Hours Rolling Expiry
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign out will securely invalidate your current session cookie.
          </p>
          <button
            onClick={handleLogout}
            disabled={isLogoutPending}
            className="px-4 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold transition-colors duration-150"
          >
            {isLogoutPending ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      </div>
    </div>
  );
}
