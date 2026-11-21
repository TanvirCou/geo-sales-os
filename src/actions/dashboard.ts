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
  isAdmin: boolean;
  userRole: string;
  totalBusinesses: number;
  totalProducts: number;
  totalOrders: number;
  completedOrdersCount: number;
  pendingRevenue: number;
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
  const session = await requireAuth();
  const isAdmin = session?.user?.role === "ADMIN";
  const userRole = session?.user?.role ?? "MODERATOR";

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

  // Aggregations — strictly for COMPLETED orders as realized revenue
  let totalRevenue = 0;
  let completedOrdersCount = 0;
  let pendingRevenue = 0;

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
    const isCompleted = o.status === "COMPLETED";

    if (isCompleted) {
      totalRevenue += rev;
      completedOrdersCount += 1;
    } else if (o.status === "PENDING") {
      pendingRevenue += rev;
    }

    // Monthly aggregation
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
      // ONLY COMPLETED orders add to revenue
      if (isCompleted) {
        monthlyMap[mKey].revenue += rev;
      }
      monthlyMap[mKey].orders += 1;
    }

    // District aggregation
    const dist = o.business?.district?.trim() || "Other";
    if (!districtMap[dist]) {
      districtMap[dist] = { district: dist, revenue: 0, orders: 0 };
    }
    // ONLY COMPLETED orders add to revenue
    if (isCompleted) {
      districtMap[dist].revenue += rev;
    }
    districtMap[dist].orders += 1;

    // Status breakdown (keeps track of all statuses for donut chart)
    const st = o.status || "UNKNOWN";
    if (!statusMap[st]) {
      statusMap[st] = { count: 0, revenue: 0 };
    }
    statusMap[st].count += 1;
    statusMap[st].revenue += rev;
  }

  // Last 12 months sorted chronologically
  const monthlyTrend: MonthlyTrendItem[] = Object.values(monthlyMap)
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-12)
    .map((m) => ({
      key: m.key,
      label: m.label,
      // If not admin, sanitize revenue to 0 over the wire
      revenue: isAdmin ? m.revenue : 0,
      orders: m.orders,
    }));

  // Top 7 districts + others
  // If admin, rank by completed revenue; if non-admin, rank by order volume
  const sortedDistricts = Object.values(districtMap).sort((a, b) =>
    isAdmin ? b.revenue - a.revenue : b.orders - a.orders
  );
  const top7 = sortedDistricts.slice(0, 7);
  const others = sortedDistricts.slice(7);
  const othersRev = others.reduce((acc, d) => acc + d.revenue, 0);
  const othersOrders = others.reduce((acc, d) => acc + d.orders, 0);

  const districtSales: DistrictSalesItem[] = top7.map((d) => ({
    district: d.district,
    revenue: isAdmin ? d.revenue : 0,
    orders: d.orders,
    percentage: isAdmin
      ? (totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 1000) / 10 : 0)
      : (totalOrders > 0 ? Math.round((d.orders / totalOrders) * 1000) / 10 : 0),
  }));

  if (isAdmin ? othersRev > 0 : othersOrders > 0) {
    districtSales.push({
      district: "Others",
      revenue: isAdmin ? othersRev : 0,
      orders: othersOrders,
      percentage: isAdmin
        ? (totalRevenue > 0 ? Math.round((othersRev / totalRevenue) * 1000) / 10 : 0)
        : (totalOrders > 0 ? Math.round((othersOrders / totalOrders) * 1000) / 10 : 0),
    });
  }

  // Status breakdown array
  const totalStatusOrders = totalOrders || 1;
  const statusBreakdown: OrderStatusBreakdown[] = Object.entries(statusMap).map(([status, val]) => ({
    status,
    count: val.count,
    revenue: isAdmin ? val.revenue : 0,
    percentage: Math.round((val.count / totalStatusOrders) * 1000) / 10,
  }));

  // Average completed order value
  const avgOrderValue = completedOrdersCount > 0 ? Math.round(totalRevenue / completedOrdersCount) : 0;

  return {
    isAdmin,
    userRole,
    totalBusinesses,
    totalProducts,
    totalOrders,
    completedOrdersCount,
    pendingRevenue: isAdmin ? pendingRevenue : 0,
    totalRevenue: isAdmin ? totalRevenue : 0,
    avgOrderValue: isAdmin ? avgOrderValue : 0,
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
      totalBdt: isAdmin
        ? o.items.reduce(
            (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
            0
          )
        : 0,
    })),
  };
}
