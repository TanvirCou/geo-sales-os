"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { hasPermission } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { OrderStatus, Prisma } from "@prisma/client";
import { extractDistrictFromText } from "@/lib/district-resolver";
import {
  resolveDualGeocoding,
  geocodeGoogleMaps,
  geocodeGeoapify,
} from "@/lib/geocoding";

export interface RawImportRow {
  rowId: string;
  businessName: string;
  category?: string;
  location: string;
  totalPrice?: number | null;
  phoneRaw: string;
  date: string;
  statusRaw: string;
  consignmentId?: string;
  trackingCode?: string;
  orderId?: string;
  invoice?: string;
}

export interface ResolvedImportRow {
  rowId: string;
  businessName: string;
  category?: string;
  location: string;
  totalPrice?: number | null;
  phoneRaw: string;
  phoneNormalized: string;
  date: string;
  status: OrderStatus;
  statusRaw: string;
  isExistingBusiness: boolean;
  existingBusinessId?: string;
  geocodeStatus: "resolved" | "needs_location";
  placeId?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  confidence?: number;
  businessDedupeKey: string;
  consignmentId?: string;
  trackingCode?: string;
  orderId?: string;
  invoice?: string;
  // Dual Map Specific Coordinates
  osmLatitude?: number;
  osmLongitude?: number;
  osmPlaceId?: string;
  osmFormattedAddress?: string;
  googleLatitude?: number;
  googleLongitude?: number;
  googlePlaceId?: string;
  googleFormattedAddress?: string;
  providerUsed?: "BOTH" | "GOOGLE" | "GEOAPIFY" | "NONE";
}

export interface GeocodeResult {
  success: boolean;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  confidence?: number;
  error?: string;
}

export interface LocationSuggestion {
  placeId: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface CachedBusinessResolution {
  isExisting: boolean;
  existingId?: string;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  geocodeStatus: "resolved" | "needs_location";
  confidence?: number;
  osmLatitude?: number;
  osmLongitude?: number;
  osmPlaceId?: string;
  osmFormattedAddress?: string;
  googleLatitude?: number;
  googleLongitude?: number;
  googlePlaceId?: string;
  googleFormattedAddress?: string;
  providerUsed?: "BOTH" | "GOOGLE" | "GEOAPIFY" | "NONE";
}

// ── 1. Phone Normalizer for Bangladesh ───────────────────────────────────────
export async function normalizePhone(raw?: string): Promise<string> {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  // Remove 880 prefix if present
  if (digits.startsWith("880")) {
    digits = "0" + digits.slice(3);
  }
  return digits;
}

// ── 2. Geocoding Service (POI-Aware Autocomplete + Area Fallback) ─────────────
const STOP_WORDS = new Set([
  "road", "rd", "lane", "ln", "avenue", "ave", "street", "st", "sarani",
  "house", "holding", "sector", "sec", "plot", "block", "bangladesh", "bd"
]);

function extractKeyTerms(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

export async function geocodeLocation(
  businessName: string,
  location: string
): Promise<GeocodeResult> {
  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "Geoapify API key is not configured." };
  }

