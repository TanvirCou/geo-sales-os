"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";

export interface MonthlyTrendItem {
  key: string;       // e.g. "2025-10"
  label: string;     // e.g. "Oct '25"
  revenue: number;
  orders: number;
}

export interface DistrictSalesItem {
  district: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface OrderStatusBreakdown {
  status: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface DashboardKPIData {
  totalBusinesses: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  greenBusinesses: number;
  redBusinesses: number;
  unlocatedBusinesses: number;
  monthlyTrend: MonthlyTrendItem[];
  districtSales: DistrictSalesItem[];
  statusBreakdown: OrderStatusBreakdown[];
  recentOrders: {
    id: string;
    externalOrderId: string | null;
    businessName: string;
    businessArea: string;
    orderedAt: string | null;
    status: string;
    itemCount: number;
    totalBdt: number;
  }[];
}

export async function getDashboardKPIs(): Promise<DashboardKPIData> {
  await requireAuth();

  const [
    totalBusinesses,
    totalProducts,
    totalOrders,
    unlocatedBusinesses,
    businessesWithOrders,
    orders,
    recentOrders,
  ] = await Promise.all([
    // Active businesses
    db.business.count({ where: { isActive: true } }),
    // Active products
    db.product.count({ where: { isActive: true } }),
    // All recorded orders
    db.order.count(),
    // Active businesses without coordinates
    db.business.count({
      where: {
        isActive: true,
        OR: [{ latitude: null }, { longitude: null }],
      },
    }),
    // Active businesses with at least 1 order (GREEN rule)
    db.business.count({
      where: {
        isActive: true,
        orders: { some: {} },
      },
    }),
    // All orders for analytics aggregation
    db.order.findMany({
      select: {
        orderedAt: true,
        totalAmountBdt: true,
        status: true,
        business: {
          select: { district: true },
        },
      },
    }),
    // 5 most recent orders with business and items
    db.order.findMany({
      take: 5,
      orderBy: { orderedAt: "desc" },
      include: {
        business: {
          select: { id: true, name: true, area: true, district: true },
        },
        items: {
          select: { quantity: true, unitPriceBdt: true, sourceProductName: true },
        },
      },
    }),
  ]);

  const greenBusinesses = businessesWithOrders;
  const redBusinesses = Math.max(0, totalBusinesses - greenBusinesses);

  // Aggregations
  let totalRevenue = 0;
  const monthlyMap: Record<string, { key: string; label: string; revenue: number; orders: number }> = {};
  const districtMap: Record<string, { district: string; revenue: number; orders: number }> = {};
  const statusMap: Record<string, { count: number; revenue: number }> = {
    COMPLETED: { count: 0, revenue: 0 },
    PENDING: { count: 0, revenue: 0 },
    CANCELLED: { count: 0, revenue: 0 },
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (const o of orders) {
    const rev = Number(o.totalAmountBdt || 0);
    totalRevenue += rev;

    // Monthly
    if (o.orderedAt) {
      const year = o.orderedAt.getFullYear();
      const monthIdx = o.orderedAt.getMonth();
      const mKey = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
      if (!monthlyMap[mKey]) {
        monthlyMap[mKey] = {
          key: mKey,
          label: `${monthNames[monthIdx]} '${String(year).slice(2)}`,
          revenue: 0,
          orders: 0,
        };
      }
      monthlyMap[mKey].revenue += rev;
      monthlyMap[mKey].orders += 1;
    }

    // District
    const dist = o.business?.district?.trim() || "Other";
    if (!districtMap[dist]) {
      districtMap[dist] = { district: dist, revenue: 0, orders: 0 };
    }
    districtMap[dist].revenue += rev;
    districtMap[dist].orders += 1;

    // Status
    const st = o.status || "UNKNOWN";
    if (!statusMap[st]) {
      statusMap[st] = { count: 0, revenue: 0 };
    }
    statusMap[st].count += 1;
    statusMap[st].revenue += rev;
  }

  // Last 12 months sorted chronologically
  const monthlyTrend = Object.values(monthlyMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12);

  // Top 7 districts + others
  const sortedDistricts = Object.values(districtMap).sort((a, b) => b.revenue - a.revenue);
  const top7 = sortedDistricts.slice(0, 7);
  const others = sortedDistricts.slice(7);
  const othersRev = others.reduce((acc, d) => acc + d.revenue, 0);
  const othersOrders = others.reduce((acc, d) => acc + d.orders, 0);

  const districtSales: DistrictSalesItem[] = top7.map((d) => ({
    district: d.district,
    revenue: d.revenue,
    orders: d.orders,
    percentage: totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 1000) / 10 : 0,
  }));

  if (othersRev > 0) {
    districtSales.push({
      district: "Others",
      revenue: othersRev,
      orders: othersOrders,
      percentage: totalRevenue > 0 ? Math.round((othersRev / totalRevenue) * 1000) / 10 : 0,
    });
  }

  // Status breakdown array
  const totalStatusOrders = totalOrders || 1;
  const statusBreakdown: OrderStatusBreakdown[] = Object.entries(statusMap).map(([status, val]) => ({
    status,
    count: val.count,
    revenue: val.revenue,
    percentage: Math.round((val.count / totalStatusOrders) * 1000) / 10,
  }));

  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  return {
    totalBusinesses,
    totalProducts,
    totalOrders,
    totalRevenue,
    avgOrderValue,
    greenBusinesses,
    redBusinesses,
    unlocatedBusinesses,
    monthlyTrend,
    districtSales,
    statusBreakdown,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      businessName: o.business.name,
      businessArea: o.business.area || o.business.district || "Unspecified",
      orderedAt: o.orderedAt?.toISOString() ?? null,
      status: o.status,
      itemCount: o.items.length,
      totalBdt: o.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
        0
      ),
    })),
  };
}
