"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cancelOrder, deleteOrder } from "@/actions/orders";
import {
  Building2,
  Calendar,
  Phone,
  MapPin,
  Trash2,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

import { OrderStatus } from "@prisma/client";

interface OrderItemData {
  id: string;
  productId: string | null;
  sourceProductName: string | null;
  productName?: string;
  productSku?: string | null;
  quantity: number;
  unitPriceBdt: number;
  lineTotal: number;
}

interface OrderDetailData {
  id: string;
  externalOrderId: string | null;
  businessId: string;
  business: {
    id: string;
    name: string;
    category?: string | null;
    area: string | null;
    district: string | null;
    address: string | null;
    phoneRaw: string | null;
    contactName?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  orderedAt: string | null;
  status: OrderStatus;
  source: string | null;
  items: OrderItemData[];
  totalBdt: number | null;
}

export default function OrderDetailClient({ order }: { order: OrderDetailData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Address logic matching dedicated business page
  const physicalAddressText =
    order.business.area && order.business.area.length > 15
      ? order.business.area
      : order.business.address || order.business.area || "Not Specified";

  const mapPinAddressText =
    order.business.address || `${order.business.district || "Dhaka"}, Bangladesh`;

  // Confirmation Modals
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const confirmCancel = () => {
    startTransition(async () => {
      const res = await cancelOrder(order.id);
      setIsCancelModalOpen(false);
      if (res?.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        setFeedback({ text: "Order marked as CANCELLED successfully.", type: "success" });
        router.refresh();
      }
    });
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await deleteOrder(order.id);
      setIsDeleteModalOpen(false);
      if (res?.error) {
        setFeedback({ text: res.error, type: "error" });
      } else {
        router.push("/dashboard/orders");
      }
    });
  };

  const displayOrderId = order.externalOrderId || order.id.slice(0, 8);
  const isDelivered = order.status === "COMPLETED";
  const isPendingOrder = order.status === "PENDING";
  const isCancelled = order.status === "CANCELLED";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/orders"
          className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
        >
          ← Back to Orders
        </Link>
      </div>

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

      {/* Main Header Card (styled like BusinessDetailClient) */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  isDelivered
                    ? "bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                    : isCancelled
                    ? "bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                    : "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                }`}
              />
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                Order #{displayOrderId}
              </h1>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  isDelivered
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    : isCancelled
                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                }`}
              >
                {isDelivered && <CheckCircle2 className="w-3.5 h-3.5" />}
                {isPendingOrder && <Clock className="w-3.5 h-3.5" />}
                {isCancelled && <XCircle className="w-3.5 h-3.5" />}
                <span>{isDelivered ? "Delivered" : isCancelled ? "Cancelled" : "Pending"}</span>
              </span>
            </div>

            {/* Clean Subtitle with Category and District */}
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm flex flex-wrap items-center gap-1.5">
              <span>Client:</span>
              <Link
                href={`/dashboard/businesses/${order.business.id}`}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span>{order.business.name}</span>
                <ExternalLink className="w-3 h-3 inline" />
              </Link>
              <span>•</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {order.business.category || "General Category"}
              </span>
              <span>•</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                District: {order.business.district || "Dhaka"}
              </span>
            </p>
          </div>

          {/* Action Buttons & Order Total */}
          <div className="flex flex-col sm:items-end gap-3">
            <div className="text-left sm:text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Calculated Total Amount
              </span>
              <div className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-0.5 tabular-nums">
                {order.totalBdt != null && order.totalBdt > 0
                  ? `BDT ${order.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                  : "—"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Cancel Button: ONLY shown when order is PENDING (Delivered orders cannot be cancelled) */}
              {isPendingOrder && (
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  Cancel Order
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4-Column Key Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>Order Date & Time</span>
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm">
              {order.orderedAt
                ? new Date(order.orderedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Order Source
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm">
              {order.source || "Manual Entry"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-blue-500" />
              <span>Client Phone</span>
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm font-mono">
              {order.business.phoneRaw || "—"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>GPS Coordinates</span>
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm font-mono">
              {order.business.latitude != null && order.business.longitude != null ? (
                `${order.business.latitude.toFixed(6)}, ${order.business.longitude.toFixed(6)}`
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-sans text-xs font-medium">
                  ⚠️ Location Needed
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── 2-Part Clean Address Display (Matching Dedicated Business Page) ── */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Physical / Delivery Address (আসল ঠিকানা)</span>
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {physicalAddressText}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Map Geolocation & Pin (ম্যাপ পিন লোকেশন)</span>
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {mapPinAddressText}
              {order.business.latitude != null && order.business.longitude != null && (
                <span className="font-mono text-xs text-slate-500 block mt-0.5">
                  [{order.business.latitude.toFixed(6)}, {order.business.longitude.toFixed(6)}]
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items & Invoice Breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
          Order Items & Invoice Breakdown {order.items.length > 0 ? `(${order.items.length})` : ""}
        </h2>

        {order.items.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="px-5 py-4">Product Description</th>
                  <th className="px-5 py-4">SKU Code</th>
                  <th className="px-5 py-4 text-right">Quantity</th>
                  <th className="px-5 py-4 text-right">Unit Price (BDT)</th>
                  <th className="px-5 py-4 text-right">Subtotal (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {order.items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">
                      {item.sourceProductName || item.productName || "Item"}
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-500/20">
                        {item.productSku || "—"}
                      </code>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-slate-600 dark:text-slate-400 tabular-nums text-xs">
                      BDT {item.unitPriceBdt.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums text-sm">
                      BDT {item.lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/90 dark:bg-slate-850 border-t-2 border-slate-200 dark:border-slate-800">
                  <td colSpan={4} className="px-5 py-4 text-right font-bold text-slate-700 dark:text-slate-200">
                    Grand Total:
                  </td>
                  <td className="px-5 py-4 text-right font-extrabold text-xl text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                    BDT {(order.totalBdt ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 sm:p-8 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg">
              ৳
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Direct Total Amount Invoice (Lump-sum / Excel Import)
            </h4>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {order.totalBdt != null && order.totalBdt > 0 ? (
                <>
                  This order was recorded as a direct lump-sum invoice of{" "}
                  <strong className="text-slate-900 dark:text-white font-mono">
                    BDT {order.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </strong>
                  . No individual SKU product line items were specified.
                </>
              ) : (
                "This order was recorded without line items or specified price."
              )}
            </p>
          </div>
        )}
      </div>

      {/* ── Cancel Order Confirmation Modal ────────────────────────────────────── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Cancel Order #{displayOrderId}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to cancel this order for <strong className="text-slate-900 dark:text-white font-semibold">"{order.business.name}"</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5 leading-relaxed">
              This will update the order status to <strong>CANCELLED</strong>. Historical records will be retained, and the client will remain on the sales map.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Keep Order
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={confirmCancel}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/25 transition-all disabled:opacity-50"
              >
                {isPending ? "Cancelling…" : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Order Confirmation Modal ────────────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Permanently Delete Order #{displayOrderId}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to permanently delete this order for <strong className="text-slate-900 dark:text-white font-semibold">"{order.business.name}"</strong>?
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1 text-rose-800 dark:text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Action Cannot Be Undone</span>
              </div>
              <p>
                This will permanently delete this order and all associated line items from the database. If this was the client's only recorded order, the client's pin on the sales map will return to <strong>RED</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={confirmDelete}
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
