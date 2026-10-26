"use client";

import { useState, useTransition } from "react";
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

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  priceBdt: number;
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
  const [products] = useState<ProductItem[]>(initialProducts);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Transitions
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSku("");
    setFormPrice("");
    setFormUnit("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku || "");
    setFormPrice(String(p.priceBdt));
    setFormUnit(p.unit || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      setFormError("Product name is required.");
      return;
    }
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError("Valid non-negative price is required.");
      return;
    }

    const payload: ProductInput = {
      name: formName.trim(),
      sku: formSku.trim() || undefined,
      priceBdt: priceNum,
      unit: formUnit.trim() || undefined,
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
        setFeedback({
          text: editingProduct
            ? `Updated "${formName}". Note: Existing order lines retain their historical price.`
            : `Product "${formName}" created.`,
          type: "success",
        });
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteProduct(id);
      if (res.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({ text: `Deleted "${name}" successfully.`, type: "success" });
        router.refresh();
      }
    });
  };

  const handleArchive = (id: string, name: string) => {
    startTransition(async () => {
      const res = await archiveProduct(id);
      if (res.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({ text: `Archived "${name}". Historical orders will keep historical unit prices.`, type: "success" });
        router.refresh();
      }
    });
  };

  const handleRestore = (id: string, name: string) => {
    startTransition(async () => {
      const res = await restoreProduct(id);
      if (res.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({ text: `Restored "${name}" to active catalog.`, type: "success" });
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
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border transition-all ${
            feedback.type === "error"
              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20"
              : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors p-1"
          >
            ✕
          </button>
        </div>
      )}

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
              <th className="px-5 py-3.5">Product Name</th>
              <th className="px-5 py-3.5">SKU</th>
              <th className="px-5 py-3.5">Unit</th>
              <th className="px-5 py-3.5 text-right">Catalog Price (BDT)</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Referenced in Orders</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                  No products found.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{p.name}</td>
                  <td className="px-5 py-3.5">
                    <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                      {p.sku || "—"}
                    </code>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300">{p.unit || "Unit"}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900 dark:text-white font-mono text-xs tabular-nums">
                    BDT {p.priceBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5">
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
                  <td className="px-5 py-3.5">
                    <span className={p.orderItemCount > 0 ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-400 dark:text-slate-500"}>
                      {p.orderItemCount} order line(s)
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium shadow-sm transition-all"
                      >
                        Edit
                      </button>

                      {p.isActive ? (
                        <button
                          onClick={() => handleArchive(p.id, p.name)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium shadow-sm transition-all"
                          title="Archive product (preserves historical order items)"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRestore(p.id, p.name)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium shadow-sm transition-all"
                        >
                          Restore
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-md text-xs font-medium transition-all"
                        title={
                          p.orderItemCount > 0
                            ? "Hard delete restricted: referenced in historical orders. Use Archive instead."
                            : "Permanently delete product"
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
                  placeholder="e.g. Pure Mustard Oil 1L"
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
                    placeholder="e.g. OIL-MST-1L"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Unit (optional)</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. Bottle, Bag"
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Price in BDT *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="e.g. 320.00"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono shadow-sm"
                />
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
    </div>
  );
}
