"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import { useToast } from "@/components/ui/Toast";
import RecordOrderModal from "@/components/orders/RecordOrderModal";
import { Trash2, AlertTriangle, MoreVertical, Eye, Ban } from "lucide-react";

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
  const toast = useToast();
  const [orders, setOrders] = useState<OrderDisplay[]>(initialOrders);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);
  const [q, setQ] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const [openActionOrder, setOpenActionOrder] = useState<OrderDisplay | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, o: OrderDisplay) => {
    e.stopPropagation();
    if (openActionOrder?.id === o.id) {
      setOpenActionOrder(null);
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
    setOpenActionOrder(o);
  };

  // Close 3-dot action menu when clicking outside, scrolling, or resizing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionOrder(null);
        setMenuCoords(null);
      }
    };
    const handleScrollOrResize = () => {
      if (openActionOrder) {
        setOpenActionOrder(null);
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
  }, [openActionOrder]);

  const confirmCancelAction = () => {
    if (!cancellingOrder) return;
    const target = cancellingOrder;
    startTransition(async () => {
      const res = await cancelOrder(target.id);
      setCancellingOrder(null);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.warning(`Order #${target.extId || target.id.slice(0, 8)} marked as CANCELLED.`);
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
        toast.error(res.error);
      } else {
        toast.success(`Order #${target.extId || target.id.slice(0, 8)} permanently deleted.`);
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
              <th className="px-4 py-3.5 w-[130px] whitespace-nowrap">Order ID</th>
              <th className="px-4 py-3.5 min-w-[180px]">Client Business</th>
              <th className="px-4 py-3.5 min-w-[180px]">Area / District</th>
              <th className="px-4 py-3.5 w-[120px] whitespace-nowrap">Status</th>
              <th className="px-4 py-3.5 w-[150px] whitespace-nowrap">Items</th>
              <th className="px-4 py-3.5 w-[140px] text-right whitespace-nowrap">Total (BDT)</th>
              <th className="px-4 py-3.5 w-[120px] whitespace-nowrap">Date</th>
              <th className="px-4 py-3.5 w-16 text-right whitespace-nowrap">Actions</th>
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
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
                    >
                      {o.externalOrderId || o.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 min-w-[180px]">
                    <Link
                      href={`/dashboard/businesses/${o.businessId}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {o.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 min-w-[180px]">{o.businessArea}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
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
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
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
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-white font-mono text-xs tabular-nums whitespace-nowrap">
                    {o.totalBdt != null && o.totalBdt > 0
                      ? `BDT ${o.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : ""}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {o.orderedAt ? new Date(o.orderedAt).toLocaleDateString() : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3.5 w-16 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => handleToggleActionMenu(e, o)}
                      className={`p-1.5 rounded-lg border transition-all ${
                        openActionOrder?.id === o.id
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

      {/* Record New Order Modal */}
      <RecordOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        businesses={businesses}
        products={products}
        onSuccess={() => {
          toast.success("Order recorded. Business map marker updated.");
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

      {/* Floating 3-Dot Action Menu Portal */}
      {mounted && openActionOrder && menuCoords && typeof document !== "undefined" && createPortal(
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
            <Link
              href={`/dashboard/orders/${openActionOrder.id}`}
              onClick={() => {
                setOpenActionOrder(null);
                setMenuCoords(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>View Order</span>
            </Link>

            <Link
              href={`/dashboard/businesses/${openActionOrder.businessId}`}
              onClick={() => {
                setOpenActionOrder(null);
                setMenuCoords(null);
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70 flex items-center gap-2 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>View Business</span>
            </Link>
          </div>

          <div className="py-1">
            {openActionOrder.status === "PENDING" && (
              <button
                type="button"
                onClick={() => {
                  const target = openActionOrder;
                  setOpenActionOrder(null);
                  setMenuCoords(null);
                  setCancellingOrder({
                    id: target.id,
                    extId: target.externalOrderId,
                    businessName: target.businessName,
                  });
                }}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5 text-amber-500" />
                <span>Cancel Order</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                const target = openActionOrder;
                setOpenActionOrder(null);
                setMenuCoords(null);
                setDeletingOrder({
                  id: target.id,
                  extId: target.externalOrderId,
                  businessName: target.businessName,
                });
              }}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete Order</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
