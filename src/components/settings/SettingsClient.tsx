"use client";

import { useState, useTransition } from "react";
import { updateAdminName, changeAdminPin } from "@/actions/settings";
import {
  createTeamMember,
  updateTeamMember,
  resetMemberPin,
  deleteTeamMember,
  TeamMemberItem,
} from "@/actions/team";
import { logoutAction } from "@/actions/auth";
import { ROLE_LABELS, CustomPermissions } from "@/lib/permissions";
import {
  Shield,
  User,
  Users,
  KeyRound,
  Plus,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  RotateCcw,
  Check,
  AlertTriangle,
  Lock,
  Phone,
  Search,
} from "lucide-react";

interface CurrentUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  permissions?: any;
}

interface SettingsClientProps {
  currentUser: CurrentUser;
  initialTeamMembers: TeamMemberItem[];
}

export default function SettingsClient({
  currentUser,
  initialTeamMembers,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "team">("profile");

  // ─── Profile & PIN Form States ─────────────────────────────────────────────
  const [adminName, setAdminName] = useState(currentUser.name);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const [nameFeedback, setNameFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [pinFeedback, setPinFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [isNamePending, startNameTransition] = useTransition();
  const [isPinPending, startPinTransition] = useTransition();
  const [isLogoutPending, startLogoutTransition] = useTransition();

  // ─── Team Members State ───────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMemberItem[]>(initialTeamMembers);
  const [teamSearch, setTeamSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modals
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberItem | null>(null);
  const [resetPinMember, setResetPinMember] = useState<TeamMemberItem | null>(null);
  const [deletingMember, setDeletingMember] = useState<TeamMemberItem | null>(null);

  // Form states for Add / Edit Member
  const [formMemberName, setFormMemberName] = useState("");
  const [formMemberPhone, setFormMemberPhone] = useState("");
  const [formMemberPin, setFormMemberPin] = useState("123456");
  const [formMemberRole, setFormMemberRole] = useState<"ADMIN" | "MODERATOR" | "MARKETER" | "CUSTOM">("MARKETER");
  const [formCustomPerms, setFormCustomPerms] = useState<CustomPermissions>({
    canAddBusiness: false,
    canEditBusiness: false,
    canDeleteBusiness: false,
    canRecordOrder: false,
    canUpdateOrder: false,
    canDeleteOrder: false,
    canManageProducts: false,
    canDeleteProduct: false,
    canImport: false,
  });
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const [memberFormSuccess, setMemberFormSuccess] = useState<string | null>(null);
  const [isMemberPending, startMemberTransition] = useTransition();

  // Reset PIN Form State
  const [resetPinValue, setResetPinValue] = useState("");
  const [resetPinError, setResetPinError] = useState<string | null>(null);

  // ─── Profile Handlers ─────────────────────────────────────────────────────
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
        setNameFeedback({ text: `Name updated to "${res.name}" successfully!`, type: "success" });
      }
    });
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinFeedback(null);

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
      const res = await changeAdminPin({ currentPin, newPin, confirmPin });
      if (res.error) {
        setPinFeedback({ text: res.error, type: "error" });
      } else if (res.success) {
        setPinFeedback({
          text: res.message || "PIN changed successfully! Use your new PIN for future logins.",
          type: "success",
        });
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

  // ─── Team Handlers ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setFormMemberName("");
    setFormMemberPhone("");
    setFormMemberPin("123456");
    setFormMemberRole("MARKETER");
    setFormCustomPerms({
      canAddBusiness: false,
      canEditBusiness: false,
      canDeleteBusiness: false,
      canRecordOrder: false,
      canUpdateOrder: false,
      canDeleteOrder: false,
      canManageProducts: false,
      canDeleteProduct: false,
      canImport: false,
    });
    setMemberFormError(null);
    setMemberFormSuccess(null);
    setIsAddMemberOpen(true);
  };

  const openEditModal = (member: TeamMemberItem) => {
    setEditingMember(member);
    setFormMemberName(member.name);
    setFormMemberPhone(member.phone);
    setFormMemberRole(member.role);
    setFormCustomPerms(
      member.permissions || {
        canAddBusiness: false,
        canEditBusiness: false,
        canDeleteBusiness: false,
        canRecordOrder: false,
        canUpdateOrder: false,
        canDeleteOrder: false,
        canManageProducts: false,
        canDeleteProduct: false,
        canImport: false,
      }
    );
    setMemberFormError(null);
    setMemberFormSuccess(null);
  };

  const handleSaveMember = () => {
    setMemberFormError(null);
    setMemberFormSuccess(null);

    if (isAddMemberOpen) {
      // Create Member
      startMemberTransition(async () => {
        const res = await createTeamMember({
          name: formMemberName,
          phone: formMemberPhone,
          pin: formMemberPin,
          role: formMemberRole,
          permissions: formMemberRole === "CUSTOM" ? formCustomPerms : null,
        });

        if (res.error) {
          setMemberFormError(res.error);
        } else if (res.success && res.user) {
          setTeamMembers((prev) => [
            ...prev,
            {
              id: res.user!.id,
              name: res.user!.name,
              phone: res.user!.phone,
              role: res.user!.role as any,
              permissions: formMemberRole === "CUSTOM" ? formCustomPerms : null,
              isActive: true,
              createdAt: new Date().toISOString(),
            },
          ]);
          setIsAddMemberOpen(false);
        }
      });
    } else if (editingMember) {
      // Update Member
      startMemberTransition(async () => {
        const res = await updateTeamMember(editingMember.id, {
          name: formMemberName,
          role: formMemberRole,
          permissions: formMemberRole === "CUSTOM" ? formCustomPerms : null,
        });

        if (res.error) {
          setMemberFormError(res.error);
        } else if (res.success) {
          setTeamMembers((prev) =>
            prev.map((m) =>
              m.id === editingMember.id
                ? {
                    ...m,
                    name: formMemberName,
                    role: formMemberRole,
                    permissions: formMemberRole === "CUSTOM" ? formCustomPerms : null,
                  }
                : m
            )
          );
          setEditingMember(null);
        }
      });
    }
  };

  const handleToggleMemberActive = (member: TeamMemberItem) => {
    startMemberTransition(async () => {
      const newStatus = !member.isActive;
      const res = await updateTeamMember(member.id, {
        name: member.name,
        role: member.role,
        isActive: newStatus,
      });

      if (res.success) {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === member.id ? { ...m, isActive: newStatus } : m))
        );
      }
    });
  };

  const handleResetPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinMember) return;
    setResetPinError(null);

    if (!/^\d{6}$/.test(resetPinValue.trim())) {
      setResetPinError("PIN must be exactly 6 digits.");
      return;
    }

    startMemberTransition(async () => {
      const res = await resetMemberPin(resetPinMember.id, resetPinValue);
      if (res.error) {
        setResetPinError(res.error);
      } else if (res.success) {
        setResetPinMember(null);
        setResetPinValue("");
      }
    });
  };

  const handleDeleteMember = () => {
    if (!deletingMember) return;
    startMemberTransition(async () => {
      const res = await deleteTeamMember(deletingMember.id);
      if (res.success) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== deletingMember.id));
        setDeletingMember(null);
      }
    });
  };

  // Filtered members list
  const filteredMembers = teamMembers.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      m.phone.toLowerCase().includes(teamSearch.toLowerCase());
    const matchesRole = roleFilter === "ALL" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const memberStats = {
    total: teamMembers.length,
    admins: teamMembers.filter((m) => m.role === "ADMIN").length,
    moderators: teamMembers.filter((m) => m.role === "MODERATOR").length,
    marketers: teamMembers.filter((m) => m.role === "MARKETER").length,
    custom: teamMembers.filter((m) => m.role === "CUSTOM").length,
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ─── Top Navigation Tabs ────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3.5 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Security</span>
        </button>

        {currentUser.role === "ADMIN" && (
          <button
            onClick={() => setActiveTab("team")}
            className={`pb-3.5 px-3 sm:px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "team"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team & Role Management</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {teamMembers.length}
            </span>
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: PROFILE & SECURITY                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-8 animate-fade-in">
          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-600/20">
                  {adminName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{adminName}</span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                        ROLE_LABELS[currentUser.role]?.badgeClass || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {ROLE_LABELS[currentUser.role]?.label || currentUser.role}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span className="font-mono">{currentUser.phone}</span>
                  </p>
                </div>
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
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div className="max-w-md space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Display Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Tanvir, Operations Lead"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isNamePending || nameInput.trim() === adminName}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm shadow-blue-600/30 transition-colors duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isNamePending ? "Saving Name…" : "Save Name"}
                </button>
              </div>
            </form>
          </div>

          {/* Change PIN Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shadow-inner">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Change Access PIN
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Provide your current PIN to authorize setting a new 6-digit login PIN.
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
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current PIN (বর্তমান পিন) *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPin ? "text" : "password"}
                    maxLength={6}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPin(!showCurrentPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New PIN (নতুন ৬ ডিজিট পিন) *
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? "text" : "password"}
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirm New PIN (নতুন পিন কনফার্ম করুন) *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? "text" : "password"}
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPinPending || newPin.length !== 6 || confirmPin.length !== 6}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isPinPending ? "Updating PIN…" : "Update PIN"}
                </button>
              </div>
            </form>
          </div>

          {/* Session & Sign Out Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Active Session & Security
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your session is securely authenticated. Click sign out to invalidate this session.
                </p>
              </div>

              <button
                onClick={handleLogout}
                disabled={isLogoutPending}
                className="px-4 py-2 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs sm:text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span>🚪</span>
                <span>{isLogoutPending ? "Signing Out…" : "Sign Out"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: TEAM & ROLE MANAGEMENT (ADMIN ONLY)                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "team" && currentUser.role === "ADMIN" && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Team Members</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
                {memberStats.total}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Administrators</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
                {memberStats.admins}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Moderators</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
                {memberStats.moderators}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Marketers (View Only)</span>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
                {memberStats.marketers}
              </div>
            </div>
          </div>

          {/* Action Bar: Search & Add Member */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search team member by name or mobile..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="MODERATOR">Moderator</option>
                <option value="MARKETER">Marketer</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>

            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Member</span>
            </button>
          </div>

          {/* Team Members Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3.5 min-w-[200px]">Member</th>
                  <th className="px-5 py-3.5 w-[150px] whitespace-nowrap">Role</th>
                  <th className="px-5 py-3.5 w-[130px] whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 w-[130px] whitespace-nowrap">Joined</th>
                  <th className="px-5 py-3.5 w-24 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 dark:text-slate-500">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-sm border border-slate-200 dark:border-slate-700">
                            {member.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                              <span>{member.name}</span>
                              {member.id === currentUser.id && (
                                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-500/20">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                              {member.phone}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              ROLE_LABELS[member.role]?.badgeClass || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {ROLE_LABELS[member.role]?.label || member.role}
                          </span>
                          {member.role === "CUSTOM" && member.permissions && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {Object.values(member.permissions).filter(Boolean).length} permission(s) granted
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleMemberActive(member)}
                          disabled={member.id === currentUser.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                            member.isActive
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 cursor-pointer"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 cursor-pointer"
                          } ${member.id === currentUser.id ? "opacity-70 cursor-not-allowed" : "hover:scale-105 active:scale-95"}`}
                          title={member.id === currentUser.id ? "Cannot deactivate yourself" : "Click to toggle active/inactive"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${member.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                          <span>{member.isActive ? "Active" : "Disabled"}</span>
                        </button>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(member.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Role / Perms */}
                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Role & Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset PIN */}
                          <button
                            type="button"
                            onClick={() => {
                              setResetPinMember(member);
                              setResetPinValue("");
                              setResetPinError(null);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Reset Member PIN"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Member */}
                          {member.id !== currentUser.id && (
                            <button
                              type="button"
                              onClick={() => setDeletingMember(member)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Delete Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT TEAM MEMBER                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {(isAddMemberOpen || editingMember) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span>{isAddMemberOpen ? "Add New Team Member" : `Edit Member: ${editingMember?.name}`}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setEditingMember(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {memberFormError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{memberFormError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Member Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formMemberName}
                  onChange={(e) => setFormMemberName(e.target.value)}
                  placeholder="e.g. Rafiq Ahmed"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mobile Number (Login ID) *
                </label>
                <input
                  type="tel"
                  disabled={!!editingMember}
                  value={formMemberPhone}
                  onChange={(e) => setFormMemberPhone(e.target.value)}
                  placeholder="017XXXXXXXX"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                />
                {editingMember && (
                  <p className="text-[11px] text-slate-400">Mobile number is the unique Login ID and cannot be changed.</p>
                )}
              </div>

              {/* Initial PIN (Only on Add) */}
              {isAddMemberOpen && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Initial 6-Digit PIN *</span>
                    <span className="text-[11px] text-slate-400">Default: 123456</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formMemberPin}
                    onChange={(e) => setFormMemberPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assign System Role *
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(["ADMIN", "MODERATOR", "MARKETER", "CUSTOM"] as const).map((r) => {
                    const isSelected = formMemberRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormMemberRole(r)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/70 dark:bg-blue-600/15 ring-2 ring-blue-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {ROLE_LABELS[r].label}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {ROLE_LABELS[r].description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Permissions Checklist (Only if CUSTOM role) */}
              {formMemberRole === "CUSTOM" && (
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Custom Permissions Matrix:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: "canAddBusiness", label: "Create Businesses" },
                      { key: "canEditBusiness", label: "Edit & Archive Businesses" },
                      { key: "canDeleteBusiness", label: "Delete Businesses" },
                      { key: "canRecordOrder", label: "Record New Orders" },
                      { key: "canUpdateOrder", label: "Update & Cancel Orders" },
                      { key: "canDeleteOrder", label: "Delete Orders" },
                      { key: "canManageProducts", label: "Manage & Archive Products" },
                      { key: "canDeleteProduct", label: "Delete Products" },
                      { key: "canImport", label: "Import Excel Data" },
                    ].map(({ key, label }) => {
                      const k = key as keyof CustomPermissions;
                      const isChecked = !!formCustomPerms[k];
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setFormCustomPerms((prev) => ({
                                ...prev,
                                [k]: e.target.checked,
                              }))
                            }
                            className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                          />
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setEditingMember(null);
                }}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveMember}
                disabled={isMemberPending || !formMemberName.trim() || !formMemberPhone.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isMemberPending ? "Saving Member…" : isAddMemberOpen ? "Create Member" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: RESET MEMBER PIN                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {resetPinMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <KeyRound className="w-4 h-4" />
                <span>Reset PIN</span>
              </h3>
              <button
                onClick={() => setResetPinMember(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Set a new 6-digit access PIN for <strong>{resetPinMember.name}</strong> ({resetPinMember.phone}).
            </p>

            {resetPinError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
                {resetPinError}
              </div>
            )}

            <form onSubmit={handleResetPin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New 6-Digit PIN *
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetPinValue}
                  onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 654321"
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono tracking-widest text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetPinMember(null)}
                  className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isMemberPending || resetPinValue.length !== 6}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isMemberPending ? "Resetting…" : "Confirm Reset PIN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DELETE MEMBER CONFIRMATION                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Delete Team Member?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to remove <strong>{deletingMember.name}</strong> ({deletingMember.phone}) from the system?
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isMemberPending}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isMemberPending ? "Deleting…" : "Delete Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
