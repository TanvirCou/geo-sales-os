"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { geocodeLocation } from "./import";
import { extractDistrictFromText } from "@/lib/district-resolver";
import {
  resolveDualGeocoding,
  geocodeGoogleMaps,
  geocodeGeoapify,
} from "@/lib/geocoding";

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
  placeProvider?: string | null;
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
    osmLatitude: business.osmLatitude ? Number(business.osmLatitude) : null,
    osmLongitude: business.osmLongitude ? Number(business.osmLongitude) : null,
    googleLatitude: business.googleLatitude ? Number(business.googleLatitude) : null,
    googleLongitude: business.googleLongitude ? Number(business.googleLongitude) : null,
    customLatitude: business.customLatitude ? Number(business.customLatitude) : null,
    customLongitude: business.customLongitude ? Number(business.customLongitude) : null,
    orderCount: business._count.orders,
    isGreen: business.isActive, // Active registered client -> GREEN, Archived -> GREY
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
  osmLatitude?: number;
  osmLongitude?: number;
  osmPlaceId?: string;
  osmFormattedAddress?: string;
  googleLatitude?: number;
  googleLongitude?: number;
  googlePlaceId?: string;
  googleFormattedAddress?: string;
  providerUsed?: "BOTH" | "GOOGLE" | "GEOAPIFY" | "NONE";
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
  const dual = await resolveDualGeocoding(businessName, location, { mode: "BOTH" });
  const addressText = dual.primaryFormattedAddress || location;
  const resolvedDistrict = extractDistrictFromText(addressText);

  const isSuccess = dual.primaryLatitude != null && dual.primaryLongitude != null;

  return {
    success: isSuccess,
    latitude: dual.primaryLatitude ?? undefined,
    longitude: dual.primaryLongitude ?? undefined,
    formattedAddress: dual.primaryFormattedAddress ?? location,
    resolvedDistrict,
    osmLatitude: dual.osm?.latitude,
    osmLongitude: dual.osm?.longitude,
    osmPlaceId: dual.osm?.placeId,
    osmFormattedAddress: dual.osm?.formattedAddress,
    googleLatitude: dual.google?.latitude,
    googleLongitude: dual.google?.longitude,
    googlePlaceId: dual.google?.placeId,
    googleFormattedAddress: dual.google?.formattedAddress,
    providerUsed: dual.providerUsed,
    error: isSuccess ? undefined : "Location could not be verified on Google Maps or OpenStreetMap.",
  };
}

export interface AutocompleteSuggestion {
  formatted: string;
  area: string;
  district: string;
  latitude: number;
  longitude: number;
  placeId?: string;
  provider?: "GOOGLE" | "GEOAPIFY";
}

