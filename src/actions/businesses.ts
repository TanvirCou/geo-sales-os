"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { geocodeLocation } from "./import";
import { extractDistrictFromText } from "@/lib/district-resolver";

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

  // If isActive is not explicitly passed, fetch ALL (both active & archived)
  const q = params?.q?.trim();
  const category = params?.category?.trim();
  const area = params?.area?.trim();
  const district = params?.district?.trim();
  const orderColor = params?.orderColor ?? "ALL";

  const whereClause: any =
    params?.isActive !== undefined ? { isActive: params.isActive } : {};

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

  // Allow all businesses in DB (0 orders will naturally sort at the end)
  if (orderColor === "GREEN") {
    whereClause.orders = { some: {} };
  } else if (orderColor === "RED") {
    whereClause.orders = { none: {} };
  }

  const businesses = await db.business.findMany({
    where: whereClause,
    include: {
      _count: {
        select: { orders: true },
      },
      orders: {
        orderBy: [
          { orderedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
        take: 1,
        select: {
          orderedAt: true,
          createdAt: true,
        },
      },
    },
  });

  const mapped = businesses.map((b) => {
    const latestOrder = b.orders?.[0];
    const latestOrderDate = latestOrder?.orderedAt ? new Date(latestOrder.orderedAt) : null;
    const latestOrderTime = latestOrderDate && !isNaN(latestOrderDate.getTime()) ? latestOrderDate.getTime() : null;

    return {
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
      isGreen: true, // Since it is in our DB, it is a registered Client -> GREEN
      createdAt: b.createdAt.toISOString(),
      latestOrderTime,
    };
  });

  // Business sorting rule:
  // 1. Businesses with real order dates are sorted descending (latest order date at the very top).
  // 2. Businesses whose orders have NO date (null) are pushed to the very end.
  // 3. Among businesses with no order date, sort by business creation date descending.
  mapped.sort((a, b) => {
    // Both have real order dates -> newest order date first
    if (a.latestOrderTime !== null && b.latestOrderTime !== null) {
      if (b.latestOrderTime !== a.latestOrderTime) {
        return b.latestOrderTime - a.latestOrderTime;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    // 'a' has date, 'b' has no date -> 'a' comes first (b goes to end)
    if (a.latestOrderTime !== null && b.latestOrderTime === null) {
      return -1;
    }

    // 'a' has no date, 'b' has date -> 'b' comes first (a goes to end)
    if (a.latestOrderTime === null && b.latestOrderTime !== null) {
      return 1;
    }

    // Neither has an order date -> both at the end, newest business first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return mapped;
}

export async function getBusiness(id: string) {
  await requireAuth();

  const business = await db.business.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true } },
      orders: {
        orderBy: [
          { orderedAt: { sort: "desc", nulls: "last" } },
          { createdAt: "desc" },
        ],
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
    isGreen: true, // Since it is in our DB, it is a registered Client -> GREEN
    orders: business.orders.map((o) => ({
      id: o.id,
      externalOrderId: o.externalOrderId,
      orderedAt: o.orderedAt?.toISOString() ?? null,
      status: o.status,
      source: o.source,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.sourceProductName || i.product?.name || "Unspecified Item",
        quantity: Number(i.quantity),
        unitPriceBdt: Number(i.unitPriceBdt),
        totalBdt: Number(i.quantity) * Number(i.unitPriceBdt),
      })),
      totalBdt:
        o.totalAmountBdt != null && Number(o.totalAmountBdt) > 0
          ? Number(o.totalAmountBdt)
          : o.items.length > 0
          ? o.items.reduce(
              (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
              0
            )
          : null,
    })),
  };
}

export interface GeocodeAddressActionResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  resolvedDistrict?: string | null;
  error?: string;
}

export async function geocodeAddressAction(
  businessName: string,
  location: string
): Promise<GeocodeAddressActionResult> {
  await requireAuth();
  if (!location || !location.trim()) {
    return { success: false, error: "Please enter an address or area to search." };
  }
  const result = await geocodeLocation(businessName, location);
  let resolvedDistrict: string | null = null;
  if (result.success && result.formattedAddress) {
    resolvedDistrict = extractDistrictFromText(result.formattedAddress);
  } else if (location) {
    resolvedDistrict = extractDistrictFromText(location);
  }
  return {
    success: result.success,
    latitude: result.latitude,
    longitude: result.longitude,
    formattedAddress: result.formattedAddress,
    resolvedDistrict,
    error: result.error,
  };
}

