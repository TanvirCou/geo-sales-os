"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export interface BusinessInput {
  name: string;
  category?: string;
  area?: string;
  district?: string;
  contactName?: string;
  phoneRaw?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export async function getBusinesses(params?: {
  q?: string;
  category?: string;
  area?: string;
  district?: string;
  orderColor?: "ALL" | "GREEN" | "RED";
  isActive?: boolean;
}) {
  await requireAuth();

  const isActive = params?.isActive ?? true;
  const q = params?.q?.trim();
  const category = params?.category?.trim();
  const area = params?.area?.trim();
  const district = params?.district?.trim();
  const orderColor = params?.orderColor ?? "ALL";

  const whereClause: any = {
    isActive,
  };

  if (category && category !== "ALL") {
    whereClause.category = category;
  }

  if (area && area !== "ALL") {
    whereClause.area = area;
  }

  if (district && district !== "ALL") {
    whereClause.district = district;
  }

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phoneRaw: { contains: q, mode: "insensitive" } },
      { phoneNormalized: { contains: q } },
      { contactName: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
      { area: { contains: q, mode: "insensitive" } },
    ];
  }

  if (orderColor === "GREEN") {
    whereClause.orders = { some: {} };
  } else if (orderColor === "RED") {
    whereClause.orders = { none: {} };
  }

  const businesses = await db.business.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { orders: true },
      },
    },
  });

  return businesses.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    area: b.area,
    district: b.district,
    contactName: b.contactName,
    phoneRaw: b.phoneRaw,
    phoneNormalized: b.phoneNormalized,
    address: b.address,
    latitude: b.latitude ? Number(b.latitude) : null,
    longitude: b.longitude ? Number(b.longitude) : null,
    coordinateSource: b.coordinateSource,
    isActive: b.isActive,
    orderCount: b._count.orders,
    isGreen: b._count.orders > 0, // Master rule: Orders >= 1 -> GREEN, Orders = 0 -> RED
    createdAt: b.createdAt.toISOString(),
  }));
}

export async function getBusiness(id: string) {
  await requireAuth();

  const business = await db.business.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: { orderedAt: "desc" },
        include: {
          items: {
            select: {
              id: true,
              quantity: true,
              unitPriceBdt: true,
              sourceProductName: true,
              product: { select: { name: true, sku: true } },
            },
          },
        },
      },
    },
  });

  if (!business) return null;

  return {
    ...business,
    latitude: business.latitude ? Number(business.latitude) : null,
    longitude: business.longitude ? Number(business.longitude) : null,
    orderCount: business._count.orders,
    isGreen: business._count.orders > 0,
    orders: business.orders.map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      orderedAt: o.orderedAt.toISOString(),
      status: o.status,
      source: o.source,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.sourceProductName || i.product?.name || "Unspecified Item",
        quantity: Number(i.quantity),
        unitPriceBdt: Number(i.unitPriceBdt),
        totalBdt: Number(i.quantity) * Number(i.unitPriceBdt),
      })),
      totalBdt: o.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
        0
      ),
    })),
  };
}

export async function createBusiness(data: BusinessInput) {
  await requireAuth();

  if (!data.name || data.name.trim().length === 0) {
    return { error: "Business name is required." };
  }

  const phoneNormalized = data.phoneRaw
    ? data.phoneRaw.replace(/\D/g, "")
    : null;

  try {
    const business = await db.business.create({
      data: {
        name: data.name.trim(),
        category: data.category?.trim() || null,
        area: data.area?.trim() || null,
        district: data.district?.trim() || null,
        contactName: data.contactName?.trim() || null,
        phoneRaw: data.phoneRaw?.trim() || null,
        phoneNormalized,
        address: data.address?.trim() || null,
        latitude: data.latitude != null ? data.latitude : null,
        longitude: data.longitude != null ? data.longitude : null,
        coordinateSource: data.latitude != null ? "manual_verified" : null,
        isActive: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/businesses");
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");

    return { success: true, businessId: business.id };
  } catch (err: any) {
    return { error: err.message || "Failed to create business." };
  }
}

export async function updateBusiness(id: string, data: BusinessInput) {
  await requireAuth();

  if (!data.name || data.name.trim().length === 0) {
    return { error: "Business name is required." };
  }

  const phoneNormalized = data.phoneRaw
    ? data.phoneRaw.replace(/\D/g, "")
    : null;

  try {
    await db.business.update({
      where: { id },
      data: {
        name: data.name.trim(),
        category: data.category?.trim() || null,
        area: data.area?.trim() || null,
        district: data.district?.trim() || null,
        contactName: data.contactName?.trim() || null,
        phoneRaw: data.phoneRaw?.trim() || null,
        phoneNormalized,
        address: data.address?.trim() || null,
        latitude: data.latitude != null ? data.latitude : null,
        longitude: data.longitude != null ? data.longitude : null,
        coordinateSource: data.latitude != null ? "manual_verified" : null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/businesses");
    revalidatePath(`/dashboard/businesses/${id}`);
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update business." };
  }
}

/**
 * Business hard delete: allowed ONLY if orders count === 0.
 * If orders count > 0, return error and prompt for archive instead.
 */
export async function deleteBusiness(id: string) {
  await requireAuth();

  const business = await db.business.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });

  if (!business) {
    return { error: "Business not found." };
  }

  if (business._count.orders > 0) {
    return {
      error: `Cannot hard delete: this business has ${business._count.orders} order(s). Use Archive instead to preserve order history.`,
      canArchive: true,
    };
  }

  try {
    await db.business.delete({ where: { id } });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/businesses");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete business." };
  }
}

export async function archiveBusiness(id: string) {
  await requireAuth();

  try {
    await db.business.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/businesses");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to archive business." };
  }
}

export async function restoreBusiness(id: string) {
  await requireAuth();

  try {
    await db.business.update({
      where: { id },
      data: { isActive: true },
    });
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/businesses");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to restore business." };
  }
}

export async function getBusinessFilterOptions() {
  await requireAuth();

  const businesses = await db.business.findMany({
    select: { category: true, area: true, district: true },
  });

  const categories = Array.from(
    new Set(businesses.map((b) => b.category).filter(Boolean) as string[])
  ).sort();

  const areas = Array.from(
    new Set(businesses.map((b) => b.area).filter(Boolean) as string[])
  ).sort();

  const districts = Array.from(
    new Set(businesses.map((b) => b.district).filter(Boolean) as string[])
  ).sort();

  return { categories, areas, districts };
}