  try {
    const bName = (businessName || "").trim();
    const loc = (location || "").trim();
    const locTerms = extractKeyTerms(loc);
    const nameTerms = extractKeyTerms(bName);
    const detectedDistrict = extractDistrictFromText(loc);

    const areaOnly = loc
      .replace(/\b(road|rd|lane|ln|avenue|ave|street|st|sarani|house|holding|sector|sec|plot|block)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    const makeUrl = (q: string, limit = 5) =>
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        q
      )}&filter=countrycode:bd&limit=${limit}&apiKey=${apiKey}`;

    // ── Phase 1: POI Search (for shops, restaurants, bakeries, markets) ──────
    if (bName) {
      const poiQueries = new Set<string>();
      if (areaOnly && areaOnly.toLowerCase() !== loc.toLowerCase()) {
        poiQueries.add(`${bName} ${areaOnly}`);
      }
      poiQueries.add(`${bName} ${loc}`);
      poiQueries.add(bName);

      const responses = await Promise.all(
        [...poiQueries].map((q) =>
          fetch(makeUrl(q, 5), { cache: "no-store" })
            .then((r) => r.json())
            .catch(() => null)
        )
      );

      let bestPoi: GeocodeResult | null = null;
      let bestPoiScore = 0;

      for (const data of responses) {
        for (const feat of data?.features || []) {
          const props = feat.properties || {};
          const [lon, lat] = feat.geometry?.coordinates || [props.lon, props.lat];
          if (lat == null || lon == null) continue;

          const formatted = (props.formatted || "").toLowerCase();
          const locMatchCount = locTerms.filter((t) => formatted.includes(t)).length;
          const nameMatchCount = nameTerms.filter((t) => formatted.includes(t)).length;
          const districtMatches = detectedDistrict && formatted.includes(detectedDistrict.toLowerCase());

          // Anti-poison guard: if user provided location terms (e.g. Uttara), the result
          // MUST match at least one location term or the district. Never match a random bakery in Gulshan!
          if (locTerms.length > 0 && locMatchCount === 0 && !districtMatches) {
            continue;
          }

          const score = (nameMatchCount * 2) + locMatchCount + (districtMatches ? 1 : 0);
          if (score > bestPoiScore) {
            bestPoiScore = score;
            bestPoi = {
              success: true,
              placeId: props.place_id || `geo_${Date.now()}`,
              latitude: Number(lat),
              longitude: Number(lon),
              formattedAddress: props.formatted || `${bName}, ${loc}`,
              confidence: 0.95,
            };
          }
        }
      }

      if (bestPoi && bestPoiScore >= 2) {
        return bestPoi;
      }
    }

    // ── Phase 2: Area / Neighborhood Fallback Search ─────────────────────────
    // When the specific business isn't indexed on OpenStreetMap/Geoapify,
    // pin it accurately to its neighborhood, street, or administrative center.
    const areaQueries = new Set<string>();
    if (loc.includes(",")) {
      const parts = loc.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        areaQueries.add(`${parts.slice(-2).join(" ")}, Bangladesh`);
        if (detectedDistrict) {
          areaQueries.add(`${parts[parts.length - 1]}, ${detectedDistrict}, Bangladesh`);
        }
      }
    }
    if (areaOnly && areaOnly !== loc) {
      areaQueries.add(`${areaOnly}, Bangladesh`);
      if (detectedDistrict) {
        areaQueries.add(`${areaOnly}, ${detectedDistrict}, Bangladesh`);
      }
    }
    if (loc) {
      areaQueries.add(`${loc}, Bangladesh`);
    }

    const areaResponses = await Promise.all(
      [...areaQueries].map((q) =>
        fetch(makeUrl(q, 4), { cache: "no-store" })
          .then((r) => r.json())
          .catch(() => null)
      )
    );

    let bestArea: GeocodeResult | null = null;
    let bestAreaScore = 0;

    for (const data of areaResponses) {
      for (const feat of data?.features || []) {
        const props = feat.properties || {};
        const [lon, lat] = feat.geometry?.coordinates || [props.lon, props.lat];
        if (lat == null || lon == null) continue;

        const formatted = (props.formatted || "").toLowerCase();
        const locMatchCount = locTerms.filter((t) => formatted.includes(t)).length;
        const districtMatches = detectedDistrict && formatted.includes(detectedDistrict.toLowerCase());

        // Validate that this area match actually shares terms or district
        if (locTerms.length > 0 && locMatchCount === 0 && !districtMatches) {
          continue;
        }

        const score = (locMatchCount * 2) + (districtMatches ? 2 : 0);
        if (score > bestAreaScore) {
          bestAreaScore = score;
          bestArea = {
            success: true,
            placeId: props.place_id || `geo_${Date.now()}`,
            latitude: Number(lat),
            longitude: Number(lon),
            formattedAddress: props.formatted || loc,
            confidence: 0.75,
          };
        }
      }
    }

    if (bestArea && bestAreaScore > 0) {
      return bestArea;
    }

    // ── Phase 3: No reliable match ───────────────────────────────────────────
    // Mark as needing location rather than guessing random coordinates in other divisions
    return {
      success: false,
      error: "Location could not be recognized reliably. Manual assignment needed.",
    };
  } catch (err: any) {
    console.error("Geocoding fetch error:", err);
    return {
      success: false,
      error: err.message || "Network error during geocoding.",
    };
  }
}

// ── 3. Quick Suggestions for Manual Fix Modal ────────────────────────────────
export async function searchLocationSuggestions(
  query: string
): Promise<LocationSuggestion[]> {
  await requireAuth();
  if (!query || !query.trim()) return [];

  const googleKey =
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (googleKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query.trim()
      )}&components=country:BD&key=${googleKey}`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          return data.results.slice(0, 5).map((r: any) => ({
            placeId: r.place_id,
            latitude: Number(r.geometry?.location?.lat),
            longitude: Number(r.geometry?.location?.lng),
            formattedAddress: r.formatted_address,
          }));
        }
      }
    } catch {
      // Continue to Geoapify fallback
    }
  }

  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) return [];

  try {
    const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
      query.trim()
    )}&filter=countrycode:bd&limit=5&apiKey=${apiKey}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (!data.features) return [];

    return data.features.map((f: any) => ({
      placeId: f.properties.place_id,
      latitude: f.properties.lat,
      longitude: f.properties.lon,
      formattedAddress: f.properties.formatted,
    }));
  } catch (err) {
    console.error("Error searching location suggestions:", err);
    return [];
  }
}

