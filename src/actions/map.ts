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
    const markerColor = "green"; // All registered company businesses in DB are GREEN clients

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

export interface RestaurantProspect {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneRaw?: string;
  isClient: boolean;
  clientBusinessId?: string;
  markerColor: "green" | "red";
}

export async function fetchLiveRestaurantProspects(params: {
  lat: number;
  lon: number;
  radiusMeters?: number;
}) {
  await requireAuth();

  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) {
    return { error: "Geoapify API key not configured.", prospects: [] };
  }

  const lat = params.lat || 23.7405; // Default Dhanmondi / Dhaka Center
  const lon = params.lon || 90.3846;
  const radius = params.radiusMeters || 3500;

  try {
    // Valid Geoapify v2 categories: catering.restaurant, catering.cafe, catering.fast_food, accommodation.hotel, accommodation.guest_house, service.beauty
    const categories = [
      "catering.restaurant",
      "catering.cafe",
      "catering.fast_food",
      "accommodation.hotel",
      "accommodation.guest_house",
      "service.beauty",
    ].join(",");
    const effectiveRadius = params.radiusMeters || 3000;
    const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lon},${lat},${effectiveRadius}&bias=proximity:${lon},${lat}&limit=150&apiKey=${apiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!data.features || !Array.isArray(data.features)) {
      if (data.message) {
        console.warn("Geoapify places API response:", data.message);
      }
      return { prospects: [], total: 0 };
    }

    // Fetch all active client businesses in our DB with their coordinates and names
    const dbClients = await db.business.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        phoneNormalized: true,
        latitude: true,
        longitude: true,
        _count: { select: { orders: true } },
      },
    });

    const prospects: RestaurantProspect[] = data.features.map((f: any) => {
      const plat = f.properties.lat;
      const plon = f.properties.lon;
      const address =
        f.properties.formatted ||
        f.properties.street ||
        `${f.properties.suburb || "Dhaka"}, Bangladesh`;

      const cats: string[] = f.properties.categories || [];
      const catRaw =
        cats.find(
          (c) =>
            c.startsWith("catering.") ||
            c.startsWith("accommodation.") ||
            c.startsWith("service.beauty")
        ) ||
        cats[0] ||
        "catering.restaurant";

      const catLabel =
        catRaw.includes("hotel") || catRaw.includes("accommodation") || catRaw.includes("guest_house")
          ? "Hotel"
          : catRaw.includes("beauty") || catRaw.includes("salon")
          ? "Beauty Parlour"
          : catRaw.includes("fast_food")
          ? "Fast Food"
          : catRaw.includes("cafe")
          ? "Cafe"
          : "Restaurant";

      const rawName = f.properties.name?.trim();
      const fallbackName = f.properties.street
        ? `${catLabel} on ${f.properties.street}`
        : f.properties.suburb
        ? `${catLabel} (${f.properties.suburb})`
        : `${catLabel} Lead`;
      const name = rawName || fallbackName;

      const placeId = f.properties.place_id || `geo_${plat}_${plon}`;

      // Check if this restaurant already exists in our client DB
      const matchedClient = dbClients.find((c) => {
        if (c.name.toLowerCase() === name.toLowerCase()) return true;
        if (c.latitude && c.longitude) {
          const dLat = Math.abs(Number(c.latitude) - plat);
          const dLon = Math.abs(Number(c.longitude) - plon);
          return dLat < 0.0004 && dLon < 0.0004; // ~40m proximity
        }
        return false;
      });

      const isClient = !!matchedClient;

      return {
        id: placeId,
        name,
        category: catLabel,
        address,
        latitude: plat,
        longitude: plon,
        isClient,
        clientBusinessId: matchedClient?.id,
        markerColor: isClient ? ("green" as const) : ("red" as const),
      };
    });

    return { prospects, total: prospects.length };
  } catch (err: any) {
    console.error("Failed to fetch live restaurant prospects:", err);
    return { error: err.message || "Failed to fetch prospects", prospects: [] };
  }
}

export async function convertProspectToClient(prospect: {
  name: string;
  address?: string;
  category?: string;
  area?: string;
  district?: string;
  latitude: number;
  longitude: number;
  externalPlaceId?: string;
}) {
  await requireAuth();
  const { revalidatePath } = await import("next/cache");

  try {
    // Check if already in DB
    const existing = await db.business.findFirst({
      where: {
        name: { equals: prospect.name.trim(), mode: "insensitive" },
      },
    });

    if (existing) {
      return { success: true, businessId: existing.id, isExisting: true };
    }

    const newClient = await db.business.create({
      data: {
        name: prospect.name.trim(),
        address: prospect.address?.trim() || null,
        category: prospect.category || "Restaurant",
        area: prospect.area || "Dhaka",
        district: prospect.district || "Dhaka",
        latitude: prospect.latitude,
        longitude: prospect.longitude,
        coordinateSource: "geoapify_poi",
        placeProvider: "geoapify",
        externalPlaceId: prospect.externalPlaceId || null,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/map");
    revalidatePath("/dashboard/map/geoapify");
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/businesses");

    return { success: true, businessId: newClient.id };
  } catch (err: any) {
    return { error: err.message || "Failed to convert prospect." };
  }
}

export interface RouteResult {
  success: boolean;
  distanceKm?: number;
  durationMin?: number;
  geojson?: any;
  error?: string;
}

export async function calculateGeoapifyRoute(params: {
  originLat: number;
  originLon: number;
  destLat: number;
  destLon: number;
  mode?: "drive" | "motorcycle" | "walk" | "bicycle";
}): Promise<RouteResult> {
  await requireAuth();

  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "Geoapify API key not configured." };
  }

  const mode = params.mode || "drive";
  const url = `https://api.geoapify.com/v1/routing?waypoints=${params.originLat},${params.originLon}|${params.destLat},${params.destLon}&mode=${mode}&apiKey=${apiKey}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!data.features || !data.features[0]) {
      const errMsg = data.message || "Failed to calculate road route from Geoapify.";
      console.warn("Geoapify Routing API error:", errMsg);
      return { success: false, error: errMsg };
    }

    const feature = data.features[0];
    const distanceMeters = feature.properties?.distance || 0;
    const timeSeconds = feature.properties?.time || 0;

    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
    const durationMin = Math.max(1, Math.round(timeSeconds / 60));

    return {
      success: true,
      distanceKm,
      durationMin,
      geojson: feature,
    };
  } catch (err: any) {
    console.error("Routing error:", err);
    return { success: false, error: err.message || "Network error calculating route." };
  }
}

