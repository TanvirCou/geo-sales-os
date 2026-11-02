"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { updateAdminName, changeAdminPin } from "@/actions/settings";
import {
  createTeamMember,
  updateTeamMember,
  resetMemberPin,
  deleteTeamMember,
  TeamMemberItem,
} from "@/actions/team";
import { logoutAction } from "@/actions/auth";
import {
  saveCourierConfig,
  saveSteadfastApiCredentials,
  saveWebhookSettings,
  disconnectSteadfastCourier,
  testSteadfastConnection,
  syncSteadfastOrders,
  getRecentWebhookEvents,
  CourierConfigDTO,
  WebhookEventDTO,
  WebhookEventsResponseDTO,
} from "@/actions/courier";
import { Pagination } from "@/components/ui/Pagination";
import { ROLE_LABELS, CustomPermissions } from "@/lib/permissions";
import {
  Shield,
  ShieldCheck,
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
  X,
  Truck,
  Copy,
  RefreshCw,
  Zap,
  Wallet,
  Activity,
  ArrowUpRight,
  Radio,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Clock,
  Unplug,
  ChevronDown,
  ChevronUp,
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
  initialCourierConfig?: CourierConfigDTO | null;
  initialWebhookEventsData?: WebhookEventsResponseDTO;
  initialWebhookEvents?: WebhookEventDTO[];
}