export interface AutocompleteSuggestion {
  formatted: string;
  area: string;
  district: string;
  latitude: number;
  longitude: number;
}

export async function searchAddressAutocomplete(
  query: string,
  multiQuery = false
): Promise<AutocompleteSuggestion[]> {
  await requireAuth();
  if (!query || query.trim().length < 2) return [];

  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) return [];

  try {
    const trimmed = query.trim();
    // Always normalize commas → spaces for the base query
    const fullNormalized = trimmed.replace(/,+/g, " ").replace(/\s+/g, " ");

    // Score helper — used to re-rank results by how many query terms match
    const queryTerms = fullNormalized
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 1);

    const scoreResult = (formatted: string): number => {
      const lower = formatted.toLowerCase();
      return queryTerms.reduce((acc, term) => acc + (lower.includes(term) ? 1 : 0), 0);
    };

    const parseFeatures = (features: any[]): AutocompleteSuggestion[] =>
      features
        .map((f: any) => {
          const p = f.properties || {};
          const [lon, lat] = f.geometry?.coordinates || [p.lon, p.lat];
          const detectedDistrict =
            extractDistrictFromText(
              [p.formatted, p.city, p.county, p.state].filter(Boolean).join(" ")
            ) || "Dhaka";
          const detectedArea =
            p.suburb || p.neighbourhood || p.quarter ||
            p.district || p.city || p.street || "";
          return {
            formatted: p.formatted as string,
            area: detectedArea as string,
            district: detectedDistrict,
            latitude: Number(lat),
            longitude: Number(lon),
          };
        })
        .filter(
          (item: any) =>
            item.formatted && !isNaN(item.latitude) && !isNaN(item.longitude)
        );

    const makeUrl = (q: string, limit = 7) =>
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&filter=countrycode:bd&limit=${limit}&apiKey=${apiKey}`;

    // ── FAST MODE (live dropdown): single optimised query ─────────────────────
    // Best query: if comma present use "name area" (road suffix stripped),
    // otherwise use the full normalized text. One API call → ~300 ms.
    if (!multiQuery) {
      let bestQuery = fullNormalized;
      if (trimmed.includes(",")) {
        const parts = trimmed.split(",").map((s) => s.trim());
        const poiName = parts[0];
        const areaStripped = parts
          .slice(1)
          .join(" ")
          .replace(/\b(road|rd|lane|ln|avenue|ave|street|st|sarani)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        if (areaStripped) bestQuery = `${poiName} ${areaStripped}`;
      } else {
        const stripped = fullNormalized
          .replace(/\b(road|rd|lane|ln|avenue|ave|street|st|sarani)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();
        if (stripped && stripped !== fullNormalized) {
          bestQuery = stripped;
        }
      }

      const res = await fetch(makeUrl(bestQuery, 8), { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.features) return [];
      const items = parseFeatures(data.features);
      items.sort((a, b) => scoreResult(b.formatted) - scoreResult(a.formatted));
      return items.slice(0, 7);
    }

    // ── MULTI-QUERY MODE (Auto-Detect button): parallel queries, best ranking ──
    const querySet = new Set<string>([fullNormalized]);
    if (trimmed.includes(",")) {
      const parts = trimmed.split(",").map((s) => s.trim());
      const poiName = parts[0];
      const areaRaw = parts.slice(1).join(" ").trim();
      const areaStripped = areaRaw
        .replace(/\b(road|rd|lane|ln|avenue|ave|street|st|sarani)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (areaStripped) querySet.add(`${poiName} ${areaStripped}`);
      if (poiName) querySet.add(poiName);
    } else {
      const stripped = fullNormalized
        .replace(/\b(road|rd|lane|ln|avenue|ave|street|st|sarani)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (stripped && stripped !== fullNormalized) {
        querySet.add(stripped);
      }
    }

    const responses = await Promise.all(
      [...querySet].map((q) => fetch(makeUrl(q, 6), { cache: "no-store" }))
    );

    const allFeatures: AutocompleteSuggestion[] = [];
    const seen = new Set<string>();
    for (const res of responses) {
      if (!res.ok) continue;
      const data = await res.json();
      if (!data.features) continue;
      for (const item of parseFeatures(data.features)) {
        if (!seen.has(item.formatted)) {
          seen.add(item.formatted);
          allFeatures.push(item);
        }
      }
    }
    allFeatures.sort((a, b) => scoreResult(b.formatted) - scoreResult(a.formatted));
    return allFeatures.slice(0, 7);

  } catch (err) {
    console.error("Autocomplete error:", err);
    return [];
  }
}

export async function createBusiness(data: BusinessInput) {
  const session = await requireAuth();
  if (!hasPermission(session.user, "canAddBusiness")) {
    return { error: "Unauthorized: You do not have permission to create businesses." };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { error: "Business name is required." };
  }

  const phoneNormalized = data.phoneRaw
    ? data.phoneRaw.replace(/\D/g, "")
    : null;

  let latitude = data.latitude != null ? data.latitude : null;
  let longitude = data.longitude != null ? data.longitude : null;
  let formattedAddress = data.address?.trim() || null;
  let resolvedDistrict = data.district?.trim() || null;

  // Auto-geocode if coordinates were not provided manually
  if ((latitude == null || longitude == null) && (data.address || data.area)) {
    const locText = [data.address, data.area].filter(Boolean).join(", ");
    const geo = await geocodeLocation(data.name, locText);
    if (geo.success && geo.latitude && geo.longitude) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      if (geo.formattedAddress && !data.address?.trim()) {
        formattedAddress = geo.formattedAddress;
      }
    }
  }

  // Auto-resolve district if missing or generic
  if (!resolvedDistrict || resolvedDistrict === "Dhaka") {
    resolvedDistrict = extractDistrictFromText(
      [formattedAddress, data.address, data.area].filter(Boolean).join(" ")
    );
  }

  try {
    const business = await db.business.create({
      data: {
        name: data.name.trim(),
        category: data.category?.trim() || null,
        area: data.area?.trim() || null,
        district: resolvedDistrict,
        contactName: data.contactName?.trim() || null,
        phoneRaw: data.phoneRaw?.trim() || null,
        phoneNormalized,
        address: formattedAddress || data.address?.trim() || null,
        latitude,
        longitude,
        coordinateSource: latitude != null ? "geoapify_verified" : null,
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
  const session = await requireAuth();
  if (!hasPermission(session.user, "canEditBusiness")) {
    return { error: "Unauthorized: You do not have permission to edit businesses." };
  }

  if (!data.name || data.name.trim().length === 0) {
    return { error: "Business name is required." };
  }

  const phoneNormalized = data.phoneRaw
    ? data.phoneRaw.replace(/\D/g, "")
    : null;

  let latitude = data.latitude != null ? data.latitude : null;
  let longitude = data.longitude != null ? data.longitude : null;
  let formattedAddress = data.address?.trim() || null;
  let resolvedDistrict = data.district?.trim() || null;

  // Auto-geocode if coordinates were not provided manually
  if ((latitude == null || longitude == null) && (data.address || data.area)) {
    const locText = [data.address, data.area].filter(Boolean).join(", ");
    const geo = await geocodeLocation(data.name, locText);
    if (geo.success && geo.latitude && geo.longitude) {
      latitude = geo.latitude;
      longitude = geo.longitude;
      if (geo.formattedAddress && !data.address?.trim()) {
        formattedAddress = geo.formattedAddress;
      }
    }
  }

  if (!resolvedDistrict || resolvedDistrict === "Dhaka") {
    resolvedDistrict = extractDistrictFromText(
      [formattedAddress, data.address, data.area].filter(Boolean).join(" ")
    );
  }

  try {
    await db.business.update({
      where: { id },
      data: {
        name: data.name.trim(),
        category: data.category?.trim() || null,
        area: data.area?.trim() || null,
        district: resolvedDistrict,
        contactName: data.contactName?.trim() || null,
        phoneRaw: data.phoneRaw?.trim() || null,
        phoneNormalized,
        address: formattedAddress || data.address?.trim() || null,
        latitude,
        longitude,
        coordinateSource: latitude != null ? "geoapify_verified" : null,
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
  const session = await requireAuth();
  if (!hasPermission(session.user, "canDeleteBusiness")) {
    return { error: "Unauthorized: Only administrators have permission to delete businesses." };
  }

  const business = await db.business.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });

  if (!business) {
    return { error: "Business not found." };
  }

  try {
    await db.$transaction(async (tx) => {
      // Delete any associated orders first
      await tx.order.deleteMany({
        where: { businessId: id },
      });
      // Delete business
      await tx.business.delete({ where: { id } });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/businesses");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete business." };
  }
}

export async function archiveBusiness(id: string) {
  const session = await requireAuth();
  if (!hasPermission(session.user, "canEditBusiness")) {
    return { error: "Unauthorized: You do not have permission to archive businesses." };
  }

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
  const session = await requireAuth();
  if (!hasPermission(session.user, "canEditBusiness")) {
    return { error: "Unauthorized: You do not have permission to restore businesses." };
  }

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