// ── Helper: Resolve Single Business with Dual Engine Support ────────────────
async function resolveSingleBusinessRow(
  raw: RawImportRow,
  phoneNorm: string,
  existingBusinesses: any[],
  geocodeEngine: "BOTH" | "GOOGLE" | "GEOAPIFY" = "BOTH"
): Promise<CachedBusinessResolution> {
  const matchedDb = existingBusinesses.find((b) => {
    if (phoneNorm && b.phoneNormalized && phoneNorm === b.phoneNormalized) {
      return true;
    }
    return (
      b.name.toLowerCase().trim() === raw.businessName.toLowerCase().trim()
    );
  });

  const existingLat = matchedDb?.latitude ? Number(matchedDb.latitude) : undefined;
  const existingLng = matchedDb?.longitude ? Number(matchedDb.longitude) : undefined;
  const existingOsmLat = matchedDb?.osmLatitude ? Number(matchedDb.osmLatitude) : undefined;
  const existingOsmLng = matchedDb?.osmLongitude ? Number(matchedDb.osmLongitude) : undefined;
  const existingGoogleLat = matchedDb?.googleLatitude ? Number(matchedDb.googleLatitude) : undefined;
  const existingGoogleLng = matchedDb?.googleLongitude ? Number(matchedDb.googleLongitude) : undefined;

  let resolvedOsmLat = existingOsmLat ?? existingLat;
  let resolvedOsmLng = existingOsmLng ?? existingLng;
  let resolvedOsmPlaceId = matchedDb?.osmPlaceId || undefined;
  let resolvedOsmAddress = matchedDb?.osmFormattedAddress || undefined;

  let resolvedGoogleLat = existingGoogleLat;
  let resolvedGoogleLng = existingGoogleLng;
  let resolvedGooglePlaceId = matchedDb?.googlePlaceId || undefined;
  let resolvedGoogleAddress = matchedDb?.googleFormattedAddress || undefined;

  const needsGoogle = (geocodeEngine === "BOTH" || geocodeEngine === "GOOGLE") && !resolvedGoogleLat;
  const needsOsm = (geocodeEngine === "BOTH" || geocodeEngine === "GEOAPIFY") && !resolvedOsmLat;

  let providerUsed: "BOTH" | "GOOGLE" | "GEOAPIFY" | "NONE" = "NONE";
  let confidence = 0.9;

  if (needsGoogle && needsOsm) {
    const dual = await resolveDualGeocoding(raw.businessName, raw.location, { mode: geocodeEngine });
    if (dual.osm?.success) {
      resolvedOsmLat = dual.osm.latitude;
      resolvedOsmLng = dual.osm.longitude;
      resolvedOsmPlaceId = dual.osm.placeId;
      resolvedOsmAddress = dual.osm.formattedAddress;
    }
    if (dual.google?.success) {
      resolvedGoogleLat = dual.google.latitude;
      resolvedGoogleLng = dual.google.longitude;
      resolvedGooglePlaceId = dual.google.placeId;
      resolvedGoogleAddress = dual.google.formattedAddress;
    }
    providerUsed = dual.providerUsed;
  } else if (needsGoogle) {
    const gRes = await geocodeGoogleMaps(raw.businessName, raw.location);
    if (gRes.success && gRes.latitude != null && gRes.longitude != null) {
      resolvedGoogleLat = gRes.latitude;
      resolvedGoogleLng = gRes.longitude;
      resolvedGooglePlaceId = gRes.placeId;
      resolvedGoogleAddress = gRes.formattedAddress;
      providerUsed = "GOOGLE";
    }
  } else if (needsOsm) {
    const oRes = await geocodeGeoapify(raw.businessName, raw.location);
    if (oRes.success && oRes.latitude != null && oRes.longitude != null) {
      resolvedOsmLat = oRes.latitude;
      resolvedOsmLng = oRes.longitude;
      resolvedOsmPlaceId = oRes.placeId;
      resolvedOsmAddress = oRes.formattedAddress;
      providerUsed = "GEOAPIFY";
    }
  } else {
    providerUsed = (resolvedGoogleLat && resolvedOsmLat) ? "BOTH" : (resolvedGoogleLat ? "GOOGLE" : "GEOAPIFY");
    confidence = 1.0;
  }

  const primaryLat = resolvedGoogleLat ?? resolvedOsmLat ?? existingLat;
  const primaryLng = resolvedGoogleLng ?? resolvedOsmLng ?? existingLng;
  const primaryPlaceId = resolvedGooglePlaceId || resolvedOsmPlaceId || matchedDb?.externalPlaceId || undefined;
  const primaryAddress = resolvedGoogleAddress || resolvedOsmAddress || matchedDb?.address || matchedDb?.area || raw.location;
  const isResolved = primaryLat != null && primaryLng != null;

  return {
    isExisting: !!matchedDb,
    existingId: matchedDb?.id,
    placeId: primaryPlaceId,
    latitude: primaryLat,
    longitude: primaryLng,
    formattedAddress: primaryAddress,
    geocodeStatus: isResolved ? "resolved" : "needs_location",
    confidence,
    osmLatitude: resolvedOsmLat,
    osmLongitude: resolvedOsmLng,
    osmPlaceId: resolvedOsmPlaceId,
    osmFormattedAddress: resolvedOsmAddress,
    googleLatitude: resolvedGoogleLat,
    googleLongitude: resolvedGoogleLng,
    googlePlaceId: resolvedGooglePlaceId,
    googleFormattedAddress: resolvedGoogleAddress,
    providerUsed,
  };
}

