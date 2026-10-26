"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pagination } from "@/components/ui/Pagination";
import {
  createBusiness,
  updateBusiness,
  deleteBusiness,
  archiveBusiness,
  restoreBusiness,
  BusinessInput,
} from "@/actions/businesses";
import { useRouter } from "next/navigation";

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
}: {
  initialBusinesses: BusinessItem[];
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessItem[]>(initialBusinesses);
  const [q, setQ] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [selectedColor, setSelectedColor] = useState<"ALL" | "GREEN" | "RED">("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<BusinessItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formDistrict, setFormDistrict] = useState("Dhaka");
  const [formContact, setFormContact] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion / update feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openAddModal = () => {
    setEditingBusiness(null);
    setFormName("");
    setFormCategory("");
    setFormArea("");
    setFormDistrict("Dhaka");
    setFormContact("");
    setFormPhone("");
    setFormAddress("");
    setFormLat("");
    setFormLng("");
    setFormError(null);
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
    setFormLat(b.latitude != null ? String(b.latitude) : "");
    setFormLng(b.longitude != null ? String(b.longitude) : "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      setFormError("Business name is required.");
      return;
    }

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
      let res;
      if (editingBusiness) {
        res = await updateBusiness(editingBusiness.id, payload);
      } else {
        res = await createBusiness(payload);
      }

      if (res?.error) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteBusiness(id);
      if (res.error) {
        setFeedbackMsg({ text: res.error, type: "error" });
      } else {
        setFeedbackMsg({ text: `Deleted "${name}" successfully.`, type: "success" });
        router.refresh();
      }
    });
  };

  const handleArchive = (id: string, name: string) => {
    startTransition(async () => {
      const res = await archiveBusiness(id);
      if (res.error) {
        setFeedbackMsg({ text: res.error, type: "error" });
      } else {
        setFeedbackMsg({ text: `Archived "${name}". Historical orders are preserved.`, type: "success" });
        router.refresh();
      }
    });
  };

  const handleRestore = (id: string, name: string) => {
    startTransition(async () => {
      const res = await restoreBusiness(id);
      if (res.error) {
        setFeedbackMsg({ text: res.error, type: "error" });
      } else {
        setFeedbackMsg({ text: `Restored "${name}" to active status.`, type: "success" });
        router.refresh();
      }
    });
  };

  const filtered = businesses.filter((b) => {
    if (showArchived ? b.isActive : !b.isActive) return false;

    if (selectedCategory !== "ALL" && b.category !== selectedCategory) return false;
    if (selectedArea !== "ALL" && b.area !== selectedArea) return false;

    if (selectedColor === "GREEN" && !b.isGreen) return false;
    if (selectedColor === "RED" && b.isGreen) return false;

    if (q) {
      const query = q.toLowerCase();
      const matchName = b.name.toLowerCase().includes(query);
      const matchPhone = b.phoneRaw?.toLowerCase().includes(query) || false;
      const matchArea = b.area?.toLowerCase().includes(query) || false;
      const matchCat = b.category?.toLowerCase().includes(query) || false;
      if (!matchName && !matchPhone && !matchArea && !matchCat) return false;
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
      {/* Alert Banner */}
      {feedbackMsg && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border transition-all ${
            feedbackMsg.type === "error"
              ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-100 transition-colors p-1"
          >
            ✕
          </button>
        </div>
      )}

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

          {/* Area Filter */}
          <select
            value={selectedArea}
            onChange={(e) => {
              setSelectedArea(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="ALL">All Areas ({filterOptions.areas.length})</option>
            {filterOptions.areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Order Color Filter */}
          <select
            value={selectedColor}
            onChange={(e) => {
              setSelectedColor(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="ALL">All Marker Colors</option>
            <option value="GREEN">🟢 Green (≥1 Order)</option>
            <option value="RED">🔴 Red (0 Orders)</option>
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

          {/* Add Business Button */}
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>+</span> Add Business
          </button>
        </div>

        {/* Filter Summary & Count */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-100 font-semibold">{filtered.length}</strong> {showArchived ? "archived" : "active"} businesses
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            {filtered.filter((b) => b.isGreen).length} Green
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-rose-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            {filtered.filter((b) => !b.isGreen).length} Red
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-400 font-medium flex items-center gap-1">
            <span>📍</span>
            {filtered.filter((b) => b.latitude == null).length} Location Needed
          </span>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="px-4 py-3.5">Status / Color</th>
              <th className="px-4 py-3.5">Business Name</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Area / District</th>
              <th className="px-4 py-3.5">Phone</th>
              <th className="px-4 py-3.5">Location</th>
              <th className="px-4 py-3.5">Orders</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
            {paginatedBusinesses.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500 font-medium">
                  No businesses matching current filters.
                </td>
              </tr>
            ) : (
              paginatedBusinesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          b.isGreen
                            ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                            : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          b.isGreen ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {b.isGreen ? "Green" : "Red"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/businesses/${b.id}`}
                      className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {b.name}
                    </Link>
                    {b.address && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm truncate">
                        {b.address}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                      {b.category || "Unspecified"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    {b.area || "Unspecified"}, {b.district || "Dhaka"}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600 dark:text-slate-300 text-xs">
                    {b.phoneRaw || "—"}
                  </td>
                  <td className="px-4 py-3.5">
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
                  <td className="px-4 py-3.5">
                    <span
                      className={`font-semibold ${
                        b.orderCount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                      }`}
                    >
                      {b.orderCount}
                    </span>{" "}
                    <span className="text-xs text-slate-500 dark:text-slate-400">orders</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(b)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs font-medium transition-all shadow-sm"
                      >
                        Edit
                      </button>

                      {b.isActive ? (
                        <button
                          onClick={() => handleArchive(b.id, b.name)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 rounded-md text-xs font-medium transition-all shadow-sm"
                          title="Archive business (preserves order history)"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(b.id, b.name)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-all shadow-sm"
                        >
                          Restore
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(b.id, b.name)}
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-md text-xs font-medium transition-all"
                        title={
                          b.orderCount > 0
                            ? "Hard delete restricted: has linked orders. Use Archive instead."
                            : "Permanently delete business"
                        }
                      >
                        Delete
                      </button>
                    </div>
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
            <h3 className="text-lg font-bold">
              {editingBusiness ? "Edit Business" : "Add New Business"}
            </h3>

            {formError && (
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Business Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Sultan's Dine"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

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

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Area / Locality</label>
                <input
                  type="text"
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  placeholder="e.g. Dhanmondi, Uttara"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">District</label>
                <input
                  type="text"
                  value={formDistrict}
                  onChange={(e) => setFormDistrict(e.target.value)}
                  placeholder="e.g. Dhaka, Chittagong"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

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

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 01711-223344"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Street Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. House 15, Road 2, Dhanmondi"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Latitude (optional)</label>
                <input
                  type="number"
                  step="any"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  placeholder="e.g. 23.740510"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Longitude (optional)</label>
                <input
                  type="number"
                  step="any"
                  value={formLng}
                  onChange={(e) => setFormLng(e.target.value)}
                  placeholder="e.g. 90.384620"
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
    </div>
  );
}
