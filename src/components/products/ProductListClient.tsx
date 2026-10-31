"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  restoreProduct,
  ProductInput,
} from "@/actions/products";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { Trash2, AlertTriangle, Archive as ArchiveIcon, MoreVertical, Edit, RotateCcw } from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  priceBdt: number | null;
  unit: string | null;
  isActive: boolean;
  orderItemCount: number;
  createdAt: string;
}

export default function ProductListClient({
  initialProducts,
}: {
  initialProducts: ProductItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmation Modals State
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);
  const [archivingProduct, setArchivingProduct] = useState<ProductItem | null>(null);
  const [restoringProduct, setRestoringProduct] = useState<ProductItem | null>(null);
  const [openActionProduct, setOpenActionProduct] = useState<ProductItem | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, p: ProductItem) => {
    e.stopPropagation();
    if (openActionProduct?.id === p.id) {
      setOpenActionProduct(null);
      setMenuCoords(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < 200 && rect.top > 200;

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
    setOpenActionProduct(p);
  };

  // Close 3-dot action menu when clicking outside, scrolling, or resizing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionProduct(null);
        setMenuCoords(null);
      }
    };
    const handleScrollOrResize = () => {
      if (openActionProduct) {
        setOpenActionProduct(null);
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
  }, [openActionProduct]);

  // Transitions
  const [isPending, startTransition] = useTransition();

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSku("");
    setFormUnit("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku || "");
    setFormUnit(p.unit || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      setFormError("Product name is required.");
      return;
    }

    const payload: ProductInput = {
      name: formName.trim(),
      sku: formSku.trim() || undefined,
      unit: formUnit.trim() || undefined,
      priceBdt: null,
    };

    startTransition(async () => {
      let res;
      if (editingProduct) {
        res = await updateProduct(editingProduct.id, payload);
      } else {
        res = await createProduct(payload);
      }

      if (res?.error) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        if (editingProduct) {
          toast.success(`"${formName}" updated. Historical order prices unchanged.`);
        } else {
          toast.success(`Product "${formName}" created successfully.`);
        }
        router.refresh();
      }
    });
  };

  const confirmDeleteAction = () => {
    if (!deletingProduct) return;
    const target = deletingProduct;
    startTransition(async () => {
      const res = await deleteProduct(target.id);
      setDeletingProduct(null);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`"${target.name}" deleted permanently.`);
        router.refresh();
      }
    });
  };

  const confirmArchiveAction = () => {
    if (!archivingProduct) return;
    const target = archivingProduct;
    startTransition(async () => {
      const res = await archiveProduct(target.id);
      setArchivingProduct(null);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.warning(`"${target.name}" archived. Historical order prices preserved.`);
        router.refresh();
      }
    });
  };

  const handleRestore = (product: ProductItem) => {
    setRestoringProduct(product);
  };

  const confirmRestoreAction = () => {
    if (!restoringProduct) return;
    const { id, name } = restoringProduct;
    startTransition(async () => {
      const res = await restoreProduct(id);
      setRestoringProduct(null);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`"${name}" restored to active catalog.`);
        router.refresh();
      }
    });
  };

  const filtered = products.filter((p) => {
    if (showArchived ? p.isActive : !p.isActive) return false;
    if (q) {
      const query = q.toLowerCase();
      const matchName = p.name.toLowerCase().includes(query);
      const matchSku = p.sku?.toLowerCase().includes(query) || false;
      if (!matchName && !matchSku) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedProducts = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Action / Search Bar */}
      <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search products by name or SKU…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <button
            onClick={() => {
              setShowArchived(!showArchived);
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-all shadow-sm ${
              showArchived
                ? "bg-blue-600 text-white border-blue-500"
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            }`}
          >
            {showArchived ? "Showing Archived" : "Show Archived"}
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>+</span> Add Product
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          Showing <strong className="text-slate-900 dark:text-slate-100 font-semibold">{filtered.length}</strong> {showArchived ? "archived" : "active"} products in catalog
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="px-5 py-3.5 min-w-[220px]">Product Name</th>
              <th className="px-5 py-3.5 w-[140px] whitespace-nowrap">SKU</th>
              <th className="px-5 py-3.5 w-[100px] whitespace-nowrap">Unit</th>
              <th className="px-5 py-3.5 w-[120px] whitespace-nowrap">Status</th>
              <th className="px-5 py-3.5 w-[180px] whitespace-nowrap">Referenced in Orders</th>
              <th className="px-5 py-3.5 w-16 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                  No products found.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white min-w-[220px]">{p.name}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                      {p.sku || "—"}
                    </code>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{p.unit || "Pcs"}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        p.isActive
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                      }`}
                    >
                      {p.isActive ? "Active" : "Archived"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className={p.orderItemCount > 0 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-400 dark:text-slate-500"}>
                      {p.orderItemCount} order line(s)
                    </span>
                  </td>
                  <td className="px-5 py-3.5 w-16 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => handleToggleActionMenu(e, p)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                        openActionProduct?.id === p.id
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </h3>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Product Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Menu Book"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">SKU (optional)</label>
                  <input
                    type="text"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="e.g. MENU-BK-01"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Unit (optional)</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. Pcs, Box, Set"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {isPending ? "Saving…" : editingProduct ? "Update Product" : "Create Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Archive Confirmation Modal ─────────────────────────────────────── */}
      {archivingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ArchiveIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Archive Product
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to archive <strong className="text-slate-900 dark:text-white font-semibold">"{archivingProduct.name}"</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5 leading-relaxed">
              Archiving hides this product from the active catalog and new order entry. Historical orders ({archivingProduct.orderItemCount} order line(s)) will preserve their recorded prices, and you can restore it anytime using <strong>"Show Archived"</strong>.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setArchivingProduct(null)}
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
                {isPending ? "Archiving..." : "Archive Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Delete Product
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white font-semibold">"{deletingProduct.name}"</strong>?
                </p>
              </div>
            </div>

            {deletingProduct.orderItemCount > 0 ? (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-200">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Referenced in {deletingProduct.orderItemCount} Historical Order Line(s)</span>
                </div>
                <p className="leading-relaxed">
                  Hard delete is restricted because historical orders reference this product. To preserve invoice records, please archive this product instead.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                This action cannot be undone. This product record will be permanently deleted from the database.
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>

              {deletingProduct.orderItemCount > 0 ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const p = deletingProduct;
                    setDeletingProduct(null);
                    setArchivingProduct(p);
                  }}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 transition-all"
                >
                  Archive Instead
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={confirmDeleteAction}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition-all disabled:opacity-50"
                >
                  {isPending ? "Deleting..." : "Delete Permanently"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Restore Confirmation Modal ──────────────────────────────────────── */}
      {restoringProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ArchiveIcon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Restore Product
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Restore <strong className="text-slate-900 dark:text-white font-semibold">"{restoringProduct.name}"</strong> to the active catalog?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              This product will become available again for new orders. All {restoringProduct.orderItemCount} existing order line(s) and their historical prices remain untouched.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRestoringProduct(null)}
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
                {isPending ? "Restoring..." : "Restore Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating 3-Dot Action Menu Portal */}
      {mounted && openActionProduct && menuCoords && typeof document !== "undefined" && createPortal(
        <div
          ref={actionMenuRef}
          style={{
            position: "fixed",
            top: menuCoords.top !== undefined ? `${menuCoords.top}px` : undefined,
            bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : undefined,
            right: `${menuCoords.right}px`,
            zIndex: 9999,
          }}
          className="w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-1 animate-fade-in divide-y divide-slate-100 dark:divide-slate-800/80"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                const target = openActionProduct;
                setOpenActionProduct(null);
                setMenuCoords(null);
                openEditModal(target);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-blue-500" />
              <span>Edit Product</span>
            </button>
          </div>

          <div className="py-1">
            {openActionProduct.isActive ? (
              <button
                type="button"
                onClick={() => {
                  const target = openActionProduct;
                  setOpenActionProduct(null);
                  setMenuCoords(null);
                  setArchivingProduct(target);
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
                  const target = openActionProduct;
                  setOpenActionProduct(null);
                  setMenuCoords(null);
                  handleRestore(target);
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
                <span>Restore</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const target = openActionProduct;
                setOpenActionProduct(null);
                setMenuCoords(null);
                setDeletingProduct(target);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