// ── 4. Batch Preview & Validation Action ─────────────────────────────────────
export async function previewAndGeocodeBatch(
  rawRows: RawImportRow[],
  geocodeEngine: "BOTH" | "GOOGLE" | "GEOAPIFY" = "BOTH"
): Promise<{
  success: boolean;
  rows: ResolvedImportRow[];
  summary: {
    totalRows: number;
    uniqueBusinesses: number;
    resolvedCount: number;
    needsLocationCount: number;
    totalAmountBdt: number;
  };
  error?: string;
}> {
  await requireAuth();

  if (!rawRows || rawRows.length === 0) {
    return {
      success: false,
      rows: [],
      summary: {
        totalRows: 0,
        uniqueBusinesses: 0,
        resolvedCount: 0,
        needsLocationCount: 0,
        totalAmountBdt: 0,
      },
      error: "No data rows provided for import.",
    };
  }

  // Pre-fetch all existing businesses from DB (both active and archived) to check for matches
  const existingBusinesses = await db.business.findMany({
    select: {
      id: true,
      name: true,
      phoneNormalized: true,
      area: true,
      address: true,
      latitude: true,
      longitude: true,
      osmLatitude: true,
      osmLongitude: true,
      osmPlaceId: true,
      osmFormattedAddress: true,
      googleLatitude: true,
      googleLongitude: true,
      googlePlaceId: true,
      googleFormattedAddress: true,
      externalPlaceId: true,
      isActive: true,
    },
  });

  const businessCache = new Map<string, CachedBusinessResolution>();
  const resolvedRows: ResolvedImportRow[] = [];
  let totalAmountBdt = 0;

  for (const raw of rawRows) {
    const phoneNorm = await normalizePhone(raw.phoneRaw);
    const rawStatus = (raw.statusRaw || "").toLowerCase().trim();

    let status: OrderStatus = OrderStatus.PENDING;
    if (rawStatus.includes("partial")) {
      status = OrderStatus.PARTIAL;
    } else if (
      rawStatus.includes("cancel") ||
      rawStatus.includes("reject") ||
      rawStatus.includes("return")
    ) {
      status = OrderStatus.CANCELLED;
    } else if (
      rawStatus.includes("approve") ||
      rawStatus.includes("deliver") ||
      rawStatus.includes("complete") ||
      rawStatus === "paid"
    ) {
      status = OrderStatus.COMPLETED;
    } else {
      status = OrderStatus.PENDING;
    }

    const price =
      raw.totalPrice != null && !isNaN(Number(raw.totalPrice)) && Number(raw.totalPrice) > 0
        ? Number(raw.totalPrice)
        : null;
    if (price != null) {
      totalAmountBdt += price;
    }

    const dedupeKey =
      phoneNorm.length >= 7
        ? `phone_${phoneNorm}`
        : `name_${raw.businessName.toLowerCase().trim()}`;

    let cached = businessCache.get(dedupeKey);
    if (!cached) {
      cached = await resolveSingleBusinessRow(raw, phoneNorm, existingBusinesses, geocodeEngine);
      businessCache.set(dedupeKey, cached);
    }

    resolvedRows.push({
      rowId: raw.rowId,
      businessName: raw.businessName.trim(),
      category: raw.category?.trim() || "General",
      location: raw.location.trim(),
      totalPrice: price,
      phoneRaw: raw.phoneRaw.trim(),
      phoneNormalized: phoneNorm,
      date: raw.date || new Date().toISOString(),
      status,
      statusRaw: raw.statusRaw || "",
      isExistingBusiness: cached.isExisting,
      existingBusinessId: cached.existingId,
      geocodeStatus: cached.geocodeStatus,
      placeId: cached.placeId,
      latitude: cached.latitude,
      longitude: cached.longitude,
      formattedAddress: cached.formattedAddress,
      confidence: cached.confidence,
      businessDedupeKey: dedupeKey,
      consignmentId: raw.consignmentId,
      trackingCode: raw.trackingCode,
      orderId: raw.orderId,
      invoice: raw.invoice,
      osmLatitude: cached.osmLatitude,
      osmLongitude: cached.osmLongitude,
      osmPlaceId: cached.osmPlaceId,
      osmFormattedAddress: cached.osmFormattedAddress,
      googleLatitude: cached.googleLatitude,
      googleLongitude: cached.googleLongitude,
      googlePlaceId: cached.googlePlaceId,
      googleFormattedAddress: cached.googleFormattedAddress,
      providerUsed: cached.providerUsed,
    });
  }

  const resolvedCount = resolvedRows.filter(
    (r) => r.geocodeStatus === "resolved"
  ).length;
  const needsLocationCount = resolvedRows.length - resolvedCount;

  return {
    success: true,
    rows: resolvedRows,
    summary: {
      totalRows: resolvedRows.length,
      uniqueBusinesses: businessCache.size,
      resolvedCount,
      needsLocationCount,
      totalAmountBdt,
    },
  };
}

