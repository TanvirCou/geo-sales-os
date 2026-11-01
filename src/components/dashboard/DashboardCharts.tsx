"use client";

import { useState } from "react";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowUpRight,
  DollarSign,
  Package,
  Building2,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  MonthlyTrendItem,
  DistrictSalesItem,
  OrderStatusBreakdown,
} from "@/actions/dashboard";

interface DashboardChartsProps {
  monthlyTrend: MonthlyTrendItem[];
  districtSales: DistrictSalesItem[];
  statusBreakdown: OrderStatusBreakdown[];
  totalBusinesses: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
}

export default function DashboardCharts({
  monthlyTrend,
  districtSales,
  statusBreakdown,
  totalBusinesses,
  totalProducts,
  totalOrders,
  totalRevenue,
  avgOrderValue,
}: DashboardChartsProps) {
  // Toggle between Revenue (BDT) and Order Volume for Line Chart
  const [trendMetric, setTrendMetric] = useState<"revenue" | "orders">("revenue");
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [hoveredDistrictIdx, setHoveredDistrictIdx] = useState<number | null>(null);

  // Peak month calculation
  const peakMonth = monthlyTrend.reduce(
    (max, m) => (m.revenue > (max?.revenue || 0) ? m : max),
    monthlyTrend[0]
  );

  // ── 1. Line / Area Chart Dimensions & SVG Path ──────────────────────────────
  const chartW = 760;
  const chartH = 260;
  const padLeft = 65;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 40;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  const trendValues = monthlyTrend.map((m) =>
    trendMetric === "revenue" ? m.revenue : m.orders
  );
  const maxTrendVal = Math.max(...trendValues, 1);
  const yCeil =
    trendMetric === "revenue"
      ? Math.ceil(maxTrendVal / 100000) * 100000
      : Math.ceil(maxTrendVal / 25) * 25;

  const points = monthlyTrend.map((item, idx) => {
    const val = trendMetric === "revenue" ? item.revenue : item.orders;
    const x = padLeft + (idx / Math.max(monthlyTrend.length - 1, 1)) * innerW;
    const y = padTop + innerH - (val / (yCeil || 1)) * innerH;
    return { x, y, item, val };
  });

  const slotW = innerW / Math.max(monthlyTrend.length, 1);

  // Smooth bezier curve path
  const makeSmoothPath = (pts: typeof points) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const linePath = makeSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : "";

  // ── 2. District Column Bar Chart Dimensions ─────────────────────────────────
  const barSvgW = 760;
  const barSvgH = 260;
  const barPadLeft = 55;
  const barPadRight = 20;
  const barPadTop = 25;
  const barPadBottom = 45;
  const barInnerW = barSvgW - barPadLeft - barPadRight;
  const barInnerH = barSvgH - barPadTop - barPadBottom;

  const maxDistrictRev = Math.max(...districtSales.map((d) => d.revenue), 1);
  const barYCeil = Math.ceil(maxDistrictRev / 500000) * 500000;

  const barCount = districtSales.length || 1;
  const barSlotW = barInnerW / barCount;
  const barWidth = Math.min(barSlotW * 0.58, 48);

  // ── 3. Status Donut Chart Calculations ──────────────────────────────────────
  const donutSize = 170;
  const strokeWidth = 20;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const statusColors: Record<string, { stroke: string; bg: string; text: string; icon: any }> = {
    COMPLETED: {
      stroke: "#10b981", // emerald-500: balanced executive emerald green
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      text: "text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    PENDING: {
      stroke: "#f59e0b", // amber-500: rich balanced amber gold
      bg: "bg-amber-50 dark:bg-amber-500/10",
      text: "text-amber-700 dark:text-amber-400",
      icon: Clock,
    },
    CANCELLED: {
      stroke: "#ef4444", // red-500: balanced vibrant red
      bg: "bg-rose-50 dark:bg-rose-500/10",
      text: "text-rose-700 dark:text-rose-400",
      icon: XCircle,
    },
  };

  // Helper formatter
  const formatBDT = (num: number) => {
    if (num >= 1000000) return `৳ ${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `৳ ${(num / 1000).toFixed(1)}k`;
    return `৳ ${num.toLocaleString("en-US")}`;
  };

  const completedPct = statusBreakdown.find((s) => s.status === "COMPLETED")?.percentage ?? 96.2;
  const topDistrict = districtSales[0] || { district: "Dhaka", percentage: 37.2, revenue: 3813012 };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Unified Executive KPI Command Bar (4 Core Metrics) ────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Gross Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {formatBDT(totalRevenue)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-mono text-slate-500 dark:text-slate-400">
                ৳ {totalRevenue.toLocaleString("en-US")}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <TrendingUp className="w-3 h-3" />
                <span>Live Orders</span>
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Field Orders & Fulfillment */}
        <div className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Recorded Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {totalOrders.toLocaleString("en-US")}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Avg: <strong className="text-slate-700 dark:text-slate-200">{formatBDT(avgOrderValue)}</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>{completedPct}% Delivered</span>
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Client Business Network */}
        <div className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Registered Clients
            </span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {totalBusinesses.toLocaleString("en-US")}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                {totalProducts} Catalog SKUs
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <span>{totalBusinesses.toLocaleString("en-US")} Active Pins</span>
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Top Territory Market */}
        <div className="group rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md transition-all hover:border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Primary Territory
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-500/20 flex items-center justify-center transition-transform group-hover:scale-105">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {topDistrict.district}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-mono">
                {formatBDT(topDistrict.revenue)}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                <span>{topDistrict.percentage}% Nat'l Share</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart Section 1: Sales & Revenue Trend (Line / Area Chart) ─────── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Sales &amp; Order Trend Over Time
              </h2>
              {peakMonth && (
                <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Peak: {peakMonth.label} ({formatBDT(peakMonth.revenue)})</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monthly historical sales trajectory across registered businesses (Last 12 Months)
            </p>
          </div>

          {/* Metric Toggle Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setTrendMetric("revenue")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                trendMetric === "revenue"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Revenue (BDT)
            </button>
            <button
              type="button"
              onClick={() => setTrendMetric("orders")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                trendMetric === "orders"
                  ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Order Volume
            </button>
          </div>
        </div>

        {/* Line Chart Area */}
        <div className="mt-6 relative">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-auto min-w-[620px] select-none"
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.38" />
                  <stop offset="90%" stopColor="#3b82f6" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = padTop + innerH - pct * innerH;
                const labelVal = pct * yCeil;
                return (
                  <g key={idx}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + innerW}
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      className="text-slate-200 dark:text-slate-800"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 10}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                    >
                      {trendMetric === "revenue"
                        ? labelVal >= 1000000
                          ? `${(labelVal / 1000000).toFixed(1)}M`
                          : labelVal >= 1000
                          ? `${Math.round(labelVal / 1000)}k`
                          : labelVal
                        : Math.round(labelVal)}
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              {areaPath && (
                <path d={areaPath} fill="url(#areaGradient)" className="transition-all duration-300" />
              )}

              {/* Glowing Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Data points & X labels */}
              {points.map((pt, idx) => {
                const isHovered = hoveredTrendIdx === idx;
                return (
                  <g key={idx} className="cursor-pointer">
                    {/* Hover column trigger */}
                    <rect
                      x={pt.x - slotW / 2}
                      y={padTop}
                      width={slotW}
                      height={innerH}
                      fill="transparent"
                      onMouseEnter={() => setHoveredTrendIdx(idx)}
                      onMouseLeave={() => setHoveredTrendIdx(null)}
                    />

                    {/* Vertical hover guide */}
                    {isHovered && (
                      <line
                        x1={pt.x}
                        y1={padTop}
                        x2={pt.x}
                        y2={padTop + innerH}
                        stroke="#3b82f6"
                        strokeDasharray="2 2"
                        strokeWidth="1.5"
                        opacity="0.7"
                      />
                    )}

                    {/* Point Circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : 4}
                      fill={isHovered ? "#3b82f6" : "#ffffff"}
                      stroke="#2563eb"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150"
                    />

                    {/* X-axis Month Label */}
                    <text
                      x={pt.x}
                      y={padTop + innerH + 20}
                      textAnchor="middle"
                      className={`text-[10px] font-medium transition-colors ${
                        isHovered
                          ? "fill-blue-600 dark:fill-blue-400 font-bold"
                          : "fill-slate-500 dark:fill-slate-400"
                      }`}
                    >
                      {pt.item.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Floating Tooltip */}
          {hoveredTrendIdx !== null && points[hoveredTrendIdx] && (
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 z-20 px-3.5 py-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700 text-white shadow-xl text-xs space-y-1 transition-all"
              style={{
                left: `${(points[hoveredTrendIdx].x / chartW) * 100}%`,
                top: `${(points[hoveredTrendIdx].y / chartH) * 100}%`,
              }}
            >
              <div className="font-bold text-slate-300 text-[11px] uppercase tracking-wider">
                {points[hoveredTrendIdx].item.label}
              </div>
              <div className="text-emerald-400 font-bold font-mono text-sm">
                ৳ {points[hoveredTrendIdx].item.revenue.toLocaleString("en-US")} BDT
              </div>
              <div className="text-slate-300 text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>{points[hoveredTrendIdx].item.orders} recorded orders</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Chart Section 2: Bar Chart + Status Donut ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Regional Territory Performance (Bar Chart) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Territory Sales by District
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Revenue breakdown across primary geographic sales regions
                  </p>
                </div>
              </div>
            </div>

            {/* Vertical Bar Chart SVG */}
            <div className="mt-5 relative">
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${barSvgW} ${barSvgH}`}
                  className="w-full h-auto min-w-[540px] select-none"
                >
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4338ca" />
                    </linearGradient>
                    <linearGradient id="barHoverGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = barPadTop + barInnerH - pct * barInnerH;
                    const val = pct * barYCeil;
                    return (
                      <g key={idx}>
                        <line
                          x1={barPadLeft}
                          y1={y}
                          x2={barPadLeft + barInnerW}
                          y2={y}
                          stroke="currentColor"
                          strokeDasharray="3 3"
                          className="text-slate-200 dark:text-slate-800"
                          strokeWidth="1"
                        />
                        <text
                          x={barPadLeft - 8}
                          y={y + 3.5}
                          textAnchor="end"
                          className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                        >
                          {val >= 1000000
                            ? `${(val / 1000000).toFixed(1)}M`
                            : val >= 1000
                            ? `${Math.round(val / 1000)}k`
                            : val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {districtSales.map((d, idx) => {
                    const barH = (d.revenue / barYCeil) * barInnerH;
                    const x = barPadLeft + idx * barSlotW + (barSlotW - barWidth) / 2;
                    const y = barPadTop + barInnerH - barH;
                    const isHovered = hoveredDistrictIdx === idx;

                    return (
                      <g
                        key={d.district}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredDistrictIdx(idx)}
                        onMouseLeave={() => setHoveredDistrictIdx(null)}
                      >
                        {/* Hover trigger zone */}
                        <rect
                          x={barPadLeft + idx * barSlotW}
                          y={barPadTop}
                          width={barSlotW}
                          height={barInnerH}
                          fill="transparent"
                        />

                        {/* Bar Rect with rounded top */}
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={Math.max(barH, 4)}
                          rx="6"
                          ry="6"
                          fill={isHovered ? "url(#barHoverGradient)" : "url(#barGradient)"}
                          className="transition-all duration-200"
                        />

                        {/* Label bottom */}
                        <text
                          x={x + barWidth / 2}
                          y={barPadTop + barInnerH + 18}
                          textAnchor="middle"
                          className={`text-[11px] font-medium transition-colors ${
                            isHovered
                              ? "fill-indigo-600 dark:fill-indigo-400 font-bold"
                              : "fill-slate-600 dark:fill-slate-400"
                          }`}
                        >
                          {d.district}
                        </text>
                        <text
                          x={x + barWidth / 2}
                          y={barPadTop + barInnerH + 32}
                          textAnchor="middle"
                          className="text-[9px] fill-slate-400 dark:fill-slate-500 font-mono"
                        >
                          {d.percentage}%
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* District Floating Tooltip */}
              {hoveredDistrictIdx !== null && districtSales[hoveredDistrictIdx] && (
                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 z-20 px-3.5 py-2.5 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 border border-slate-700 text-white shadow-xl text-xs space-y-1 transition-all"
                  style={{
                    left: `${
                      ((barPadLeft +
                        hoveredDistrictIdx * barSlotW +
                        barSlotW / 2) /
                        barSvgW) *
                      100
                    }%`,
                    top: "35%",
                  }}
                >
                  <div className="font-bold text-slate-200 text-xs">
                    {districtSales[hoveredDistrictIdx].district}
                  </div>
                  <div className="text-emerald-400 font-bold font-mono text-sm">
                    ৳ {districtSales[hoveredDistrictIdx].revenue.toLocaleString("en-US")}
                  </div>
                  <div className="text-slate-300 text-[11px] flex items-center justify-between gap-4">
                    <span>{districtSales[hoveredDistrictIdx].orders} Orders</span>
                    <span className="font-semibold text-indigo-300">
                      {districtSales[hoveredDistrictIdx].percentage}% Share
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Primary Core: <strong className="text-slate-800 dark:text-slate-200">Dhaka &amp; Chattogram (48.4%)</strong></span>
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">8 Active Territory Segments</span>
          </div>
        </div>

        {/* Right Column: Order Status Breakdown (Donut Chart) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <PieChart className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Fulfillment Pipeline
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Order execution health &amp; delivery ratio
                  </p>
                </div>
              </div>
            </div>

            {/* Donut Chart Visual */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="relative w-[170px] h-[170px] shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${donutSize} ${donutSize}`}>
                  {/* Background track circle */}
                  <circle
                    cx={donutSize / 2}
                    cy={donutSize / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeWidth={strokeWidth}
                  />

                  {/* Arcs for each status */}
                  {(() => {
                    let cumulativePct = 0;
                    return statusBreakdown.map((item) => {
                      const pct = item.percentage / 100;
                      const strokeDasharray = `${pct * circumference} ${circumference}`;
                      const strokeDashoffset = -cumulativePct * circumference;
                      cumulativePct += pct;

                      const col = statusColors[item.status] || {
                        stroke: "#94a3b8",
                      };

                      return (
                        <circle
                          key={item.status}
                          cx={donutSize / 2}
                          cy={donutSize / 2}
                          r={radius}
                          fill="transparent"
                          stroke={col.stroke}
                          strokeWidth={strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="butt"
                          className="transition-all duration-500"
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Donut Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {totalOrders.toLocaleString("en-US")}
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                    Total Orders
                  </span>
                </div>
              </div>

              {/* Status List Legend */}
              <div className="space-y-2.5 flex-1 w-full">
                {statusBreakdown.map((st) => {
                  const cfg = statusColors[st.status] || {
                    stroke: "#94a3b8",
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                    icon: CheckCircle2,
                  };

                  return (
                    <div
                      key={st.status}
                      className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cfg.stroke }}
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {st.status}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            ৳ {st.revenue.toLocaleString("en-US")}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {st.count.toLocaleString("en-US")}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400">
                          {st.percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Delivered fulfillment: <strong className="text-emerald-600 dark:text-emerald-400">{completedPct}%</strong></span>
            <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">High Pipeline Health</span>
          </div>
        </div>
      </div>

      {/* ── Section 3: Territory Performance Leaderboard (Ranked Summary) ─── */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 sm:p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Territory Performance Matrix
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comparative order volume and revenue generation ranked by district
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">District Territory</th>
                <th className="py-2.5 px-3 text-right">Orders</th>
                <th className="py-2.5 px-3 text-right">Revenue (BDT)</th>
                <th className="py-2.5 px-3">National Market Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70 dark:divide-slate-800/50">
              {districtSales.slice(0, 6).map((item, idx) => (
                <tr
                  key={item.district}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-3 font-bold text-slate-400">
                    #{idx + 1}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                    {item.district}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-300">
                    {item.orders.toLocaleString("en-US")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                    ৳ {item.revenue.toLocaleString("en-US")}
                  </td>
                  <td className="py-3 px-3 min-w-[160px]">
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.min(item.percentage * 2.5, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-10 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
