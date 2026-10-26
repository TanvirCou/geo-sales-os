import type { Metadata } from "next";
import Link from "next/link";
import { getDashboardKPIs } from "@/actions/dashboard";

export const metadata: Metadata = { title: "Dashboard — Business Sales" };

export default async function DashboardPage() {
  const kpis = await getDashboardKPIs();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sales & Operations Overview
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time analytics across registered businesses, catalog products, and field orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/businesses"
            className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            Manage Businesses
          </Link>
          <Link
            href="/dashboard/map/google"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>Explore Map</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Row 1: Primary Catalog Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Businesses */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm font-medium">
            <span>Total Businesses</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18" />
                <path d="M19 21v-4" />
                <path d="M19 13V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16" />
                <path d="M9 7h2" /><path d="M9 11h2" /><path d="M9 15h2" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {kpis.totalBusinesses}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Registered client prospects across districts
            </p>
          </div>
        </div>

        {/* Total Products */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm font-medium">
            <span>Active Products</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" />
                <path d="M12 22V12" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {kpis.totalProducts}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Catalog SKUs with active pricing
            </p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-sm font-medium">
            <span>Recorded Orders</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {kpis.totalOrders}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Field transactions logged in PostgreSQL
            </p>
          </div>
        </div>
      </div>

      {/* Row 2: Status & Health with Elegant Gradients */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Green Accounts */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-slate-900/60 dark:to-slate-900 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Green Businesses</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
              Orders ≥ 1
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {kpis.greenBusinesses}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active clients with at least 1 order recorded
            </p>
          </div>
        </div>

        {/* Red Accounts */}
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-gradient-to-br from-rose-50 via-white to-white dark:from-rose-950/30 dark:via-slate-900/60 dark:to-slate-900 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-rose-800 dark:text-rose-300">Red Businesses</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/15 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30">
              Orders = 0
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {kpis.redBusinesses}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Prospect accounts with zero recorded orders
            </p>
          </div>
        </div>

        {/* Needs Location */}
        <div className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-gradient-to-br from-amber-50 via-white to-white dark:from-amber-950/30 dark:via-slate-900/60 dark:to-slate-900 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Location Needed</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
              Attention
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 tracking-tight">
              {kpis.unlocatedBusinesses}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Accounts missing GPS coordinates for map pins
            </p>
          </div>
        </div>
      </div>

      {/* Dual Map Comparison Banner */}
      <div className="rounded-xl border border-blue-200/80 dark:border-slate-800 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white dark:from-slate-900 dark:via-slate-900/80 dark:to-blue-950/40 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Geospatial Engine Comparison
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Shared PostgreSQL Geo-Data
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Both map engines query the exact same PostgreSQL database with shared Green (Orders ≥ 1) and Red (Orders = 0) marker status rules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/map/google"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Google Maps (New)
          </Link>
          <Link
            href="/dashboard/map/geoapify"
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            MapLibre (Geoapify)
          </Link>
        </div>
      </div>

      {/* Recent Field Orders Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recent Field Orders</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest recorded transactions across businesses</p>
          </div>
          <Link
            href="/dashboard/orders"
            className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all orders →
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="px-6 py-3.5">Order Ref</th>
                <th className="px-6 py-3.5">Client Business</th>
                <th className="px-6 py-3.5">Area / District</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Items</th>
                <th className="px-6 py-3.5 text-right">Total (BDT)</th>
                <th className="px-6 py-3.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {kpis.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500 font-medium">
                    No recorded field orders found.
                  </td>
                </tr>
              ) : (
                kpis.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                      <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                        {order.externalOrderId || order.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      {order.businessName}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {order.businessArea}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            : order.status === "CANCELLED"
                            ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                            : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            order.status === "COMPLETED"
                              ? "bg-emerald-500 dark:bg-emerald-400"
                              : order.status === "CANCELLED"
                              ? "bg-rose-500 dark:bg-rose-400"
                              : "bg-amber-500 dark:bg-amber-400"
                          }`}
                        />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{order.itemCount} items</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-white font-mono text-xs">
                      BDT {order.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(order.orderedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