// ── 4b. Chunked Preview & Geocode Action (for Real-time Percentage Bar) ─────
export async function previewAndGeocodeChunk(
  chunkRows: RawImportRow[],
  knownCache: Record<string, CachedBusinessResolution> = {},
  geocodeEngine: "BOTH" | "GOOGLE" | "GEOAPIFY" = "BOTH"
): Promise<{
  success: boolean;
  rows: ResolvedImportRow[];
  updatedCache: Record<string, CachedBusinessResolution>;
  error?: string;
}> {
  await requireAuth();

  if (!chunkRows || chunkRows.length === 0) {
    return {
      success: true,
      rows: [],
      updatedCache: knownCache,
    };
  }

  // Pre-fetch all existing businesses from DB (both active and archived)
  const existingBusinesses = await db.business.findMany({
    select: {
      id: true,
      name: true,
      phoneNormalized: true,
      area: true,
      address: true,
      latitude: true,
      longitude: true,
      osmLatitude: true,
      osmLongitude: true,
      osmPlaceId: true,
      osmFormattedAddress: true,
      googleLatitude: true,
      googleLongitude: true,
      googlePlaceId: true,
      googleFormattedAddress: true,
      externalPlaceId: true,
      isActive: true,
    },
  });

  const businessCache = new Map<string, CachedBusinessResolution>(
    Object.entries(knownCache)
  );

  const resolvedRows: ResolvedImportRow[] = [];

  for (const raw of chunkRows) {
    const phoneNorm = await normalizePhone(raw.phoneRaw);
    const rawStatus = (raw.statusRaw || "").toLowerCase().trim();

    let status: OrderStatus = OrderStatus.PENDING;
    if (rawStatus.includes("partial")) {
      status = OrderStatus.PARTIAL;
    } else if (
      rawStatus.includes("cancel") ||
      rawStatus.includes("reject") ||
      rawStatus.includes("return")
    ) {
      status = OrderStatus.CANCELLED;
    } else if (
      rawStatus.includes("approve") ||
      rawStatus.includes("deliver") ||
      rawStatus.includes("complete") ||
      rawStatus === "paid"
    ) {
      status = OrderStatus.COMPLETED;
    } else {
      status = OrderStatus.PENDING;
    }

    const price =
      raw.totalPrice != null && !isNaN(Number(raw.totalPrice)) && Number(raw.totalPrice) > 0
        ? Number(raw.totalPrice)
        : null;

    const dedupeKey =
      phoneNorm.length >= 7
        ? `phone_${phoneNorm}`
        : `name_${raw.businessName.toLowerCase().trim()}`;

    let cached = businessCache.get(dedupeKey);
    if (!cached) {
      cached = await resolveSingleBusinessRow(raw, phoneNorm, existingBusinesses, geocodeEngine);
      businessCache.set(dedupeKey, cached);
    }

    resolvedRows.push({
      rowId: raw.rowId,
      businessName: raw.businessName.trim(),
      category: raw.category?.trim() || "General",
      location: raw.location.trim(),
      totalPrice: price,
      phoneRaw: raw.phoneRaw.trim(),
      phoneNormalized: phoneNorm,
      date: raw.date || new Date().toISOString(),
      status,
      statusRaw: raw.statusRaw || "",
      isExistingBusiness: cached.isExisting,
      existingBusinessId: cached.existingId,
      geocodeStatus: cached.geocodeStatus,
      placeId: cached.placeId,
      latitude: cached.latitude,
      longitude: cached.longitude,
      formattedAddress: cached.formattedAddress,
      confidence: cached.confidence,
      businessDedupeKey: dedupeKey,
      consignmentId: raw.consignmentId,
      trackingCode: raw.trackingCode,
      orderId: raw.orderId,
      invoice: raw.invoice,
      osmLatitude: cached.osmLatitude,
      osmLongitude: cached.osmLongitude,
      osmPlaceId: cached.osmPlaceId,
      osmFormattedAddress: cached.osmFormattedAddress,
      googleLatitude: cached.googleLatitude,
      googleLongitude: cached.googleLongitude,
      googlePlaceId: cached.googlePlaceId,
      googleFormattedAddress: cached.googleFormattedAddress,
      providerUsed: cached.providerUsed,
    });
  }

  const updatedCache: Record<string, CachedBusinessResolution> = {};
  for (const [k, v] of businessCache.entries()) {
    updatedCache[k] = v;
  }

  return {
    success: true,
    rows: resolvedRows,
    updatedCache,
  };
}

