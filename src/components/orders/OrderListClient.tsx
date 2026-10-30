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
import RecordOrderModal from "@/components/orders/RecordOrderModal";
import { Trash2, AlertTriangle } from "lucide-react";

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
  orderedAt: string | null;
  status: OrderStatus;
  source: string | null;
  itemCount: number;
  totalBdt: number | null;
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
  priceBdt: number | null;
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

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const openAddModal = () => {
    setIsModalOpen(true);
  };


  // Confirmation Modals State
  const [cancellingOrder, setCancellingOrder] = useState<{
    id: string;
    extId: string | null;
    businessName: string;
  } | null>(null);

  const [deletingOrder, setDeletingOrder] = useState<{
    id: string;
    extId: string | null;
    businessName: string;
  } | null>(null);

  const confirmCancelAction = () => {
    if (!cancellingOrder) return;
    const target = cancellingOrder;
    startTransition(async () => {
      const res = await cancelOrder(target.id);
      setCancellingOrder(null);
      if (res?.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({
          text: `Order #${target.extId || target.id.slice(0, 8)} marked as CANCELLED.`,
          type: "success",
        });
        router.refresh();
      }
    });
  };

  const confirmDeleteAction = () => {
    if (!deletingOrder) return;
    const target = deletingOrder;
    startTransition(async () => {
      const res = await deleteOrder(target.id);
      setDeletingOrder(null);
      if (res?.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({
          text: `Order #${target.extId || target.id.slice(0, 8)} permanently deleted.`,
          type: "success",
        });
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

  // Sort orders: newest date first; orders with NO date (null) go to the very end
  const sortedOrders = [...filtered].sort((a, b) => {
    if (a.orderedAt && b.orderedAt) {
      return new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime();
    }
    if (a.orderedAt && !b.orderedAt) return -1;
    if (!a.orderedAt && b.orderedAt) return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedOrders.length / PAGE_SIZE) || 1;
  const paginatedOrders = sortedOrders.slice(
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
            <option value="COMPLETED">Delivered</option>
            <option value="PENDING">Pending</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <Link
            href="/dashboard/imports"
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>📥</span> Import Excel
          </Link>

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
                      {o.status === "COMPLETED"
                        ? "Delivered"
                        : o.status === "CANCELLED"
                        ? "Cancelled"
                        : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    {o.itemCount > 0 ? (
                      <span
                        title={o.items.map((i) => `${i.name} (${i.quantity})`).join(", ")}
                        className="inline-flex items-center gap-1 cursor-help"
                      >
                        {o.itemCount} line item(s)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Total Only (Direct)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-white font-mono text-xs tabular-nums">
                    {o.totalBdt != null && o.totalBdt > 0
                      ? `BDT ${o.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : ""}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                    {o.orderedAt ? new Date(o.orderedAt).toLocaleDateString() : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium transition-all shadow-sm"
                      >
                        View
                      </Link>

                      {/* Cancel option is ONLY shown for PENDING orders (Delivered orders cannot be cancelled) */}
                      {o.status === "PENDING" && (
                        <button
                          onClick={() =>
                            setCancellingOrder({
                              id: o.id,
                              extId: o.externalOrderId,
                              businessName: o.businessName,
                            })
                          }
                          className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-md text-xs font-medium transition-all"
                          title="Cancel pending order"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        onClick={() =>
                          setDeletingOrder({
                            id: o.id,
                            extId: o.externalOrderId,
                            businessName: o.businessName,
                          })
                        }
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
      <RecordOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        businesses={businesses}
        products={products}
        onSuccess={() => {
          setFeedback({ text: "Order recorded successfully. Business marker updated.", type: "success" });
        }}
      />

      {/* ── Cancel Order Confirmation Modal ────────────────────────────────────── */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cancel Order #{cancellingOrder.extId || cancellingOrder.id.slice(0, 8)}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to cancel this order for <strong className="text-slate-900 dark:text-white font-semibold">"{cancellingOrder.businessName}"</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5 leading-relaxed">
              Order status will be set to <strong>CANCELLED</strong>. Historical records will be retained, and the client will remain on the sales map.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Keep Order
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={confirmCancelAction}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 transition-all disabled:opacity-50"
              >
                {isPending ? "Cancelling…" : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Order Confirmation Modal ────────────────────────────────────── */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete Order #{deletingOrder.extId || deletingOrder.id.slice(0, 8)}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to permanently delete this order for <strong className="text-slate-900 dark:text-white font-semibold">"{deletingOrder.businessName}"</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1 text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Action Cannot Be Undone</span>
              </div>
              <p>
                All items in this order will be permanently removed. If this is the client's only recorded order, the client's marker color on the sales map will return to <strong>RED</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
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
                {isPending ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
