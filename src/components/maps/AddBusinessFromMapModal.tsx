"use client";

import { useState, useEffect, useTransition } from "react";
import { createBusiness, BusinessInput } from "@/actions/businesses";
import { useRouter } from "next/navigation";
import { X, Building2, MapPin, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { BANGLADESH_DISTRICTS } from "@/lib/district-resolver";

export interface MapPointPreset {
  name: string;
  category: string;
  address: string;
  area: string;
  district: string;
  latitude: number;
  longitude: number;
  phoneRaw?: string | null;
}

interface AddBusinessFromMapModalProps {
  preset: MapPointPreset | null;
  onClose: () => void;
  onSuccess?: (name: string, businessId?: string) => void;
}

export default function AddBusinessFromMapModal({
  preset,
  onClose,
  onSuccess,
}: AddBusinessFromMapModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const resolveInitialDistrict = (dist?: string | null) => {
    if (!dist) return "Dhaka";
    const clean = dist.trim().toLowerCase();
    const found = BANGLADESH_DISTRICTS.find(
      (d) => d.name.toLowerCase() === clean || d.aliases.some((a) => a.toLowerCase() === clean)
    );
    return found ? found.name : "Dhaka";
  };

  const [formName, setFormName] = useState(preset?.name ?? "");
  const [formCategory, setFormCategory] = useState(preset?.category ?? "");
  const [formArea, setFormArea] = useState(preset?.area ?? "");
  const [formDistrict, setFormDistrict] = useState(() => resolveInitialDistrict(preset?.district));
  const [formPhone, setFormPhone] = useState(preset?.phoneRaw ?? "");
  const [formAddress, setFormAddress] = useState(preset?.address ?? "");
  const [formContact, setFormContact] = useState("");
  const [formLat, setFormLat] = useState(preset?.latitude?.toFixed(6) ?? "");
  const [formLng, setFormLng] = useState(preset?.longitude?.toFixed(6) ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  // Field-specific validation errors for inline display
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    district?: string;
    phone?: string;
    address?: string;
  }>({});

  const clearFieldError = (field: "name" | "district" | "phone" | "address") => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  useEffect(() => {
    if (preset) {
      setFormName(preset.name ?? "");
      setFormCategory(preset.category ?? "");
      setFormArea(preset.area ?? "");
      setFormDistrict(resolveInitialDistrict(preset.district));
      setFormPhone(preset.phoneRaw ?? "");
      setFormAddress(preset.address ?? "");
      setFormContact("");
      setFormLat(preset.latitude?.toFixed(6) ?? "");
      setFormLng(preset.longitude?.toFixed(6) ?? "");
      setFormError(null);
      setFieldErrors({});
    }
  }, [preset]);

  if (!preset) return null;

  const handleSave = () => {
    const errors: {
      name?: string;
      district?: string;
      phone?: string;
      address?: string;
    } = {};

    if (!formName.trim()) {
      errors.name = "Business name is required.";
    }

    if (!formDistrict.trim()) {
      errors.district = "District is required.";
    }

    if (!formPhone.trim()) {
      errors.phone = "Phone number is required.";
    }

    if (!formAddress.trim()) {
      errors.address = "Physical address is required.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    const payload: BusinessInput = {
      name: formName.trim(),
      category: formCategory.trim() || undefined,
      area: formArea.trim() || undefined,
      district: formDistrict.trim() || undefined,
      contactName: formContact.trim() || undefined,
      phoneRaw: formPhone.trim() || undefined,
      address: formAddress.trim() || undefined,
      latitude: formLat ? parseFloat(formLat) : null,
      longitude: formLng ? parseFloat(formLng) : null,
    };

    startTransition(async () => {
      const res = await createBusiness(payload);
      if (res?.error) {
        setFormError(res.error);
        toast.error(res.error);
      } else {
        if (res?.restored) {
          toast.success(res.message || `‘${formName.trim()}’ has been successfully restored from archive!`);
        } else {
          toast.success(`"${formName.trim()}" converted to client successfully!`);
        }
        onSuccess?.(formName.trim(), res?.businessId);
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add as Client Business</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Info auto-detected from map marker</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GPS Pre-fill Badge */}
        <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            <strong>GPS Auto-detected:</strong> {formLat}, {formLng} — map pin will be placed immediately.
          </span>
        </div>

        {/* Server Error Banner */}
        {formError && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {formError}
          </div>
        )}

        {/* Form Fields */}
        <div className="p-5 pt-4 space-y-3.5">
          {/* Business Name (Required) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Business Name <span className="text-rose-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => {
                setFormName(e.target.value);
                if (e.target.value.trim()) clearFieldError("name");
              }}
              placeholder="e.g. Pizza Burg"
              className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none shadow-sm transition-colors ${
                fieldErrors.name
                  ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                <span>{fieldErrors.name}</span>
              </p>
            )}
          </div>

          {/* Category & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. Restaurant"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Phone Number <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => {
                  setFormPhone(e.target.value);
                  if (e.target.value.trim()) clearFieldError("phone");
                }}
                placeholder="e.g. 01XXXXXXXXX"
                className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none shadow-sm transition-colors ${
                  fieldErrors.phone
                    ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                    : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                }`}
              />
              {fieldErrors.phone && (
                <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                  <span>{fieldErrors.phone}</span>
                </p>
              )}
            </div>
          </div>

          {/* Area / Locality & District */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Area / Locality</label>
              <input
                type="text"
                value={formArea}
                onChange={(e) => setFormArea(e.target.value)}
                placeholder="e.g. Donia, Dhanmondi"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                District <span className="text-rose-500 font-bold ml-0.5">*</span>
              </label>
              <select
                value={formDistrict}
                onChange={(e) => {
                  setFormDistrict(e.target.value);
                  if (e.target.value.trim()) clearFieldError("district");
                }}
                className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none shadow-sm cursor-pointer transition-colors ${
                  fieldErrors.district
                    ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                    : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                }`}
              >
                <option value="" disabled>— Select a district —</option>
                {BANGLADESH_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              {fieldErrors.district && (
                <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                  <span>{fieldErrors.district}</span>
                </p>
              )}
            </div>
          </div>

          {/* Physical Address (Required) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Physical Address <span className="text-rose-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => {
                setFormAddress(e.target.value);
                if (e.target.value.trim()) clearFieldError("address");
              }}
              placeholder="e.g. Dania Road, Shoni Akhra, Dhaka"
              className={`w-full px-3.5 py-2 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none shadow-sm transition-colors ${
                fieldErrors.address
                  ? "border border-rose-500 bg-rose-50/20 dark:bg-rose-950/20 focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
                  : "border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
              }`}
            />
            {fieldErrors.address && (
              <p className="text-xs text-rose-500 font-medium mt-1 animate-fade-in flex items-center gap-1">
                <span>{fieldErrors.address}</span>
              </p>
            )}
          </div>

          {/* Contact Person (Optional) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Person</label>
            <input
              type="text"
              value={formContact}
              onChange={(e) => setFormContact(e.target.value)}
              placeholder="Owner or manager name"
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
            />
          </div>

          {/* GPS readonly badge */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">GPS Coordinates (Auto-set)</span>
            <p className="font-mono text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {formLat}, {formLng}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSave}
            className="px-5 py-2 text-xs sm:text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                </svg>
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Building2 className="w-3.5 h-3.5" />
                <span>Save as Client</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
