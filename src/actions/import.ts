"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";
import { OrderStatus, Prisma } from "@prisma/client";
import { extractDistrictFromText } from "@/lib/district-resolver";

export interface RawImportRow {
  rowId: string;
  businessName: string;
  category?: string;
  location: string;
  totalPrice?: number | null;
  phoneRaw: string;
  date: string;
  statusRaw: string;
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

// ── 2. Geocoding Service (Geoapify Forward Geocode) ──────────────────────────
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
    // Strip common road suffixes from location to get the area name alone
    // e.g. "Dania Road" → "Dania"  (helps when the API doesn't know "Dania Road")
    const areaOnly = location.trim()
      .replace(/\b(road|rd|lane|ln|avenue|ave|street|st|sarani)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    // Build candidate queries — parallel fetch, best confidence wins.
    // area-stripped candidate is listed first so it gets highest base confidence.
    const candidates: { text: string; confidence: number }[] = [];
    if (businessName.trim() && areaOnly && areaOnly.toLowerCase() !== location.trim().toLowerCase()) {
      // name + area-only (best for POI near a neighbourhood)
      candidates.push({ text: `${businessName.trim()}, ${areaOnly}, Bangladesh`, confidence: 0.95 });
    }
    // name + full location
    candidates.push({ text: [businessName.trim(), location.trim(), "Bangladesh"].filter(Boolean).join(", "), confidence: 0.85 });
    // Fallback: location alone (in case business name confuses the geocoder)
    if (location.trim()) {
      candidates.push({ text: `${location.trim()}, Bangladesh`, confidence: 0.6 });
    }


    const parseFeature = (data: any, baseConfidence: number) => {
      if (!data.features || data.features.length === 0) return null;
      const feat = data.features[0];
      const props = feat.properties || {};
      const [lon, lat] = feat.geometry?.coordinates || [props.lon, props.lat];
      if (lat == null || lon == null) return null;
      return {
        success: true as const,
        placeId: props.place_id || `geo_${Date.now()}`,
        latitude: Number(lat),
        longitude: Number(lon),
        formattedAddress: props.formatted || props.street || location || businessName,
        confidence: props.rank?.confidence ?? baseConfidence,
      };
    };

    // Fire all queries in parallel, pick best by confidence
    const responses = await Promise.all(
      candidates.map(({ text }) =>
        fetch(
          `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&filter=countrycode:bd&limit=1&apiKey=${apiKey}`,
          { cache: "no-store" }
        ).then((r) => r.json()).catch(() => null)
      )
    );

    let best: GeocodeResult | null = null;
    for (let i = 0; i < responses.length; i++) {
      const parsed = parseFeature(responses[i], candidates[i].confidence);
      if (parsed && (!best || parsed.confidence > (best.confidence ?? 0))) {
        best = parsed;
      }
    }

    if (best) return best;

    return {
      success: false,
      error: "Location could not be recognized. Manual assignment needed.",
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
  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey || !query.trim()) return [];

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

// ── 4. Batch Preview & Validation Action ─────────────────────────────────────
export async function previewAndGeocodeBatch(rawRows: RawImportRow[]): Promise<{
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

  // Pre-fetch all existing active businesses from DB to check for matches
  const existingBusinesses = await db.business.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      phoneNormalized: true,
      area: true,
      address: true,
      latitude: true,
      longitude: true,
      externalPlaceId: true,
    },
  });

  const businessCache = new Map<
    string,
    {
      isExisting: boolean;
      existingId?: string;
      placeId?: string;
      latitude?: number;
      longitude?: number;
      formattedAddress?: string;
      geocodeStatus: "resolved" | "needs_location";
      confidence?: number;
    }
  >();

  const resolvedRows: ResolvedImportRow[] = [];
  let totalAmountBdt = 0;

  for (const raw of rawRows) {
    const phoneNorm = await normalizePhone(raw.phoneRaw);
    const rawStatus = (raw.statusRaw || "").toLowerCase().trim();

    // Map status: Only Pending, Delivered, Cancelled
    // delivered (or completed) -> OrderStatus.COMPLETED
    // cancelled / canceled -> OrderStatus.CANCELLED
    // pending / empty / anything else -> OrderStatus.PENDING
    let status: OrderStatus = OrderStatus.PENDING;
    if (
      rawStatus.includes("deliver") ||
      rawStatus.includes("complete") ||
      rawStatus === "paid"
    ) {
      status = OrderStatus.COMPLETED;
    } else if (rawStatus.includes("cancel")) {
      status = OrderStatus.CANCELLED;
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

    // Deduplication Key: prioritize phoneNormalized if present; else trimmed lowercase name
    const dedupeKey =
      phoneNorm.length >= 7
        ? `phone_${phoneNorm}`
        : `name_${raw.businessName.toLowerCase().trim()}`;

    // Check if we've already resolved this business in this batch
    let cached = businessCache.get(dedupeKey);

    if (!cached) {
      // Check in DB
      const matchedDb = existingBusinesses.find((b) => {
        if (phoneNorm && b.phoneNormalized && phoneNorm === b.phoneNormalized) {
          return true;
        }
        return (
          b.name.toLowerCase().trim() === raw.businessName.toLowerCase().trim()
        );
      });

      if (matchedDb && matchedDb.latitude && matchedDb.longitude) {
        // Business already exists with coordinates!
        cached = {
          isExisting: true,
          existingId: matchedDb.id,
          placeId: matchedDb.externalPlaceId || undefined,
          latitude: Number(matchedDb.latitude),
          longitude: Number(matchedDb.longitude),
          formattedAddress: matchedDb.address || matchedDb.area || raw.location,
          geocodeStatus: "resolved",
          confidence: 1.0,
        };
      } else {
        // Brand new business or existing business missing coordinates -> Geocode!
        const geo = await geocodeLocation(raw.businessName, raw.location);
        cached = {
          isExisting: !!matchedDb,
          existingId: matchedDb?.id,
          placeId: geo.placeId,
          latitude: geo.latitude,
          longitude: geo.longitude,
          formattedAddress: geo.formattedAddress || raw.location,
          geocodeStatus: geo.success ? "resolved" : "needs_location",
          confidence: geo.confidence,
        };
      }
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
  knownCache: Record<string, CachedBusinessResolution> = {}
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

  // Pre-fetch all existing active businesses from DB
  const existingBusinesses = await db.business.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      phoneNormalized: true,
      area: true,
      address: true,
      latitude: true,
      longitude: true,
      externalPlaceId: true,
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
    if (
      rawStatus.includes("deliver") ||
      rawStatus.includes("complete") ||
      rawStatus === "paid"
    ) {
      status = OrderStatus.COMPLETED;
    } else if (rawStatus.includes("cancel")) {
      status = OrderStatus.CANCELLED;
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
      const matchedDb = existingBusinesses.find((b) => {
        if (phoneNorm && b.phoneNormalized && phoneNorm === b.phoneNormalized) {
          return true;
        }
        return (
          b.name.toLowerCase().trim() === raw.businessName.toLowerCase().trim()
        );
      });

      if (matchedDb && matchedDb.latitude && matchedDb.longitude) {
        cached = {
          isExisting: true,
          existingId: matchedDb.id,
          placeId: matchedDb.externalPlaceId || undefined,
          latitude: Number(matchedDb.latitude),
          longitude: Number(matchedDb.longitude),
          formattedAddress: matchedDb.address || matchedDb.area || raw.location,
          geocodeStatus: "resolved",
          confidence: 1.0,
        };
      } else {
        const geo = await geocodeLocation(raw.businessName, raw.location);
        cached = {
          isExisting: !!matchedDb,
          existingId: matchedDb?.id,
          placeId: geo.placeId,
          latitude: geo.latitude,
          longitude: geo.longitude,
          formattedAddress: geo.formattedAddress || raw.location,
          geocodeStatus: geo.success ? "resolved" : "needs_location",
          confidence: geo.confidence,
        };
      }
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
  await requireAuth();

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
        // Map to store dedupeKey -> Business ID
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
              // If existing business lacked lat/lon and we resolved it now, update it
              if (
                (!existing.latitude || !existing.longitude) &&
                primaryRow.latitude &&
                primaryRow.longitude
              ) {
                await tx.business.update({
                  where: { id: existing.id },
                  data: {
                    latitude: primaryRow.latitude,
                    longitude: primaryRow.longitude,
                    address: primaryRow.formattedAddress || existing.address,
                    placeProvider: "geoapify",
                    externalPlaceId: primaryRow.placeId || existing.externalPlaceId,
                    ...(primaryRow.category && (!existing.category || existing.category === "General")
                      ? { category: primaryRow.category }
                      : {}),
                  },
                });
              }
              linkedBusinessesCount++;
            }
          } else {
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
                placeProvider: primaryRow.latitude != null && primaryRow.placeId ? "geoapify" : null,
                externalPlaceId: primaryRow.latitude != null && primaryRow.placeId ? primaryRow.placeId : null,
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

          await tx.order.create({
            data: {
              businessId: bId,
              orderedAt: parsedDate,
              status: row.status,
              source: "excel_import",
              sourceStatusRaw: row.statusRaw || null,
              externalOrderId: `IMP-${Date.now().toString().slice(-4)}-${idx + 1}`,
              totalAmountBdt:
                row.totalPrice != null && !isNaN(Number(row.totalPrice)) && Number(row.totalPrice) > 0
                  ? new Prisma.Decimal(row.totalPrice)
                  : null,
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
        timeout: 30000, // 30s timeout for large batches
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
