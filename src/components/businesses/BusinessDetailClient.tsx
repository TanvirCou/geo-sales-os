"use client";

import { useState } from "react";
import Link from "next/link";
import RecordOrderModal, { BusinessOption, ProductOption } from "@/components/orders/RecordOrderModal";
import { MapPin, Building2, Phone, User, Calendar, ExternalLink, Plus } from "lucide-react";

interface OrderItemDisplay {
  id: string;
  name: string;
  quantity: number;
  unitPriceBdt: number;
  totalBdt: number;
}

interface OrderDisplay {
  id: string;
  externalOrderId: string | null;
  orderedAt: string | null;
  status: string;
  source: string | null;
  items: OrderItemDisplay[];
  totalBdt: number | null;
}

interface BusinessDetailData {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  district: string | null;
  contactName: string | null;
  phoneRaw: string | null;
  phoneNormalized: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  orderCount: number;
  isGreen: boolean;
  orders: OrderDisplay[];
}

interface BusinessDetailClientProps {
  business: BusinessDetailData;
  products: ProductOption[];
  businesses: BusinessOption[];
}

export default function BusinessDetailClient({
  business,
  products,
  businesses,
}: BusinessDetailClientProps) {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Address logic:
  // If 'area' contains long text (e.g. from Excel imports), that's the physical location
  // 'address' is either the user-specified street address or the map-verified address
  const physicalAddressText = business.area && business.area.length > 15
    ? business.area
    : business.address || business.area || "Not Specified";

  const mapPinAddressText = business.address || `${business.district || "Dhaka"}, Bangladesh`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/dashboard/businesses"
          className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
        >
          ← Back to Businesses
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">
                {business.name}
              </h1>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  business.isActive
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                }`}
              >
                {business.isActive ? "Active Account" : "Archived"}
              </span>
            </div>

            {/* Clean Subtitle */}
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {business.category || "General Category"}
              </span>
              {" • "}
              <span className="font-medium text-blue-600 dark:text-blue-400">
                District: {business.district || "Dhaka"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Order</span>
            </button>

            <Link
              href={`/dashboard/map/geoapify?focus=${business.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium transition-all"
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>View on Map</span>
            </Link>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Contact Person
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm">
              {business.contactName || "—"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Phone (Raw)
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm font-mono">
              {business.phoneRaw || "—"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              GPS Coordinates
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm font-mono">
              {business.latitude != null && business.longitude != null ? (
                `${business.latitude.toFixed(6)}, ${business.longitude.toFixed(6)}`
              ) : (
                <span className="text-amber-600 dark:text-amber-400">⚠️ Location Needed</span>
              )}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Marker Status
            </span>
            <p className="font-bold mt-1 text-sm text-emerald-600 dark:text-emerald-400">
              🟢 GREEN (Client in Database)
            </p>
          </div>
        </div>

        {/* ── 2-Part Clean Address Display ─────────────────────────────────── */}
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
              {business.latitude != null && (
                <span className="font-mono text-xs text-slate-500 block mt-0.5">
                  [{business.latitude.toFixed(6)}, {business.longitude?.toFixed(6)}]
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Orders History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
            Order History ({business.orders.length})
          </h2>
          <button
            type="button"
            onClick={() => setIsOrderModalOpen(true)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            + Add New Order
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="px-4 py-3.5">Order ID</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Line Items</th>
                <th className="px-4 py-3.5 text-right">Total (BDT)</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {business.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 dark:text-slate-500 font-medium">
                    No orders recorded for this business yet.
                  </td>
                </tr>
              ) : (
                business.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3.5 font-mono">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                      >
                        {o.externalOrderId || o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                      {o.orderedAt ? new Date(o.orderedAt).toLocaleDateString() : <span className="text-slate-400">—</span>}
                    </td>
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
                    <td className="px-4 py-3.5">
                      {o.items.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {o.items.map((it) => (
                            <span key={it.id} className="text-xs text-slate-500 dark:text-slate-400">
                              • {it.name} × {it.quantity} (BDT {it.unitPriceBdt})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          Total Only (Direct)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-slate-900 dark:text-slate-100 font-mono text-xs tabular-nums">
                      {o.totalBdt != null && o.totalBdt > 0
                        ? `BDT ${o.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : ""}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/dashboard/orders/${o.id}`}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium transition-all shadow-sm"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Record Order Modal ─────────────────────────────────────────── */}
      <RecordOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        businesses={businesses}
        products={products}
        initialBusinessId={business.id}
        initialBusinessName={business.name}
      />
    </div>
  );
}
