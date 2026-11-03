"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { restoreBusiness } from "@/actions/businesses";
import RecordOrderModal, { BusinessOption, ProductOption } from "@/components/orders/RecordOrderModal";
import { MapPin, Building2, Phone, User, Calendar, ExternalLink, Plus, ChevronDown, Map, Navigation, AlertCircle, RotateCcw, Globe, CheckCircle2, Layers } from "lucide-react";

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
  osmLatitude?: number | null;
  osmLongitude?: number | null;
  osmPlaceId?: string | null;
  osmFormattedAddress?: string | null;
  googleLatitude?: number | null;
  googleLongitude?: number | null;
  googlePlaceId?: string | null;
  googleFormattedAddress?: string | null;
  customLatitude?: number | null;
  customLongitude?: number | null;
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
  const [isMapDropdownOpen, setIsMapDropdownOpen] = useState(false);
  const mapDropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const handleRestore = () => {
    startTransition(async () => {
      const res = await restoreBusiness(business.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`"${business.name}" restored to active status.`);
        router.refresh();
      }
    });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mapDropdownRef.current &&
        !mapDropdownRef.current.contains(event.target as Node)
      ) {
        setIsMapDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasCoordinates = business.latitude != null && business.longitude != null;

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
              <span
                className={`w-3 h-3 rounded-full ${
                  business.isActive
                    ? "bg-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]"
                    : "bg-slate-400 dark:bg-slate-500"
                }`}
              />
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
            {business.isActive ? (
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/25 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRestore}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                title="Restore this business to active directory to record orders"
              >
                <RotateCcw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                <span>Restore Account</span>
              </button>
            )}

            {/* View on Map Dropdown */}
            <div className="relative" ref={mapDropdownRef}>
              <button
                type="button"
                onClick={() => setIsMapDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>View on Map</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    isMapDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isMapDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in space-y-1">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Select Map Provider
                  </div>

                  {/* Option 1: Google Maps */}
                  <Link
                    href={`/dashboard/map/google?focus=${business.id}`}
                    onClick={() => setIsMapDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-blue-50/80 dark:hover:bg-blue-500/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Map className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        Google Maps
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        View business pin with street routing &amp; directions
                      </p>
                    </div>
                  </Link>

                  {/* Option 2: MapLibre (Geoapify) */}
                  <Link
                    href={`/dashboard/map/geoapify?focus=${business.id}`}
                    onClick={() => setIsMapDropdownOpen(false)}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50/80 dark:hover:bg-emerald-500/10 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        MapLibre (Geoapify)
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Vector OSM bright map with fast route calculation
                      </p>
                    </div>
                  </Link>

                  {!hasCoordinates && (
                    <div className="mt-1 p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Note: This business has no GPS coordinates yet.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
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
            {business.isActive ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] shrink-0" />
                <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  GREEN (Active Client in Database)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span className="w-3 h-3 rounded-full bg-slate-400 dark:bg-slate-500 ring-2 ring-slate-300 dark:ring-slate-600 shrink-0" />
                <span className="font-bold text-sm text-slate-600 dark:text-slate-400">
                  GREY (Archived — Inactive Account)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Delivery Address & Dual Map Engine Geolocation Display ───────── */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4 text-xs md:text-sm">
          {/* Physical Address */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Physical / Delivery Address (আসল ঠিকানা)</span>
            </span>
            <p className="text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
              {physicalAddressText}
            </p>
          </div>

          {/* Dual Engine Pin Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Maps Official Pin */}
            <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <Map className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Maps Official Pin</span>
                </span>
                {business.googleLatitude != null ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Pin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    <AlertCircle className="w-3 h-3" />
                    Pending Sync
                  </span>
                )}
              </div>

              <div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {business.googleFormattedAddress || business.address || "Google address not mapped yet"}
                </div>
                <div className="font-mono text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {business.googleLatitude != null && business.googleLongitude != null
                    ? `[${business.googleLatitude.toFixed(6)}, ${business.googleLongitude.toFixed(6)}]`
                    : "No Google coordinates"}
                </div>
                {business.googlePlaceId && (
                  <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={business.googlePlaceId}>
                    Place ID: {business.googlePlaceId}
                  </div>
                )}
              </div>

              <div className="pt-1">
                <Link
                  href={`/dashboard/map/google?focus=${business.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  <span>Open in Google Map</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* OpenStreetMap / Geoapify Pin */}
            <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>OpenStreetMap (MapLibre) Pin</span>
                </span>
                {business.osmLatitude != null ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified Pin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </span>
                )}
              </div>

              <div>
                <div className="text-slate-800 dark:text-slate-200 font-medium">
                  {business.osmFormattedAddress || mapPinAddressText}
                </div>
                <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {business.osmLatitude != null && business.osmLongitude != null
                    ? `[${business.osmLatitude.toFixed(6)}, ${business.osmLongitude.toFixed(6)}]`
                    : business.latitude != null
                    ? `[${business.latitude.toFixed(6)}, ${business.longitude?.toFixed(6)}]`
                    : "No OSM coordinates"}
                </div>
                {business.osmPlaceId && (
                  <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5" title={business.osmPlaceId}>
                    Place ID: {business.osmPlaceId}
                  </div>
                )}
              </div>

              <div className="pt-1">
                <Link
                  href={`/dashboard/map/geoapify?focus=${business.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  <span>Open in MapLibre OSM</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
            Order History ({business.orders.length})
          </h2>
          {!business.isActive && (
            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 px-2.5 py-1 rounded-lg font-medium">
              Archived (Restore account to add new orders)
            </span>
          )}
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