// ── 5. Commit Import Batch to Database ───────────────────────────────────────
export async function commitImportBatch(rows: ResolvedImportRow[]): Promise<{
  success: boolean;
  message?: string;
  importedOrdersCount: number;
  newBusinessesCount: number;
  linkedBusinessesCount: number;
  error?: string;
}> {
  const session = await requireAuth();
  if (!hasPermission(session.user, "canImport")) {
    return {
      success: false,
      importedOrdersCount: 0,
      newBusinessesCount: 0,
      linkedBusinessesCount: 0,
      error: "Unauthorized: You do not have permission to import data.",
    };
  }

  if (!rows || rows.length === 0) {
    return {
      success: false,
      importedOrdersCount: 0,
      newBusinessesCount: 0,
      linkedBusinessesCount: 0,
      error: "No rows provided to commit.",
    };
  }

  try {
    const result = await db.$transaction(
      async (tx) => {
        const resolvedBusinessIdMap = new Map<string, string>();
        let newBusinessesCount = 0;
        let linkedBusinessesCount = 0;

        // Group rows by distinct business
        const businessGroups = new Map<string, ResolvedImportRow[]>();
        for (const row of rows) {
          const list = businessGroups.get(row.businessDedupeKey) || [];
          list.push(row);
          businessGroups.set(row.businessDedupeKey, list);
        }

        // 1. Process each distinct business
        for (const [key, groupRows] of businessGroups.entries()) {
          const primaryRow = groupRows[0];
          let businessId = primaryRow.existingBusinessId;

          // If no existing ID, double-check in DB inside transaction
          if (!businessId) {
            const existing = await tx.business.findFirst({
              where: {
                OR: [
                  primaryRow.phoneNormalized
                    ? { phoneNormalized: primaryRow.phoneNormalized }
                    : undefined,
                  { name: { equals: primaryRow.businessName, mode: "insensitive" } },
                ].filter(Boolean) as Prisma.BusinessWhereInput[],
              },
            });

            if (existing) {
              businessId = existing.id;
              const updateData: Prisma.BusinessUpdateInput = {};
              if (!existing.isActive) {
                updateData.isActive = true;
              }

              // Update OSM if incoming row has osm coordinates and existing is missing
              if (primaryRow.osmLatitude != null && primaryRow.osmLongitude != null) {
                if (!existing.osmLatitude || !existing.osmLongitude) {
                  updateData.osmLatitude = primaryRow.osmLatitude;
                  updateData.osmLongitude = primaryRow.osmLongitude;
                  updateData.osmPlaceId = primaryRow.osmPlaceId || existing.osmPlaceId;
                  updateData.osmFormattedAddress = primaryRow.osmFormattedAddress || existing.osmFormattedAddress;
                }
              }

              // Update Google if incoming row has google coordinates and existing is missing
              if (primaryRow.googleLatitude != null && primaryRow.googleLongitude != null) {
                if (!existing.googleLatitude || !existing.googleLongitude) {
                  updateData.googleLatitude = primaryRow.googleLatitude;
                  updateData.googleLongitude = primaryRow.googleLongitude;
                  updateData.googlePlaceId = primaryRow.googlePlaceId || existing.googlePlaceId;
                  updateData.googleFormattedAddress = primaryRow.googleFormattedAddress || existing.googleFormattedAddress;
                }
              }

              // Also ensure master/fallback latitude & longitude are populated
              if (
                (!existing.latitude || !existing.longitude) &&
                primaryRow.latitude &&
                primaryRow.longitude
              ) {
                updateData.latitude = primaryRow.latitude;
                updateData.longitude = primaryRow.longitude;
                updateData.address = primaryRow.formattedAddress || existing.address;
                updateData.placeProvider = primaryRow.googleLatitude != null ? "google" : "geoapify";
                updateData.externalPlaceId = primaryRow.placeId || existing.externalPlaceId;
              }

              if (primaryRow.category && (!existing.category || existing.category === "General")) {
                updateData.category = primaryRow.category;
              }

              if (Object.keys(updateData).length > 0) {
                await tx.business.update({
                  where: { id: existing.id },
                  data: updateData,
                });
              }
              linkedBusinessesCount++;
            }
          } else {
            // Matched existing business: ensure dual coordinates are saved if newly resolved
            const existing = await tx.business.findUnique({
              where: { id: businessId },
            });

            if (existing) {
              const updateData: Prisma.BusinessUpdateInput = {};
              if (!existing.isActive) {
                updateData.isActive = true;
              }
              if (primaryRow.osmLatitude != null && primaryRow.osmLongitude != null) {
                if (!existing.osmLatitude || !existing.osmLongitude) {
                  updateData.osmLatitude = primaryRow.osmLatitude;
                  updateData.osmLongitude = primaryRow.osmLongitude;
                  updateData.osmPlaceId = primaryRow.osmPlaceId || existing.osmPlaceId;
                  updateData.osmFormattedAddress = primaryRow.osmFormattedAddress || existing.osmFormattedAddress;
                }
              }
              if (primaryRow.googleLatitude != null && primaryRow.googleLongitude != null) {
                if (!existing.googleLatitude || !existing.googleLongitude) {
                  updateData.googleLatitude = primaryRow.googleLatitude;
                  updateData.googleLongitude = primaryRow.googleLongitude;
                  updateData.googlePlaceId = primaryRow.googlePlaceId || existing.googlePlaceId;
                  updateData.googleFormattedAddress = primaryRow.googleFormattedAddress || existing.googleFormattedAddress;
                }
              }
              if ((!existing.latitude || !existing.longitude) && primaryRow.latitude && primaryRow.longitude) {
                updateData.latitude = primaryRow.latitude;
                updateData.longitude = primaryRow.longitude;
                updateData.placeProvider = primaryRow.googleLatitude != null ? "google" : "geoapify";
                updateData.externalPlaceId = primaryRow.placeId || existing.externalPlaceId;
              }

              if (Object.keys(updateData).length > 0) {
                await tx.business.update({
                  where: { id: businessId },
                  data: updateData,
                });
              }
            }
            linkedBusinessesCount++;
          }

          // If still no business, create a new one!
          if (!businessId) {
            const newBiz = await tx.business.create({
              data: {
                name: primaryRow.businessName,
                area: primaryRow.location || "Dhaka",
                district: extractDistrictFromText(`${primaryRow.location} ${primaryRow.formattedAddress || ""}`),
                phoneRaw: primaryRow.phoneRaw,
                phoneNormalized: primaryRow.phoneNormalized,
                address: primaryRow.formattedAddress || primaryRow.location,
                latitude: primaryRow.latitude != null ? primaryRow.latitude : null,
                longitude: primaryRow.longitude != null ? primaryRow.longitude : null,
                placeProvider: primaryRow.googleLatitude != null ? "google" : (primaryRow.osmLatitude != null ? "geoapify" : null),
                externalPlaceId: primaryRow.placeId || null,
                osmLatitude: primaryRow.osmLatitude != null ? primaryRow.osmLatitude : null,
                osmLongitude: primaryRow.osmLongitude != null ? primaryRow.osmLongitude : null,
                osmPlaceId: primaryRow.osmPlaceId || null,
                osmFormattedAddress: primaryRow.osmFormattedAddress || null,
                googleLatitude: primaryRow.googleLatitude != null ? primaryRow.googleLatitude : null,
                googleLongitude: primaryRow.googleLongitude != null ? primaryRow.googleLongitude : null,
                googlePlaceId: primaryRow.googlePlaceId || null,
                googleFormattedAddress: primaryRow.googleFormattedAddress || null,
                category: primaryRow.category?.trim() || "General",
                isActive: true,
              },
            });
            businessId = newBiz.id;
            newBusinessesCount++;
          }

          resolvedBusinessIdMap.set(key, businessId);
        }

        // 2. Insert all orders linked to their respective business
        let importedOrdersCount = 0;
        const usedExternalOrderIds = new Set<string>();

        const isValidField = (s?: string | null) => {
          if (!s) return false;
          const str = s.trim().toLowerCase();
          return (
            str !== "" &&
            str !== "n/a" &&
            str !== "na" &&
            str !== "-" &&
            str !== "none" &&
            str !== "null" &&
            str !== "undefined"
          );
        };

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const bId = resolvedBusinessIdMap.get(row.businessDedupeKey);
          if (!bId) continue;

          let parsedDate: Date | null = null;
          if (row.date) {
            const d = new Date(row.date);
            if (!isNaN(d.getTime())) {
              parsedDate = d;
            }
          }

          const cleanInvoice = isValidField(row.invoice) ? row.invoice!.trim() : "";
          const cleanOrderId = isValidField(row.orderId) ? row.orderId!.trim() : "";
          const cleanTracking = isValidField(row.trackingCode) ? row.trackingCode!.trim() : "";
          const cleanConsignment = isValidField(row.consignmentId) ? row.consignmentId!.trim() : "";

          const source =
            cleanConsignment || cleanTracking || cleanOrderId ? "steadfast" : "excel_import";

          // Calculate guaranteed unique externalOrderId
          let extId = "";
          if (cleanInvoice && !usedExternalOrderIds.has(cleanInvoice)) {
            extId = cleanInvoice;
          } else if (cleanOrderId && !usedExternalOrderIds.has(cleanOrderId)) {
            extId = cleanInvoice ? `${cleanInvoice}-${cleanOrderId}` : cleanOrderId;
          } else if (cleanTracking && !usedExternalOrderIds.has(cleanTracking)) {
            extId = cleanInvoice ? `${cleanInvoice}-${cleanTracking}` : cleanTracking;
          } else if (cleanConsignment && !usedExternalOrderIds.has(cleanConsignment)) {
            extId = cleanInvoice ? `${cleanInvoice}-${cleanConsignment}` : cleanConsignment;
          } else {
            const base = cleanInvoice || cleanOrderId || cleanTracking || cleanConsignment || "IMP";
            extId = `${base}-${idx + 1}`;
          }

          while (usedExternalOrderIds.has(extId)) {
            extId = `${extId}-${idx + 1}`;
          }
          usedExternalOrderIds.add(extId);

          const priceDecimal =
            row.totalPrice != null && !isNaN(Number(row.totalPrice)) && Number(row.totalPrice) > 0
              ? new Prisma.Decimal(row.totalPrice)
              : null;

          await tx.order.upsert({
            where: {
              unique_source_order: {
                source,
                externalOrderId: extId,
              },
            },
            update: {
              businessId: bId,
              orderedAt: parsedDate,
              status: row.status,
              sourceStatusRaw: row.statusRaw || null,
              consignmentId: cleanConsignment || cleanOrderId || null,
              trackingCode: cleanTracking || null,
              codAmount: priceDecimal,
              totalAmountBdt: priceDecimal,
            },
            create: {
              businessId: bId,
              orderedAt: parsedDate,
              status: row.status,
              source,
              sourceStatusRaw: row.statusRaw || null,
              consignmentId: cleanConsignment || cleanOrderId || null,
              trackingCode: cleanTracking || null,
              externalOrderId: extId,
              codAmount: priceDecimal,
              totalAmountBdt: priceDecimal,
            },
          });
          importedOrdersCount++;
        }

        return {
          importedOrdersCount,
          newBusinessesCount,
          linkedBusinessesCount,
        };
      },
      {
        timeout: 120000, // 2 minutes timeout for large batches
      }
    );

    // Revalidate paths so UI updates immediately
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/businesses");
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");

    return {
      success: true,
      message: `Successfully imported ${result.importedOrdersCount} orders across ${result.newBusinessesCount + result.linkedBusinessesCount} businesses (${result.newBusinessesCount} new, ${result.linkedBusinessesCount} existing linked).`,
      importedOrdersCount: result.importedOrdersCount,
      newBusinessesCount: result.newBusinessesCount,
      linkedBusinessesCount: result.linkedBusinessesCount,
    };
  } catch (err: any) {
    console.error("Error committing import batch:", err);
    return {
      success: false,
      importedOrdersCount: 0,
      newBusinessesCount: 0,
      linkedBusinessesCount: 0,
      error: err.message || "Failed to commit import batch to database.",
    };
  }
}
