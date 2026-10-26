"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  createOrder,
  cancelOrder,
  deleteOrder,
  OrderInput,
  OrderItemInput,
} from "@/actions/orders";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import { Pagination } from "@/components/ui/Pagination";

interface OrderItemDisplay {
  id: string;
  name: string;
  quantity: number;
  unitPriceBdt: number;
}

interface OrderDisplay {
  id: string;
  externalOrderId: string | null;
  businessId: string;
  businessName: string;
  businessArea: string;
  orderedAt: string;
  status: OrderStatus;
  source: string | null;
  itemCount: number;
  totalBdt: number;
  items: OrderItemDisplay[];
}

interface BusinessOption {
  id: string;
  name: string;
  area: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  priceBdt: number;
  unit: string | null;
}

export default function OrderListClient({
  initialOrders,
  businesses,
  products,
}: {
  initialOrders: OrderDisplay[];
  businesses: BusinessOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderDisplay[]>(initialOrders);
  const [q, setQ] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formBusinessId, setFormBusinessId] = useState(businesses[0]?.id || "");
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formStatus, setFormStatus] = useState<OrderStatus>(OrderStatus.COMPLETED);
  const [formExtId, setFormExtId] = useState("");
  const [formItems, setFormItems] = useState<
    { productId: string; quantity: number; unitPriceBdt: number }[]
  >([{ productId: products[0]?.id || "", quantity: 1, unitPriceBdt: products[0]?.priceBdt || 0 }]);

  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openAddModal = () => {
    setFormBusinessId(businesses[0]?.id || "");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormStatus(OrderStatus.COMPLETED);
    setFormExtId(`ORD-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormItems([
      {
        productId: products[0]?.id || "",
        quantity: 1,
        unitPriceBdt: products[0]?.priceBdt || 0,
      },
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...formItems];
    updated[index].productId = productId;
    if (prod) {
      updated[index].unitPriceBdt = prod.priceBdt;
    }
    setFormItems(updated);
  };

  const handleItemChange = (index: number, field: "quantity" | "unitPriceBdt", val: number) => {
    const updated = [...formItems];
    updated[index][field] = val;
    setFormItems(updated);
  };

  const addItemRow = () => {
    setFormItems([
      ...formItems,
      {
        productId: products[0]?.id || "",
        quantity: 1,
        unitPriceBdt: products[0]?.priceBdt || 0,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const calculatedFormTotal = formItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPriceBdt) || 0),
    0
  );

  const handleSaveOrder = () => {
    if (!formBusinessId) {
      setFormError("Please select a business.");
      return;
    }
    if (formItems.length === 0) {
      setFormError("Please add at least one line item.");
      return;
    }

    const payload: OrderInput = {
      businessId: formBusinessId,
      orderedAt: formDate ? new Date(formDate).toISOString() : new Date().toISOString(),
      status: formStatus,
      externalOrderId: formExtId.trim() || undefined,
      items: formItems.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        return {
          productId: it.productId,
          sourceProductName: prod?.name || "Product",
          quantity: it.quantity,
          unitPriceBdt: it.unitPriceBdt,
        };
      }),
    };

    startTransition(async () => {
      const res = await createOrder(payload);
      if (res?.error) {
        setFormError(res.error);
      } else {
        setIsModalOpen(false);
        setFeedback({ text: "Order recorded successfully. Business marker updated.", type: "success" });
        router.refresh();
      }
    });
  };

  const handleCancelOrder = (id: string, extId: string | null) => {
    if (!confirm(`Cancel order ${extId || id.slice(0, 8)}? Order history is preserved.`)) return;

    startTransition(async () => {
      const res = await cancelOrder(id);
      if (res.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({ text: "Order marked as CANCELLED. (Note: Business marker remains GREEN per rule).", type: "success" });
        router.refresh();
      }
    });
  };

  const handleDeleteOrder = (id: string, extId: string | null) => {
    if (
      !confirm(
        `PERMANENTLY DELETE mistaken order ${extId || id.slice(0, 8)}? This will remove all items. If this is the business's last order, its marker color will return to RED.`
      )
    )
      return;

    startTransition(async () => {
      const res = await deleteOrder(id);
      if (res.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({ text: "Order permanently deleted.", type: "success" });
        router.refresh();
      }
    });
  };

  const filtered = orders.filter((o) => {
    if (selectedStatus !== "ALL" && o.status !== selectedStatus) return false;
    if (q) {
      const query = q.toLowerCase();
      const matchExt = o.externalOrderId?.toLowerCase().includes(query) || false;
      const matchBus = o.businessName.toLowerCase().includes(query);
      const matchArea = o.businessArea.toLowerCase().includes(query);
      if (!matchExt && !matchBus && !matchArea) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedOrders = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
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
              placeholder="Search by order ID, business name, or area…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PARTIAL">Partial</option>
          </select>

          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>+</span> Record New Order
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          Showing <strong className="text-slate-900 dark:text-slate-100 font-semibold">{filtered.length}</strong> recorded orders
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <th className="px-4 py-3.5">Order ID</th>
              <th className="px-4 py-3.5">Client Business</th>
              <th className="px-4 py-3.5">Area / District</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Items</th>
              <th className="px-4 py-3.5 text-right">Total (BDT)</th>
              <th className="px-4 py-3.5">Date</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                  No orders found.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                    >
                      {o.externalOrderId || o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/dashboard/businesses/${o.businessId}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {o.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{o.businessArea}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        o.status === "COMPLETED"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : o.status === "CANCELLED"
                          ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                          : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    <span title={o.items.map((i) => `${i.name} (${i.quantity})`).join(", ")}>
                      {o.itemCount} line item(s)
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-white font-mono text-xs tabular-nums">
                    BDT {o.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                    {new Date(o.orderedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium transition-all shadow-sm"
                      >
                        View
                      </Link>

                      {o.status !== "CANCELLED" && (
                        <button
                          onClick={() => handleCancelOrder(o.id, o.externalOrderId)}
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-md text-xs font-medium transition-all"
                          title="Cancel order (retains history)"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteOrder(o.id, o.externalOrderId)}
                        className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-md text-xs font-medium transition-all"
                        title="Permanently remove mistaken entry"
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

      {/* Record New Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <h3 className="text-lg font-bold">
              Record New Client Order
            </h3>

            {formError && (
              <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Client Business *</label>
                <select
                  value={formBusinessId}
                  onChange={(e) => setFormBusinessId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.area || "Unspecified"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Order Reference ID</label>
                <input
                  type="text"
                  value={formExtId}
                  onChange={(e) => setFormExtId(e.target.value)}
                  placeholder="e.g. ORD-2026-001"
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 font-mono shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Order Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Initial Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as OrderStatus)}
                  className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 shadow-sm"
                >
                  <option value={OrderStatus.COMPLETED}>Completed</option>
                  <option value={OrderStatus.PENDING}>Pending</option>
                  <option value={OrderStatus.CANCELLED}>Cancelled</option>
                </select>
              </div>
            </div>

            {/* Line Items Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Order Line Items</h4>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium transition-all"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-2.5">
                {formItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:grid sm:grid-cols-[1fr_80px_100px_36px] gap-2 p-2.5 sm:p-0 bg-slate-50 dark:bg-slate-800/40 sm:bg-transparent sm:dark:bg-transparent rounded-lg border sm:border-0 border-slate-200 dark:border-slate-700/60 items-center"
                  >
                    <div className="w-full">
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500 shadow-sm"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (BDT {p.priceBdt})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:contents">
                      <div className="flex-1 sm:flex-initial">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:border-blue-500 font-mono shadow-sm"
                        />
                      </div>

                      <div className="flex-1 sm:flex-initial">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={item.unitPriceBdt}
                          onChange={(e) => handleItemChange(idx, "unitPriceBdt", parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 text-right focus:outline-none focus:border-blue-500 font-mono shadow-sm"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={formItems.length === 1}
                        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:opacity-30 transition-colors border border-rose-100 dark:border-transparent"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Calculated Total Display */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Calculated Order Total:</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                  BDT {calculatedFormTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
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
                onClick={handleSaveOrder}
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {isPending ? "Recording…" : "Save Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