export default function SettingsClient({
  currentUser,
  initialTeamMembers,
  initialCourierConfig,
  initialWebhookEventsData,
  initialWebhookEvents = [],
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "team" | "courier">("profile");

  // ─── Profile & PIN Form States ─────────────────────────────────────────────
  const toast = useToast();
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
  const [memberFieldErrors, setMemberFieldErrors] = useState<{
    name?: string;
    phone?: string;
    pin?: string;
  }>({});

  const clearMemberFieldError = (field: "name" | "phone" | "pin") => {
    setMemberFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const [isMemberPending, startMemberTransition] = useTransition();

  // Reset PIN Form State
  const [resetPinValue, setResetPinValue] = useState("");
  const [resetPinError, setResetPinError] = useState<string | null>(null);

  // ─── Courier & Webhook States ─────────────────────────────────────────────
  const [courierConfig, setCourierConfig] = useState<CourierConfigDTO | null>(initialCourierConfig || null);
  const [apiKey, setApiKey] = useState(initialCourierConfig?.apiKey || "");
  const [secretKey, setSecretKey] = useState(initialCourierConfig?.secretKey || "");
  const [webhookSecret, setWebhookSecret] = useState(initialCourierConfig?.webhookSecret || "");
  const [isCourierActive, setIsCourierActive] = useState(initialCourierConfig?.isActive ?? true);

  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // ─── Courier Admin PIN Modal States ───────────────────────────────────────
  const [courierPinModal, setCourierPinModal] = useState<{
    isOpen: boolean;
    mode: "API_CREDENTIALS" | "WEBHOOK_SETTINGS" | null;
  }>({ isOpen: false, mode: null });
  const [courierAdminPin, setCourierAdminPin] = useState("");
  const [courierPinError, setCourierPinError] = useState<string | null>(null);
  const [isCourierPinSubmitting, setIsCourierPinSubmitting] = useState(false);

  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [isWebhookLogsOpen, setIsWebhookLogsOpen] = useState(false);
  const [isWebhookLogsLoading, setIsWebhookLogsLoading] = useState(false);

  const [webhookEvents, setWebhookEvents] = useState<WebhookEventDTO[]>(
    initialWebhookEventsData?.events || initialWebhookEvents || []
  );
  const [webhookTotal, setWebhookTotal] = useState(
    initialWebhookEventsData?.total ?? initialWebhookEvents?.length ?? 0
  );
  const [webhookPage, setWebhookPage] = useState(initialWebhookEventsData?.page || 1);
  const [webhookTotalPages, setWebhookTotalPages] = useState(
    initialWebhookEventsData?.totalPages || 1
  );
  const [isWebhookCopied, setIsWebhookCopied] = useState(false);
  const [showWebhookUrlToken, setShowWebhookUrlToken] = useState(false);

  const getFullWebhookUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
    const base = `${origin}/api/webhooks/steadfast`;
    if (webhookSecret && webhookSecret.trim()) {
      return `${base}?token=${encodeURIComponent(webhookSecret.trim())}`;
    }
    return base;
  };

  const getDisplayWebhookUrl = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
    const base = `${origin}/api/webhooks/steadfast`;
    if (webhookSecret && webhookSecret.trim()) {
      if (showWebhookUrlToken) {
        return `${base}?token=${encodeURIComponent(webhookSecret.trim())}`;
      }
      return `${base}?token=••••••••`;
    }
    return base;
  };

  const handleCopyWebhookUrl = () => {
    const url = getFullWebhookUrl();
    navigator.clipboard.writeText(url);
    setIsWebhookCopied(true);
    toast.success("Webhook callback URL copied to clipboard!");
    setTimeout(() => setIsWebhookCopied(false), 2500);
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await disconnectSteadfastCourier();
      if (res.success) {
        setApiKey("");
        setSecretKey("");
        setCourierConfig((prev) =>
          prev
            ? {
                ...prev,
                apiKey: "",
                secretKey: "",
                balance: null,
                lastTestedAt: null,
                isActive: false,
              }
            : null
        );
        setIsDisconnectModalOpen(false);
        toast.success("Steadfast Courier disconnected and credentials removed.");
      } else {
        toast.error(res.error || "Failed to disconnect.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred while disconnecting.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleOpenApiCredentialsPinModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !secretKey.trim()) {
      toast.error("Please enter both Steadfast API Key and Secret Key.");
      return;
    }
    setCourierAdminPin("");
    setCourierPinError(null);
    setCourierPinModal({ isOpen: true, mode: "API_CREDENTIALS" });
  };

  const handleOpenWebhookSettingsPinModal = (e: React.FormEvent) => {
    e.preventDefault();
    setCourierAdminPin("");
    setCourierPinError(null);
    setCourierPinModal({ isOpen: true, mode: "WEBHOOK_SETTINGS" });
  };

  const handleConfirmCourierPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (courierAdminPin.trim().length !== 6) {
      setCourierPinError("Please enter your 6-digit Admin PIN.");
      return;
    }

    setIsCourierPinSubmitting(true);
    setCourierPinError(null);

    try {
      if (courierPinModal.mode === "API_CREDENTIALS") {
        const res = await saveSteadfastApiCredentials({
          apiKey,
          secretKey,
          isActive: isCourierActive,
          adminPin: courierAdminPin.trim(),
        });

        if (res.success && res.config) {
          setCourierConfig(res.config);
          setIsCourierActive(res.config.isActive);
          setCourierPinModal({ isOpen: false, mode: null });
          setCourierAdminPin("");
          toast.success("Steadfast API credentials verified & saved successfully!");
        } else {
          setCourierPinError(res.error || "Incorrect Admin PIN.");
          toast.error(res.error || "Failed to save API credentials.");
        }
      } else if (courierPinModal.mode === "WEBHOOK_SETTINGS") {
        const res = await saveWebhookSettings({
          webhookSecret,
          isActive: isCourierActive,
          adminPin: courierAdminPin.trim(),
        });

        if (res.success && res.config) {
          setCourierConfig(res.config);
          setIsCourierActive(res.config.isActive);
          setCourierPinModal({ isOpen: false, mode: null });
          setCourierAdminPin("");
          toast.success("Webhook security settings verified & saved successfully!");
        } else {
          setCourierPinError(res.error || "Incorrect Admin PIN.");
          toast.error(res.error || "Failed to save webhook settings.");
        }
      }
    } catch (err: any) {
      setCourierPinError(err.message || "An unexpected error occurred.");
      toast.error(err.message || "Failed to save.");
    } finally {
      setIsCourierPinSubmitting(false);
    }
  };

  const handleSyncOrders = async () => {
    setIsSyncingOrders(true);

    try {
      const res = await syncSteadfastOrders();
      if (res.success) {
        toast.success(
          `Sync completed! Checked ${res.checkedCount} pending order(s), updated ${res.updatedCount} order status(es).`
        );
        setCourierConfig((prev) =>
          prev ? { ...prev, lastSyncedAt: res.lastSyncedAt || new Date().toISOString() } : prev
        );
      } else {
        toast.error(res.error || "Failed to sync pending orders.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error running order sync.");
    } finally {
      setIsSyncingOrders(false);
    }
  };

  const handleWebhookPageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > webhookTotalPages || newPage === webhookPage) return;
    setIsWebhookLogsLoading(true);
    try {
      const res = await getRecentWebhookEvents(newPage, 5);
      setWebhookEvents(res.events);
      setWebhookPage(res.page);
      setWebhookTotal(res.total);
      setWebhookTotalPages(res.totalPages);
    } catch (e) {
      toast.error("Failed to load webhook logs.");
    } finally {
      setIsWebhookLogsLoading(false);
    }
  };

  const handleRefreshEvents = async () => {
    setIsWebhookLogsLoading(true);
    try {
      const res = await getRecentWebhookEvents(webhookPage, 5);
      setWebhookEvents(res.events);
      setWebhookTotal(res.total);
      setWebhookTotalPages(res.totalPages);
      toast.success("Webhook logs refreshed.");
    } catch (e) {
      toast.error("Failed to refresh webhook events.");
    } finally {
      setIsWebhookLogsLoading(false);
    }
  };

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
    setMemberFieldErrors({});
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
    setMemberFieldErrors({});
  };

  const handleSaveMember = () => {
    setMemberFormError(null);
    setMemberFormSuccess(null);

    const errors: {
      name?: string;
      phone?: string;
      pin?: string;
    } = {};

    if (!formMemberName.trim()) {
      errors.name = "Full name is required.";
    }

    if (!formMemberPhone.trim()) {
      errors.phone = "Mobile phone number is required.";
    } else if (formMemberPhone.trim().replace(/[^\d+]/g, "").length < 8) {
      errors.phone = "Valid mobile phone number is required.";
    }

    if (isAddMemberOpen) {
      if (!formMemberPin.trim()) {
        errors.pin = "Initial 6-digit PIN is required.";
      } else if (!/^\d{6}$/.test(formMemberPin.trim())) {
        errors.pin = "PIN must be exactly 6 digits.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setMemberFieldErrors(errors);
      return;
    }

    setMemberFieldErrors({});

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

    if (!resetPinValue.trim()) {
      setResetPinError("PIN is required.");
      return;
    }

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
        setResetPinError(null);
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
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1.5 sm:gap-4 overflow-x-auto scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
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
            className={`pb-3 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "team"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team & Access</span>
            <span className="ml-0.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {teamMembers.length}
            </span>
          </button>
        )}

        {currentUser.role === "ADMIN" && (
          <button
            onClick={() => setActiveTab("courier")}
            className={`pb-3 px-2.5 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "courier"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Steadfast Courier</span>
            {courierConfig?.isActive && courierConfig?.apiKey ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            ) : null}
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: PROFILE & SECURITY                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-6 sm:space-y-8 animate-fade-in">
          {/* Profile Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-md shadow-blue-600/20 shrink-0">
                  {adminName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
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
                className={`w-full sm:max-w-xl p-3.5 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between ${
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

            <form onSubmit={handleUpdateName} className="space-y-4 w-full sm:max-w-xl">
              <div className="space-y-1.5">
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
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm shadow-blue-600/30 transition-colors duration-150 active:scale-95 disabled:opacity-50 cursor-pointer justify-center flex items-center gap-2"
                >
                  {isNamePending ? "Saving Name…" : "Save Name"}
                </button>
              </div>
            </form>
          </div>

          {/* Change PIN Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shadow-inner shrink-0">
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
                className={`w-full sm:max-w-xl p-3.5 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between ${
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

            <form onSubmit={handleChangePin} className="space-y-4 w-full sm:max-w-xl">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current PIN <span className="text-rose-500 font-bold ml-0.5">*</span>
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
                  New PIN <span className="text-rose-500 font-bold ml-0.5">*</span>
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
                  Confirm New PIN <span className="text-rose-500 font-bold ml-0.5">*</span>
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
                  className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer justify-center flex items-center gap-2"
                >
                  {isPinPending ? "Updating PIN…" : "Update PIN"}
                </button>
              </div>
            </form>
          </div>

          {/* Session & Sign Out Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                className="w-full sm:w-auto justify-center px-4 py-2.5 border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-xs sm:text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 flex-1 w-full sm:max-w-md">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  placeholder="Search team member..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer shrink-0"
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
              className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shrink-0"
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
      {/* TAB 3: STEADFAST COURIER & WEBHOOK INTEGRATION (ADMIN ONLY)         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "courier" && currentUser.role === "ADMIN" && (
        <div className="space-y-5 sm:space-y-6 animate-fade-in">
          {/* 1. Header & Live Balance Overview Card */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-blue-950/20 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
                      Steadfast Courier Integration
                    </h2>
                    {courierConfig?.isActive && courierConfig?.apiKey ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Connected & Active
                      </span>
                    ) : courierConfig?.apiKey ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Paused
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
                    Connect your Steadfast Courier merchant account to receive real-time webhook status updates. Delivered orders will automatically transition to completed and turn green on map views.
                  </p>
                  {courierConfig?.apiKey && (
                    <div className="flex items-center gap-2 pt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Last Synced:</span>
                        <strong className="font-mono text-slate-900 dark:text-slate-100">
                          {courierConfig.lastSyncedAt
                            ? new Date(courierConfig.lastSyncedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: true,
                              })
                            : "Never synced yet"}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Disconnect Steadfast Button (shown when credentials exist) */}
              {courierConfig?.apiKey && (
                <div className="flex items-center w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsDisconnectModalOpen(true)}
                    className="w-full md:w-auto justify-center px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Unplug className="w-4 h-4" />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PART 1: Steadfast Merchant API Credentials */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    Steadfast Merchant API Credentials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    API Key & Secret Key for merchant balance verification and pending order tracking
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleOpenApiCredentialsPinModal} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* API Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Steadfast API Key <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Header: Api-Key</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="e.g. st_live_xxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showApiKey ? "Hide API Key" : "Show API Key"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Secret Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Steadfast Secret Key <span className="text-rose-500 font-bold">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Header: Secret-Key</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showSecretKey ? "text" : "password"}
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="e.g. sec_live_xxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showSecretKey ? "Hide Secret Key" : "Show Secret Key"}
                    >
                      {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggle Active Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Radio className={`w-3.5 h-3.5 shrink-0 ${isCourierActive ? "text-emerald-500" : "text-slate-400"}`} />
                    Enable Live Status Sync & Webhooks
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    When active, courier updates and webhook events will automatically transition order statuses in your database.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={isCourierActive}
                    onChange={(e) => setIsCourierActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Step by step guide for API Credentials */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                  How to get Steadfast API Key & Secret:
                </span>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>
                    Log in to your Steadfast Merchant account at{" "}
                    <a
                      href="https://steadfast.com.bd/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-500"
                    >
                      steadfast.com.bd/dashboard
                    </a>
                    .
                  </li>
                  <li>
                    From the left sidebar menu, click on <strong className="text-slate-700 dark:text-slate-300">API</strong>.
                  </li>
                  <li>
                    Click on <strong className="text-slate-700 dark:text-slate-300">Generate API Key & Secret</strong> (or view/copy your existing keys).
                  </li>
                  <li>
                    Copy and paste your <strong className="text-slate-700 dark:text-slate-300">API Key</strong> and <strong className="text-slate-700 dark:text-slate-300">Secret Key</strong> into the fields above, keep sync enabled, and click <strong className="text-blue-600 dark:text-blue-400">Save Configuration</strong>.
                  </li>
                </ol>
              </div>

              {/* Form Action Buttons */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!apiKey.trim() || !secretKey.trim()}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>

          {/* PART 2: Webhook Authorization & Live Settings */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    Webhook Authorization & Security
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set an optional secret authorization token to verify incoming delivery status webhooks from Steadfast
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleOpenWebhookSettingsPinModal} className="space-y-4">
              {/* Webhook Secret Token (Optional) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Webhook Authorization Token / Secret <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Header: Authorization Bearer / ?token=...</span>
                </div>
                <div className="relative">
                  <input
                    type={showWebhookSecret ? "text" : "password"}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    placeholder="e.g. secret_token_xyz123 (Leave blank to accept all webhook calls)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showWebhookSecret ? "Hide Webhook Secret" : "Show Webhook Secret"}
                  >
                    {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  When defined, incoming webhook requests must provide this token to authenticate.
                </p>
              </div>

              {/* Save Webhook Settings Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="w-full sm:w-auto justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>

          {/* 3. Webhook Setup & Manual Sync Card */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    Webhook Callback URL & Live Listener
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure your Steadfast merchant dashboard to dispatch real-time parcel delivery webhooks
                  </p>
                </div>
              </div>
            </div>

            {/* Copyable Webhook URL Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Your Webhook Endpoint URL
                </label>
                {webhookSecret.trim() ? (
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-500/20">
                    🔒 Secured with Token
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    No token attached (open listener)
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div
                  onCopy={(e) => {
                    e.preventDefault();
                    e.clipboardData.setData("text/plain", getFullWebhookUrl());
                    setIsWebhookCopied(true);
                    toast.success("Webhook callback URL copied to clipboard!");
                    setTimeout(() => setIsWebhookCopied(false), 2500);
                  }}
                  className="relative flex-1 flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 min-w-0"
                >
                  <div className="flex-1 text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                    {getDisplayWebhookUrl()}
                  </div>
                  {webhookSecret.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowWebhookUrlToken(!showWebhookUrlToken)}
                      className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0 transition-colors"
                      title={showWebhookUrlToken ? "Hide secret token in URL" : "Show secret token in URL"}
                    >
                      {showWebhookUrlToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCopyWebhookUrl}
                  className="w-full sm:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 shadow-sm"
                >
                  {isWebhookCopied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step by step guide */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                How to setup Webhook in Steadfast Portal:
              </span>
              <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                <li>
                  Log in to your Steadfast Merchant account at{" "}
                  <a
                    href="https://steadfast.com.bd/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2 hover:text-blue-500"
                  >
                    steadfast.com.bd/dashboard
                  </a>
                  .
                </li>
                <li>Go to <strong className="text-slate-700 dark:text-slate-300">Settings &gt; Webhook / API Integration</strong>.</li>
                <li>Paste your Webhook URL copied above into the callback input.</li>
                <li>When any parcel is marked as <strong className="text-emerald-600 dark:text-emerald-400">Delivered</strong>, GeoSales OS will automatically change the order to <strong className="text-emerald-600 dark:text-emerald-400">Completed</strong> and update the map pin to green in real time!</li>
              </ol>
            </div>

            {/* Quick action: Manual Order Status Sync */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Manual Order Status Sync
                  </span>
                  {courierConfig?.lastSyncedAt && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                      <Clock className="w-3 h-3" />
                      <span>
                        Last synced:{" "}
                        <strong className="font-mono">
                          {new Date(courierConfig.lastSyncedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}
                        </strong>
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Query Steadfast servers to immediately check and update all pending delivery statuses in your database.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSyncOrders}
                disabled={isSyncingOrders || !apiKey.trim()}
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOrders ? "animate-spin text-blue-400" : ""}`} />
                <span>{isSyncingOrders ? "Syncing Orders…" : "Sync Pending Orders Now"}</span>
              </button>
            </div>
          </div>

          {/* 4. Webhook Events Audit Trail (Collapsible) */}
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsWebhookLogsOpen(!isWebhookLogsOpen)}
              className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                      Webhook Delivery History & Audit Log
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {webhookTotal} {webhookTotal === 1 ? "Event" : "Events"}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                    Diagnostic stream of live delivery notifications received from Steadfast Courier
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <span className="hidden sm:inline">{isWebhookLogsOpen ? "Hide Logs" : "View Logs"}</span>
                  {isWebhookLogsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              </div>
            </button>

            {isWebhookLogsOpen && (
              <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between pt-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Showing 5 events per page • Sorted by newest first
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshEvents}
                    disabled={isWebhookLogsLoading}
                    className="text-xs text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 font-medium flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isWebhookLogsLoading ? "animate-spin text-blue-600" : ""}`} />
                    <span>Refresh Stream</span>
                  </button>
                </div>

                <div className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 transition-opacity ${isWebhookLogsLoading ? "opacity-50 pointer-events-none" : ""}`}>
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 whitespace-nowrap">Time</th>
                        <th className="px-4 py-3 whitespace-nowrap">Invoice / CID</th>
                        <th className="px-4 py-3 whitespace-nowrap">Steadfast Status</th>
                        <th className="px-4 py-3 whitespace-nowrap">Result</th>
                        <th className="px-4 py-3 min-w-[200px]">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {webhookEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500">
                            No webhook events recorded yet. Once Steadfast sends status updates, they will appear here.
                          </td>
                        </tr>
                      ) : (
                        webhookEvents.map((ev) => (
                          <tr key={ev.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                              {new Date(ev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{" "}
                              <span className="text-[10px] text-slate-400">({new Date(ev.createdAt).toLocaleDateString()})</span>
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {ev.invoice || "—"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  (ev.status || ev.eventType || "").toLowerCase().includes("deliver")
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300"
                                    : (ev.status || ev.eventType || "").toLowerCase().includes("cancel") || (ev.status || ev.eventType || "").toLowerCase().includes("return")
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300"
                                    : (ev.status || ev.eventType || "").toLowerCase().includes("partial")
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                    : "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300"
                                }`}
                              >
                                {ev.status || ev.eventType || "status_update"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  ev.resultStatus === "processed"
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    : ev.resultStatus === "failed"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {ev.resultStatus}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                              {ev.error ? (
                                <span className="text-rose-600 dark:text-rose-400 font-medium">{ev.error}</span>
                              ) : (
                                <span className="text-slate-400">Order status synchronized</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {webhookTotal > 5 && (
                  <div className="pt-2">
                    <Pagination
                      currentPage={webhookPage}
                      totalPages={webhookTotalPages}
                      totalItems={webhookTotal}
                      pageSize={5}
                      onPageChange={handleWebhookPageChange}
                    />
                  </div>
                )}
              </div>
            )}
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
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                  Full Name <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={formMemberName}
                  onChange={(e) => {
                    setFormMemberName(e.target.value);
                    if (e.target.value.trim()) clearMemberFieldError("name");
                  }}
                  placeholder="e.g. Rafiq Ahmed"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm focus:outline-none transition-colors ${
                    memberFieldErrors.name
                      ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                      : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40"
                  }`}
                />
                {memberFieldErrors.name && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                    <span>{memberFieldErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mobile Number (Login ID) <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="tel"
                  disabled={!!editingMember}
                  value={formMemberPhone}
                  onChange={(e) => {
                    setFormMemberPhone(e.target.value);
                    if (e.target.value.trim()) clearMemberFieldError("phone");
                  }}
                  placeholder="017XXXXXXXX"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-mono focus:outline-none transition-colors disabled:opacity-60 ${
                    memberFieldErrors.phone
                      ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                      : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40"
                  }`}
                />
                {memberFieldErrors.phone && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                    <span>{memberFieldErrors.phone}</span>
                  </p>
                )}
                {editingMember && (
                  <p className="text-[11px] text-slate-400 mt-1">Mobile number is the unique Login ID and cannot be changed.</p>
                )}
              </div>

              {/* Initial PIN (Only on Add) */}
              {isAddMemberOpen && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>
                      Initial 6-Digit PIN <span className="text-rose-500 font-bold ml-0.5">*</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Default: 123456</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formMemberPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFormMemberPin(val);
                      if (val.length === 6) clearMemberFieldError("pin");
                    }}
                    placeholder="123456"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-mono tracking-widest focus:outline-none transition-colors ${
                      memberFieldErrors.pin
                        ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                        : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40"
                    }`}
                  />
                  {memberFieldErrors.pin && (
                    <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                      <span>{memberFieldErrors.pin}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assign System Role <span className="text-rose-500 font-bold ml-0.5">*</span>
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

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setEditingMember(null);
                }}
                className="w-full justify-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveMember}
                disabled={isMemberPending}
                className="w-full justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95 text-center"
              >
                {isMemberPending ? "Saving…" : isAddMemberOpen ? "Create Member" : "Save Changes"}
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
                onClick={() => {
                  setResetPinMember(null);
                  setResetPinError(null);
                  setResetPinValue("");
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Set a new 6-digit access PIN for <strong>{resetPinMember.name}</strong> ({resetPinMember.phone}).
            </p>

            <form onSubmit={handleResetPin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  New 6-Digit PIN <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetPinValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setResetPinValue(val);
                    if (resetPinError) setResetPinError(null);
                  }}
                  placeholder="e.g. 654321"
                  autoFocus
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm font-mono tracking-widest text-center text-lg font-bold focus:outline-none transition-colors ${
                    resetPinError
                      ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                      : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500/40"
                  }`}
                />
                {resetPinError && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center justify-center gap-1">
                    <span>{resetPinError}</span>
                  </p>
                )}
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPinMember(null);
                    setResetPinError(null);
                    setResetPinValue("");
                  }}
                  className="w-full justify-center px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isMemberPending}
                  className="w-full justify-center px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {isMemberPending ? "Resetting…" : "Confirm Reset"}
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

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="w-full justify-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isMemberPending}
                className="w-full justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isMemberPending ? "Deleting…" : "Delete Member"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: COURIER SETTINGS ADMIN PIN CONFIRMATION                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {courierPinModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <KeyRound className="w-4 h-4" />
                <span>Admin PIN Verification</span>
              </h3>
              <button
                onClick={() => {
                  setCourierPinModal({ isOpen: false, mode: null });
                  setCourierAdminPin("");
                  setCourierPinError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {courierPinModal.mode === "API_CREDENTIALS"
                ? "Enter your 6-digit Admin PIN to securely encrypt and save Steadfast API credentials."
                : "Enter your 6-digit Admin PIN to update and save Webhook authorization settings."}
            </p>

            <form onSubmit={handleConfirmCourierPin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Admin 6-Digit PIN <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  value={courierAdminPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setCourierAdminPin(val);
                    if (courierPinError) setCourierPinError(null);
                  }}
                  placeholder="••••••"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-lg font-mono tracking-widest text-center font-bold focus:outline-none transition-colors ${
                    courierPinError
                      ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                      : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40"
                  }`}
                />
                {courierPinError && (
                  <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center justify-center gap-1">
                    <span>{courierPinError}</span>
                  </p>
                )}
              </div>

              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCourierPinModal({ isOpen: false, mode: null });
                    setCourierAdminPin("");
                    setCourierPinError(null);
                  }}
                  className="w-full justify-center px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isCourierPinSubmitting || courierAdminPin.length !== 6}
                  className="w-full justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-md shadow-blue-600/25"
                >
                  {isCourierPinSubmitting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: DISCONNECT STEADFAST COURIER                                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isDisconnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Unplug className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Disconnect Steadfast Courier?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to disconnect? Your API Key and Secret Key will be permanently removed from the database.
              </p>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsDisconnectModalOpen(false)}
                className="w-full justify-center px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={isDisconnecting}
                className="w-full justify-center px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
