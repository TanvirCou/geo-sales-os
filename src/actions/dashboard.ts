"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";

export async function getDashboardKPIs() {
  await requireAuth();

  const [
    totalBusinesses,
    totalProducts,
    totalOrders,
    unlocatedBusinesses,
    businessesWithOrders,
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
  const redBusinesses = totalBusinesses - greenBusinesses;

  return {
    totalBusinesses,
    totalProducts,
    totalOrders,
    greenBusinesses,
    redBusinesses,
    unlocatedBusinesses,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      businessName: o.business.name,
      businessArea: o.business.area || o.business.district || "Unspecified",
      orderedAt: o.orderedAt.toISOString(),
      status: o.status,
      itemCount: o.items.length,
      totalBdt: o.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
        0
      ),
    })),
  };
}
