import type { Metadata } from "next";
import { getDashboardKPIs } from "@/actions/dashboard";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

export const metadata: Metadata = { title: "Dashboard — GeoSales OS" };

export default async function DashboardPage() {
  const kpis = await getDashboardKPIs();

  return (
    <div className="space-y-6">
      {/* ── Executive Page Header ────────────────────────────────────────── */}
      <div className="pb-5 border-b border-slate-200/90 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Sales &amp; Geospatial Operations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Real-time executive analytics across {kpis.totalBusinesses.toLocaleString("en-US")} client businesses and {kpis.totalOrders.toLocaleString("en-US")} field orders.
        </p>
      </div>

      {/* ── Main Analytics & Charts Section ──────────────────────────────── */}
      <DashboardCharts
        monthlyTrend={kpis.monthlyTrend}
        districtSales={kpis.districtSales}
        statusBreakdown={kpis.statusBreakdown}
        totalBusinesses={kpis.totalBusinesses}
        totalProducts={kpis.totalProducts}
        totalOrders={kpis.totalOrders}
        totalRevenue={kpis.totalRevenue}
        avgOrderValue={kpis.avgOrderValue}
      />
    </div>
  );
}