export async function searchAddressAutocomplete(
  query: string,
  multiQuery = false
): Promise<AutocompleteSuggestion[]> {
  await requireAuth();
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();

  // ── 1. Try Google Maps Official Geocoding API first if key configured ─────
  const googleKey =
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        trimmed
      )}&components=country:BD&key=${googleKey}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const suggestions: AutocompleteSuggestion[] = data.results.slice(0, 6).map((r: any) => {
            const detectedDistrict = extractDistrictFromText(r.formatted_address) || "Dhaka";
            let area = "";
            for (const comp of r.address_components || []) {
              if (comp.types.includes("sublocality") || comp.types.includes("sublocality_level_1")) {
                area = comp.long_name;
                break;
              } else if (comp.types.includes("locality") || comp.types.includes("neighborhood")) {
                area = comp.long_name;
              }
            }
            if (!area) area = detectedDistrict;

            return {
              formatted: r.formatted_address,
              area,
              district: detectedDistrict,
              latitude: Number(r.geometry?.location?.lat),
              longitude: Number(r.geometry?.location?.lng),
              placeId: r.place_id,
              provider: "GOOGLE" as const,
            };
          }).filter((item: any) => !isNaN(item.latitude) && !isNaN(item.longitude));

          if (suggestions.length > 0) {
            return suggestions;
          }
        }
      }
    } catch (gErr: any) {
      console.warn("Google autocomplete lookup failed, proceeding to Geoapify fallback:", gErr.message);
    }
  }

  // ── 2. Fallback to Geoapify / OpenStreetMap ────────────────────────────────
  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) return [];

  try {
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
            placeId: p.place_id,
            provider: "GEOAPIFY" as const,
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
  let osmLat = data.osmLatitude != null ? data.osmLatitude : latitude;
  let osmLng = data.osmLongitude != null ? data.osmLongitude : longitude;
  let googleLat = data.googleLatitude != null ? data.googleLatitude : latitude;
  let googleLng = data.googleLongitude != null ? data.googleLongitude : longitude;
  let formattedAddress = data.address?.trim() || null;
  let resolvedDistrict = data.district?.trim() || null;

  // Auto-geocode if coordinates were not provided manually
  if ((latitude == null || longitude == null) && (data.address || data.area)) {
    const locText = [data.address, data.area].filter(Boolean).join(", ");
    const dual = await resolveDualGeocoding(data.name, locText, { mode: "BOTH" });
    if (dual.primaryLatitude != null && dual.primaryLongitude != null) {
      latitude = dual.primaryLatitude;
      longitude = dual.primaryLongitude;
      osmLat = dual.osm?.latitude ?? latitude;
      osmLng = dual.osm?.longitude ?? longitude;
      googleLat = dual.google?.latitude ?? latitude;
      googleLng = dual.google?.longitude ?? longitude;
      if (dual.primaryFormattedAddress && !data.address?.trim()) {
        formattedAddress = dual.primaryFormattedAddress;
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
    // ── Deduplication & Auto-Restore Check ──────────────────────────────────────
    const existing = await db.business.findFirst({
      where: {
        OR: [
          { name: { equals: data.name.trim(), mode: "insensitive" } },
          ...(phoneNormalized ? [{ phoneNormalized }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.isActive) {
        return {
          error: `‘${existing.name}’ already exists in the active client directory.`,
          isExisting: true,
          businessId: existing.id,
        };
      }

      // If business was archived -> Auto-Restore and link history!
      const restored = await db.business.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          address: formattedAddress || data.address?.trim() || existing.address,
          area: data.area?.trim() || existing.area,
          district: resolvedDistrict || existing.district,
          category: data.category?.trim() || existing.category,
          contactName: data.contactName?.trim() || existing.contactName,
          phoneRaw: data.phoneRaw?.trim() || existing.phoneRaw,
          phoneNormalized: phoneNormalized || existing.phoneNormalized,
          latitude: latitude != null ? latitude : existing.latitude,
          longitude: longitude != null ? longitude : existing.longitude,
          osmLatitude: osmLat != null ? osmLat : existing.osmLatitude,
          osmLongitude: osmLng != null ? osmLng : existing.osmLongitude,
          osmPlaceId: data.osmPlaceId || existing.osmPlaceId,
          osmFormattedAddress: data.osmFormattedAddress || existing.osmFormattedAddress,
          googleLatitude: googleLat != null ? googleLat : existing.googleLatitude,
          googleLongitude: googleLng != null ? googleLng : existing.googleLongitude,
          googlePlaceId: data.googlePlaceId || existing.googlePlaceId,
          googleFormattedAddress: data.googleFormattedAddress || existing.googleFormattedAddress,
          customLatitude: data.customLatitude != null ? data.customLatitude : existing.customLatitude,
          customLongitude: data.customLongitude != null ? data.customLongitude : existing.customLongitude,
          coordinateSource: latitude != null ? "dual_verified" : existing.coordinateSource,
        },
      });

      revalidatePath("/dashboard");
      revalidatePath("/dashboard/businesses");
      revalidatePath(`/dashboard/businesses/${restored.id}`);
      revalidatePath("/dashboard/map/google");
      revalidatePath("/dashboard/map/geoapify");

      return {
        success: true,
        businessId: restored.id,
        restored: true,
        message: `‘${restored.name}’ was previously archived. It has been restored, and all historical records have been re-linked!`,
      };
    }

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
        osmLatitude: osmLat != null ? osmLat : null,
        osmLongitude: osmLng != null ? osmLng : null,
        osmPlaceId: data.osmPlaceId || null,
        osmFormattedAddress: data.osmFormattedAddress || formattedAddress || null,
        googleLatitude: googleLat != null ? googleLat : null,
        googleLongitude: googleLng != null ? googleLng : null,
        googlePlaceId: data.googlePlaceId || null,
        googleFormattedAddress: data.googleFormattedAddress || formattedAddress || null,
        customLatitude: data.customLatitude != null ? data.customLatitude : null,
        customLongitude: data.customLongitude != null ? data.customLongitude : null,
        coordinateSource: latitude != null ? "dual_verified" : null,
        placeProvider: data.placeProvider || (googleLat != null ? "google" : (osmLat != null ? "geoapify" : null)),
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
  let osmLat = data.osmLatitude != null ? data.osmLatitude : latitude;
  let osmLng = data.osmLongitude != null ? data.osmLongitude : longitude;
  let googleLat = data.googleLatitude != null ? data.googleLatitude : latitude;
  let googleLng = data.googleLongitude != null ? data.googleLongitude : longitude;
  let formattedAddress = data.address?.trim() || null;
  let resolvedDistrict = data.district?.trim() || null;

  // Auto-geocode if coordinates were not provided manually
  if ((latitude == null || longitude == null) && (data.address || data.area)) {
    const locText = [data.address, data.area].filter(Boolean).join(", ");
    const dual = await resolveDualGeocoding(data.name, locText, { mode: "BOTH" });
    if (dual.primaryLatitude != null && dual.primaryLongitude != null) {
      latitude = dual.primaryLatitude;
      longitude = dual.primaryLongitude;
      osmLat = dual.osm?.latitude ?? latitude;
      osmLng = dual.osm?.longitude ?? longitude;
      googleLat = dual.google?.latitude ?? latitude;
      googleLng = dual.google?.longitude ?? longitude;
      if (dual.primaryFormattedAddress && !data.address?.trim()) {
        formattedAddress = dual.primaryFormattedAddress;
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
        osmLatitude: osmLat != null ? osmLat : undefined,
        osmLongitude: osmLng != null ? osmLng : undefined,
        osmPlaceId: data.osmPlaceId || undefined,
        osmFormattedAddress: data.osmFormattedAddress || formattedAddress || undefined,
        googleLatitude: googleLat != null ? googleLat : undefined,
        googleLongitude: googleLng != null ? googleLng : undefined,
        googlePlaceId: data.googlePlaceId || undefined,
        googleFormattedAddress: data.googleFormattedAddress || formattedAddress || undefined,
        customLatitude: data.customLatitude != null ? data.customLatitude : undefined,
        customLongitude: data.customLongitude != null ? data.customLongitude : undefined,
        coordinateSource: latitude != null ? "dual_verified" : undefined,
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
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");
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
    revalidatePath(`/dashboard/businesses/${id}`);
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");
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
