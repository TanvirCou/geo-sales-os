"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";

export interface MapBusiness {
  id: string;
  name: string;
  category: string | null;
  area: string | null;
  district: string | null;
  address: string | null;
  phoneRaw: string | null;
  latitude: number | null;
  longitude: number | null;
  isLocated: boolean;
  orderCount: number;
  markerColor: "green" | "red"; // Core rule: Orders >= 1 -> GREEN, Orders = 0 -> RED
}

export interface MapFilterParams {
  q?: string;
  category?: string;
  district?: string;
  area?: string;
  orderColor?: "ALL" | "GREEN" | "RED";
}

export async function getMapBusinesses(params?: MapFilterParams) {
  await requireAuth();

  const q = params?.q?.trim();
  const category = params?.category?.trim();
  const district = params?.district?.trim();
  const area = params?.area?.trim();
  const orderColor = params?.orderColor || "ALL";

  const whereClause: any = {
    isActive: true, // Only active company businesses show on map by default
  };

  if (category && category !== "ALL") {
    whereClause.category = category;
  }
  if (district && district !== "ALL") {
    whereClause.district = district;
  }
  if (area && area !== "ALL") {
    whereClause.area = area;
  }
  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phoneRaw: { contains: q, mode: "insensitive" } },
      { phoneNormalized: { contains: q } },
      { area: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
  }

  // Core rule: Orders >= 1 -> GREEN, Orders = 0 -> RED
  if (orderColor === "GREEN") {
    whereClause.orders = { some: {} };
  } else if (orderColor === "RED") {
    whereClause.orders = { none: {} };
  }

  const businesses = await db.business.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      category: true,
      area: true,
      district: true,
      address: true,
      phoneRaw: true,
      latitude: true,
      longitude: true,
      _count: {
        select: { orders: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const allFiltered: MapBusiness[] = businesses.map((b) => {
    const lat = b.latitude ? Number(b.latitude) : null;
    const lng = b.longitude ? Number(b.longitude) : null;
    const isLocated = lat !== null && lng !== null;
    const orderCount = b._count.orders;
    const markerColor = orderCount > 0 ? "green" : "red";

    return {
      id: b.id,
      name: b.name,
      category: b.category,
      area: b.area,
      district: b.district,
      address: b.address,
      phoneRaw: b.phoneRaw,
      latitude: lat,
      longitude: lng,
      isLocated,
      orderCount,
      markerColor,
    };
  });

  // Split into located pins and unlocated records (Location Needed)
  const located = allFiltered.filter((b) => b.isLocated);
  const unlocated = allFiltered.filter((b) => !b.isLocated);

  return {
    businesses: allFiltered,
    locatedBusinesses: located,
    unlocatedBusinesses: unlocated,
    totalCount: allFiltered.length,
    locatedCount: located.length,
    unlocatedCount: unlocated.length,
    greenCount: allFiltered.filter((b) => b.markerColor === "green").length,
    redCount: allFiltered.filter((b) => b.markerColor === "red").length,
  };
}
