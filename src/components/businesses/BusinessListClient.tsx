"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { hasPermission } from "@/lib/permissions";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import {
  createBusiness,
  updateBusiness,
  deleteBusiness,
  archiveBusiness,
  restoreBusiness,
  geocodeAddressAction,
  searchAddressAutocomplete,
  AutocompleteSuggestion,
  BusinessInput,
} from "@/actions/businesses";
import { BANGLADESH_DISTRICTS } from "@/lib/district-resolver";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Trash2,
  MapPin,
  CheckCircle2,
  Archive as ArchiveIcon,
  Loader2,
  MoreVertical,
  Edit,
  Eye,
  RotateCcw,
  Navigation,
  X,
} from "lucide-react";

interface BusinessItem {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  district: string | null;
  contactName: string | null;
  phoneRaw: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  orderCount: number;
  isGreen: boolean;
  createdAt: string;
}

interface FilterOptions {
  categories: string[];
  areas: string[];
  districts: string[];
}

export default function BusinessListClient({
  initialBusinesses,
  filterOptions,
  userRole = "ADMIN",
  userPermissions,
}: {
  initialBusinesses: BusinessItem[];
  filterOptions: FilterOptions;
  userRole?: string;
  userPermissions?: any;
}) {
  const router = useRouter();
  const canAddBusiness = hasPermission({ role: userRole, permissions: userPermissions }, "canAddBusiness");
  const canEditBusiness = hasPermission({ role: userRole, permissions: userPermissions }, "canEditBusiness");
  const canDeleteBusiness = hasPermission({ role: userRole, permissions: userPermissions }, "canDeleteBusiness");
  const [businesses, setBusinesses] = useState<BusinessItem[]>(initialBusinesses);

  useEffect(() => {
    setBusinesses(initialBusinesses);
  }, [initialBusinesses]);

  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedLocationStatus, setSelectedLocationStatus] = useState<"ALL" | "READY" | "NEEDS_LOCATION">("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessItem | null>(null);
  const [deletingBusiness, setDeletingBusiness] = useState<BusinessItem | null>(null);
  const [archivingBusiness, setArchivingBusiness] = useState<BusinessItem | null>(null);
  const [restoringBusiness, setRestoringBusiness] = useState<BusinessItem | null>(null);
  const [openActionBusiness, setOpenActionBusiness] = useState<BusinessItem | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, b: BusinessItem) => {
    e.stopPropagation();
    if (openActionBusiness?.id === b.id) {
      setOpenActionBusiness(null);
      setMenuCoords(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 240 && rect.top > 240;

    if (openUpwards) {
      setMenuCoords({
        bottom: window.innerHeight - rect.top + 4,
        right: window.innerWidth - rect.right,
      });
    } else {
      setMenuCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenActionBusiness(b);
  };

  // Close 3-dot action menu when clicking outside, scrolling, or resizing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionBusiness(null);
        setMenuCoords(null);
      }
    };
    const handleScrollOrResize = () => {
      if (openActionBusiness) {
        setOpenActionBusiness(null);
        setMenuCoords(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [openActionBusiness]);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Field-level validation errors (shows inline under the input)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    district?: string;
    phone?: string;
    address?: string;
    mapPin?: string;
  }>({});

  const clearFieldError = (field: "name" | "district" | "phone" | "address" | "mapPin") => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Auto-geocoding state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeFeedback, setGeocodeFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // Map Search / Autocomplete state
  const [formMapQuery, setFormMapQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressContainerRef = useRef<HTMLDivElement>(null);
  // Flag to suppress the next search-effect after a suggestion is selected
  const justSelectedRef = useRef(false);

  // Debounced search for live map pin suggestions
  useEffect(() => {
    // Skip search immediately after a suggestion was selected
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!formMapQuery || formMapQuery.trim().length < 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const results = await searchAddressAutocomplete(formMapQuery);
        setAddressSuggestions(results);
        setShowAddressSuggestions(results.length > 0);
      } catch (err) {
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formMapQuery]);

  // Click outside listener to dismiss autocomplete dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        addressContainerRef.current &&
        !addressContainerRef.current.contains(event.target as Node)
      ) {
        setShowAddressSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (item: AutocompleteSuggestion) => {
    // Prevent the useEffect from re-triggering a search after setting the query
    justSelectedRef.current = true;
    setFormMapQuery(item.formatted);
    clearFieldError("mapPin");
    // If physical address is still empty, populate it as a convenience
    if (!formAddress.trim()) {
      setFormAddress(item.formatted);
      clearFieldError("address");
    }
    if (item.area) setFormArea(item.area);
    if (item.district) {
      setFormDistrict(item.district);
      clearFieldError("district");
    }
    setFormLat(item.latitude.toFixed(6));
    setFormLng(item.longitude.toFixed(6));
    setShowAddressSuggestions(false);
    setGeocodeFeedback({
      text: `Map Pin Locked: (${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}) — Ready on Map!`,
      success: true,
    });
  };

  // Deletion / update feedback
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const handleAutoGeocode = async () => {
    const name = formName.trim();
    const physAddr = formAddress.trim();
    const loc = physAddr || formArea.trim() || formMapQuery.trim();
    if (!name && !loc) {
      setGeocodeFeedback({
        text: "Please enter the Business Name and/or Physical Address first to auto-detect coordinates.",
        success: false,
      });
      return;
    }
    setIsGeocoding(true);
    setGeocodeFeedback(null);
    try {
      // Step 1: Try autocomplete first — it finds specific POIs (restaurants, shops)
      // much better than the geocode/search endpoint which returns area-level results.
      // Combine name + address as a single free-text query (same as the map pin search).
      const autoQuery = [name, loc].filter(Boolean).join(", ");
      const suggestions = await searchAddressAutocomplete(autoQuery, true);

      if (suggestions.length > 0) {
        // Use the top autocomplete result — same as if user had picked it from dropdown
        const top = suggestions[0];
        justSelectedRef.current = true; // prevent dropdown from reopening
        setFormMapQuery(top.formatted);
        clearFieldError("mapPin");
        if (!formAddress.trim()) {
          setFormAddress(top.formatted);
          clearFieldError("address");
        }
        if (top.area) setFormArea(top.area);
        if (top.district) {
          setFormDistrict(top.district);
          clearFieldError("district");
        }
        setFormLat(top.latitude.toFixed(6));
        setFormLng(top.longitude.toFixed(6));
        setGeocodeFeedback({
          text: `Map Pin Locked: (${top.latitude.toFixed(4)}, ${top.longitude.toFixed(4)}) — Ready on Map!`,
          success: true,
        });
        return;
      }

      // Step 2: Fallback to geocode/search (area-level, less precise for POIs)
      const res = await geocodeAddressAction(name, loc);
      if (res.success && res.latitude && res.longitude) {
        setFormLat(res.latitude.toFixed(6));
        setFormLng(res.longitude.toFixed(6));
        clearFieldError("mapPin");
        if (res.resolvedDistrict) {
          setFormDistrict(res.resolvedDistrict);
          clearFieldError("district");
        }
        if (res.formattedAddress) {
          justSelectedRef.current = true;
          setFormMapQuery(res.formattedAddress);
          if (!formAddress.trim()) {
            setFormAddress(res.formattedAddress);
            clearFieldError("address");
          }
        }
        setGeocodeFeedback({
          text: `Map Pin Locked: (${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}) — Ready on Map!`,
          success: true,
        });
      } else {
        setGeocodeFeedback({
          text: res.error || "Could not pinpoint location. Please check the address or search for a landmark.",
          success: false,
        });
      }
    } catch (err: any) {
      setGeocodeFeedback({
        text: "Network error during geocoding. Please try again.",
        success: false,
      });
    } finally {
      setIsGeocoding(false);
    }
  };


  const openAddModal = () => {
    setEditingBusiness(null);
    setFormName("");
    setFormCategory("");
    setFormArea("");
    setFormDistrict("");
    setFormContact("");
    setFormPhone("");
    setFormAddress("");
    setFormMapQuery("");
    setFormLat("");
    setFormLng("");
    setFormError(null);
    setFieldErrors({});
    setGeocodeFeedback(null);
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setIsModalOpen(true);
  };

  const openEditModal = (b: BusinessItem) => {
    setEditingBusiness(b);
    setFormName(b.name);
    setFormCategory(b.category || "");
    setFormArea(b.area || "");
    setFormDistrict(b.district || "Dhaka");
    setFormContact(b.contactName || "");
    setFormPhone(b.phoneRaw || "");
    setFormAddress(b.address || "");
    setFormMapQuery(b.address || "");
    setFormLat(b.latitude != null ? String(b.latitude) : "");
    setFormLng(b.longitude != null ? String(b.longitude) : "");
    setFormError(null);
    setFieldErrors({});
    setGeocodeFeedback(null);
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
    setIsModalOpen(true);
  };

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

    const resolvedArea =
      formArea.trim() ||
      (formAddress ? formAddress.split(",")[0].trim() : undefined) ||
      formDistrict;

    const payload: BusinessInput = {
      name: formName.trim(),
      category: formCategory.trim() || undefined,
      area: resolvedArea || undefined,
      district: formDistrict.trim() || undefined,
      contactName: formContact.trim() || undefined,
      phoneRaw: formPhone.trim() || undefined,
      address: formAddress.trim() || undefined,
      latitude: formLat ? parseFloat(formLat) : null,
      longitude: formLng ? parseFloat(formLng) : null,
    };

    startTransition(async () => {
      if (editingBusiness) {
        const res = await updateBusiness(editingBusiness.id, payload);
        if (res?.error) {
          setFormError(res.error);
        } else {
          setIsModalOpen(false);
          toast.success(`"${formName}" updated successfully.`);
          router.refresh();
        }
      } else {
        const res = await createBusiness(payload);
        if (res?.error) {
          setFormError(res.error);
        } else {
          setIsModalOpen(false);
          if (res?.restored) {
            toast.success(res.message || `‘${formName}’ has been successfully restored from archive!`);
          } else {
            toast.success(`Business "${formName}" added to directory.`);
          }
          router.refresh();
        }
      }
    });
  };

  const confirmDeleteAction = () => {
    if (!deletingBusiness) return;
    const { id, name } = deletingBusiness;

    startTransition(async () => {
      const res = await deleteBusiness(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`"${name}" deleted successfully.`);
        setDeletingBusiness(null);
        router.refresh();
      }
    });
  };

  const confirmArchiveAction = () => {
    if (!archivingBusiness) return;
    const { id, name } = archivingBusiness;

    startTransition(async () => {
      const res = await archiveBusiness(id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.warning(`"${name}" archived. Historical orders are preserved.`);
        setArchivingBusiness(null);
        router.refresh();
      }
    });
  };

  const handleRestore = (business: BusinessItem) => {
    setRestoringBusiness(business);
  };

  const confirmRestoreAction = () => {
    if (!restoringBusiness) return;
    const { id, name } = restoringBusiness;
    startTransition(async () => {
      const res = await restoreBusiness(id);
      setRestoringBusiness(null);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`"${name}" restored to active status.`);
        router.refresh();
      }
    });
  };

  const filtered = businesses.filter((b) => {
    if (showArchived ? b.isActive : !b.isActive) return false;

    if (selectedCategory !== "ALL" && b.category !== selectedCategory) return false;
    if (selectedDistrict !== "ALL" && b.district !== selectedDistrict) return false;

    if (selectedLocationStatus === "READY" && (b.latitude == null || b.longitude == null)) {
      return false;
    }
    if (selectedLocationStatus === "NEEDS_LOCATION" && (b.latitude != null && b.longitude != null)) {
      return false;
    }

    if (q) {
      const query = q.toLowerCase();
      const matchName = b.name.toLowerCase().includes(query);
      const matchPhone = b.phoneRaw?.toLowerCase().includes(query) || false;
      const matchArea = b.area?.toLowerCase().includes(query) || false;
      const matchDistrict = b.district?.toLowerCase().includes(query) || false;
      const matchCat = b.category?.toLowerCase().includes(query) || false;
      if (!matchName && !matchPhone && !matchArea && !matchDistrict && !matchCat) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedBusinesses = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Filter and Action Bar */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search by name, phone, area, category…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="ALL">All Categories ({filterOptions.categories.length})</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => {
              setSelectedDistrict(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="ALL">All Districts ({filterOptions.districts.length})</option>
            {filterOptions.districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Location Status Filter */}
          <select
            value={selectedLocationStatus}
            onChange={(e) => {
              setSelectedLocationStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="ALL">All Locations</option>
            <option value="READY">Ready on Map (Geocoded)</option>
            <option value="NEEDS_LOCATION">Needs Location</option>
          </select>

          {/* Active / Archive Toggle */}
          <button
            onClick={() => {
              setShowArchived(!showArchived);
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-all ${
              showArchived
                ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30"
                : "bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {showArchived ? "Showing Archived" : "Show Archived"}
          </button>

          {/* Add Business Button (Protected) */}
          {canAddBusiness && (
            <button
              onClick={openAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>+</span> Add Business
            </button>
          )}
        </div>

        {/* Filter Summary & Count */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-900 dark:text-slate-100 font-semibold">{filtered.length}</strong> {showArchived ? "archived" : "active"} client businesses
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {filtered.reduce((sum, b) => sum + b.orderCount, 0)} Total Orders
          </span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {filtered.filter((b) => b.latitude != null && b.longitude != null).length} Ready on Map
          </span>
          {filtered.some((b) => b.latitude == null || b.longitude == null) && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-amber-500 dark:text-amber-400 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                {filtered.filter((b) => b.latitude == null || b.longitude == null).length} Location Needed
              </span>
            </>
          )}
        </div>
      </div>

      {/* Businesses Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="px-4 py-3.5 min-w-[200px]">Business Name</th>
              <th className="px-4 py-3.5 w-[110px] whitespace-nowrap">Category</th>
              <th className="px-4 py-3.5 min-w-[240px]">Area / District</th>
              <th className="px-4 py-3.5 w-[130px] whitespace-nowrap">Phone</th>
              <th className="px-4 py-3.5 w-[150px] whitespace-nowrap">Location</th>
              <th className="px-4 py-3.5 w-[100px] whitespace-nowrap">Orders</th>
              <th className="px-4 py-3.5 w-16 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {paginatedBusinesses.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                  No businesses matching current filters.
                </td>
              </tr>
            ) : (
              paginatedBusinesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5 min-w-[200px]">
                    <Link
                      href={`/dashboard/businesses/${b.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors block truncate"
                      title={b.name}
                    >
                      {b.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                      {b.category || "Unspecified"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    {b.area || "Unspecified"}, {b.district || "Dhaka"}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                    {b.phoneRaw || "—"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {b.latitude != null && b.longitude != null ? (
                      <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                        {b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        ⚠️ Location needed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        b.orderCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {b.orderCount}
                    </span>{" "}
                    <span className="text-xs text-slate-500 dark:text-slate-400">orders</span>
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => handleToggleActionMenu(e, b)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        openActionBusiness?.id === b.id
                          ? "bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-700 shadow-sm"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                      }`}
                      title="Actions"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
      />

      {/* Add / Edit Business Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingBusiness ? "Edit Business" : "Add New Business"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Business Name (Required) */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Business Name <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (e.target.value.trim()) clearFieldError("name");
                  }}
                  placeholder="e.g. Sultan's Dine"
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

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Restaurant, Wholesale, Superstore"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* District (Required) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
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
                  <option value="" disabled>
                    — Select a district —
                  </option>
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

              {/* Contact Person */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Contact Person</label>
                <input
                  type="text"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                  placeholder="e.g. Manager Name"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Phone Number (Required) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phone Number <span className="text-rose-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => {
                    setFormPhone(e.target.value);
                    if (e.target.value.trim()) clearFieldError("phone");
                  }}
                  placeholder="e.g. 01711-223344"
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

              {/* ── 1. Physical / Invoice Address (Required) ────────────────── */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Physical Address / Location{" "}
                  <span className="text-rose-500 font-bold ml-0.5">*</span>
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

              {/* ── 2. Map Location Search (Optional) ── */}
              <div
                ref={addressContainerRef}
                className="md:col-span-2 space-y-2 relative p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Map Location Search</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoGeocode}
                    disabled={isGeocoding}
                    title="Auto-detect coordinates using Business Name & Physical Address"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/70 dark:bg-blue-500/10 hover:bg-blue-200/70 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <MapPin className="w-3 h-3" />
                    {isGeocoding ? "Detecting..." : "Auto-Detect from Name & Address"}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={formMapQuery}
                    onChange={(e) => {
                      setFormMapQuery(e.target.value);
                      setShowAddressSuggestions(true);
                    }}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) setShowAddressSuggestions(true);
                    }}
                    placeholder="Search landmark or place on map (e.g. Pizza Burg, Dania Road, Dhaka)"
                    className="w-full px-3.5 py-2 pr-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                  {isSearchingAddress && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {showAddressSuggestions && addressSuggestions.length > 0 && (
                  <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Suggested Map Locations (Click to set GPS Pin)
                    </div>
                    {addressSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(item)}
                        className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-colors flex items-start gap-2.5 group cursor-pointer"
                      >
                        <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {item.formatted}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {item.district && (
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                District: {item.district}
                              </span>
                            )}
                            {item.area && item.area !== item.district && (
                              <span>• Area: {item.area}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {geocodeFeedback && (
                  <div
                    className={`p-2 rounded-lg text-xs font-medium border flex items-center gap-2 mt-1.5 ${
                      geocodeFeedback.success
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                        : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                    }`}
                  >
                    {geocodeFeedback.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                    <span>{geocodeFeedback.text}</span>
                  </div>
                )}
              </div>

              {/* Latitude (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Latitude (GPS)</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formLat}
                  onChange={(e) => {
                    setFormLat(e.target.value);
                    if (e.target.value.trim() && formLng.trim()) clearFieldError("mapPin");
                  }}
                  placeholder="e.g. 23.740510 (auto-filled)"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              {/* Longitude (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Longitude (GPS)</span>
                  <span className="text-slate-400 font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={formLng}
                  onChange={(e) => {
                    setFormLng(e.target.value);
                    if (e.target.value.trim() && formLat.trim()) clearFieldError("mapPin");
                  }}
                  placeholder="e.g. 90.384620 (auto-filled)"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
              >
                {isPending ? "Saving…" : editingBusiness ? "Update Business" : "Create Business"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deletingBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Business
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white font-semibold">"{deletingBusiness.name}"</strong>?
                </p>
              </div>
            </div>

            {deletingBusiness.orderCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Warning: Has {deletingBusiness.orderCount} Recorded Order(s)</span>
                </div>
                <p className="leading-relaxed">
                  Deleting this business will permanently remove it along with all {deletingBusiness.orderCount} associated order(s) and invoices from the database. This action cannot be undone.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                This action cannot be undone. This business record will be permanently deleted from the database.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingBusiness(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={confirmDeleteAction}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive Confirmation Modal ─────────────────────────────────────── */}
      {archivingBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ArchiveIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Archive Business
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to archive <strong className="text-slate-900 dark:text-white font-semibold">"{archivingBusiness.name}"</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5 leading-relaxed">
              Archiving hides this business from active client directories and maps. All historical orders ({archivingBusiness.orderCount}) and financial records remain safe, and you can restore it at any time using the <strong>"Show Archived"</strong> filter.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setArchivingBusiness(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={confirmArchiveAction}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 transition-all disabled:opacity-50"
              >
                {isPending ? "Archiving..." : "Archive Business"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Restore Confirmation Modal ──────────────────────────────────────── */}
      {restoringBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ArchiveIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Restore Business
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Restore <strong className="text-slate-900 dark:text-white font-semibold">"{restoringBusiness.name}"</strong> to the active directory?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              This business will reappear in the active client list, maps, and will be available for new orders. All {restoringBusiness.orderCount} historical order(s) remain intact.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRestoringBusiness(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={confirmRestoreAction}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-all disabled:opacity-50"
              >
                {isPending ? "Restoring..." : "Restore Business"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3-Dot Action Menu Portal (escapes all table/overflow boundaries) */}
      {mounted && openActionBusiness && menuCoords && typeof document !== "undefined" && createPortal(
        <div
          ref={actionMenuRef}
          style={{
            position: "fixed",
            top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
            bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
            right: `${menuCoords.right}px`,
            zIndex: 9999,
          }}
          className="w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 animate-fade-in divide-y divide-slate-100 dark:divide-slate-800/80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <Link
              href={`/dashboard/businesses/${openActionBusiness.id}`}
              onClick={() => {
                setOpenActionBusiness(null);
                setMenuCoords(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>View Details</span>
            </Link>

            {canEditBusiness && (
              <button
                type="button"
                onClick={() => {
                  const target = openActionBusiness;
                  setOpenActionBusiness(null);
                  setMenuCoords(null);
                  openEditModal(target);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5 text-blue-500" />
                <span>Edit Business</span>
              </button>
            )}
          </div>

          {openActionBusiness.latitude != null && openActionBusiness.longitude != null && (
            <div className="py-1">
              <Link
                href={`/dashboard/map/google?focus=${openActionBusiness.id}`}
                onClick={() => {
                  setOpenActionBusiness(null);
                  setMenuCoords(null);
                }}
                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>View on Google Maps</span>
                </span>
              </Link>

              <Link
                href={`/dashboard/map/geoapify?focus=${openActionBusiness.id}`}
                onClick={() => {
                  setOpenActionBusiness(null);
                  setMenuCoords(null);
                }}
                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center justify-between transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>View on MapLibre</span>
                </span>
              </Link>
            </div>
          )}

          {(canEditBusiness || canDeleteBusiness) && (
            <div className="py-1">
              {canEditBusiness && (
                openActionBusiness.isActive ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = openActionBusiness;
                      setOpenActionBusiness(null);
                      setMenuCoords(null);
                      setArchivingBusiness(target);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArchiveIcon className="w-3.5 h-3.5 text-amber-500" />
                    <span>Archive</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const target = openActionBusiness;
                      setOpenActionBusiness(null);
                      setMenuCoords(null);
                      handleRestore(target);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Restore</span>
                  </button>
                )
              )}

              {canDeleteBusiness && (
                <button
                  type="button"
                  onClick={() => {
                    const target = openActionBusiness;
                    setOpenActionBusiness(null);
                    setMenuCoords(null);
                    setDeletingBusiness(target);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
