import { extractDistrictFromText } from "./district-resolver";

export interface GeocodeResult {
  success: boolean;
  placeId?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  confidence?: number;
  provider?: "GEOAPIFY" | "GOOGLE";
  error?: string;
}

export interface DualGeocodeResult {
  osm?: GeocodeResult;
  google?: GeocodeResult;
  primaryLatitude: number | null;
  primaryLongitude: number | null;
  primaryPlaceId?: string | null;
  primaryFormattedAddress?: string | null;
  providerUsed: "BOTH" | "GOOGLE" | "GEOAPIFY" | "NONE";
}

// ── Common Stop Words & Term Extraction ──────────────────────────────────────
const STOP_WORDS = new Set([
  "road", "rd", "lane", "ln", "avenue", "ave", "street", "st", "sarani",
  "house", "holding", "sector", "sec", "plot", "block", "bangladesh", "bd"
]);

export function extractKeyTerms(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

// ── 1. Geoapify (OpenStreetMap) Geocoder ──────────────────────────────────────
export async function geocodeGeoapify(
  businessName: string,
  location: string
): Promise<GeocodeResult> {
  const apiKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) {
    return { success: false, error: "Geoapify API key is not configured.", provider: "GEOAPIFY" };
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

    // Phase 1: POI Search with business name
    if (bName) {
      const poiQueries = new Set<string>();
      if (areaOnly && areaOnly.toLowerCase() !== loc.toLowerCase()) {
        poiQueries.add(`${bName} ${areaOnly}`);
      }
      poiQueries.add(`${bName} ${loc}`);
      poiQueries.add(bName);

      for (const q of poiQueries) {
        try {
          const res = await fetch(makeUrl(q, 3), { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            const features = data?.features || [];

            for (const feat of features) {
              const [lon, lat] = feat.geometry?.coordinates || [];
              const placeName = (feat.properties?.name || "").toLowerCase();
              const formatted = feat.properties?.formatted || "";
              const featDistrict = extractDistrictFromText(formatted);

              if (detectedDistrict && featDistrict && featDistrict !== detectedDistrict) {
                continue;
              }

              const hasNameMatch = nameTerms.some((t) => placeName.includes(t));
              if (hasNameMatch && lat != null && lon != null) {
                return {
                  success: true,
                  placeId: feat.properties?.place_id,
                  latitude: Number(lat),
                  longitude: Number(lon),
                  formattedAddress: formatted,
                  confidence: 0.9,
                  provider: "GEOAPIFY",
                };
              }
            }
          }
        } catch {
          // Continue to area search
        }
      }
    }

    // Phase 2: Locality / Area Fallback
    const areaQueries = [loc, areaOnly, detectedDistrict].filter(Boolean) as string[];
    for (const q of areaQueries) {
      try {
        const res = await fetch(makeUrl(q, 3), { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          const first = data?.features?.[0];
          if (first) {
            const [lon, lat] = first.geometry?.coordinates || [];
            if (lat != null && lon != null) {
              return {
                success: true,
                placeId: first.properties?.place_id,
                latitude: Number(lat),
                longitude: Number(lon),
                formattedAddress: first.properties?.formatted,
                confidence: 0.6,
                provider: "GEOAPIFY",
              };
            }
          }
        }
      } catch {
        // Continue
      }
    }

    return { success: false, error: "No matching location found in Geoapify.", provider: "GEOAPIFY" };
  } catch (err: any) {
    return { success: false, error: err.message || "Geoapify lookup failed.", provider: "GEOAPIFY" };
  }
}

// ── 2. Google Maps Official Geocoder ──────────────────────────────────────────
export async function geocodeGoogleMaps(
  businessName: string,
  location: string
): Promise<GeocodeResult> {
  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { success: false, error: "Google Maps API key is not configured.", provider: "GOOGLE" };
  }

  try {
    const bName = (businessName || "").trim();
    const loc = (location || "").trim();
    const detectedDistrict = extractDistrictFromText(loc);

    const queries: string[] = [];
    if (bName && loc) queries.push(`${bName}, ${loc}, Bangladesh`);
    if (bName && detectedDistrict && detectedDistrict !== loc) queries.push(`${bName}, ${detectedDistrict}, Bangladesh`);
    if (loc) queries.push(`${loc}, Bangladesh`);
    if (bName) queries.push(`${bName}, Bangladesh`);

    for (const q of queries) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        q
      )}&components=country:BD&key=${apiKey}`;

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;

        const data = await res.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const first = data.results[0];
          const lat = first.geometry?.location?.lat;
          const lng = first.geometry?.location?.lng;

          if (lat != null && lng != null) {
            return {
              success: true,
              placeId: first.place_id,
              latitude: Number(lat),
              longitude: Number(lng),
              formattedAddress: first.formatted_address,
              confidence: data.results.length === 1 ? 0.95 : 0.85,
              provider: "GOOGLE",
            };
          }
        } else if (data.status === "REQUEST_DENIED") {
          console.warn("Google Geocoding REQUEST_DENIED:", data.error_message);
          return {
            success: false,
            error: data.error_message || "Google Maps API request was denied. Ensure billing is enabled.",
            provider: "GOOGLE",
          };
        } else if (data.status === "OVER_QUERY_LIMIT") {
          return {
            success: false,
            error: "Google Maps quota or rate limit exceeded.",
            provider: "GOOGLE",
          };
        }
      } catch (reqErr: any) {
        console.warn(`Google geocoding error for query "${q}":`, reqErr.message);
      }
    }

    return { success: false, error: "No matching location found in Google Maps.", provider: "GOOGLE" };
  } catch (err: any) {
    return { success: false, error: err.message || "Google Maps lookup failed.", provider: "GOOGLE" };
  }
}

// ── 3. Dual Geocoding Resolver ────────────────────────────────────────────────
export async function resolveDualGeocoding(
  businessName: string,
  location: string,
  options?: {
    mode?: "BOTH" | "GOOGLE" | "GEOAPIFY";
    district?: string;
  }
): Promise<DualGeocodeResult> {
  const mode = options?.mode || "BOTH";

  let osmResult: GeocodeResult | undefined;
  let googleResult: GeocodeResult | undefined;

  if (mode === "BOTH") {
    const [osmSettled, googleSettled] = await Promise.allSettled([
      geocodeGeoapify(businessName, location),
      geocodeGoogleMaps(businessName, location),
    ]);

    if (osmSettled.status === "fulfilled") osmResult = osmSettled.value;
    if (googleSettled.status === "fulfilled") googleResult = googleSettled.value;
  } else if (mode === "GOOGLE") {
    googleResult = await geocodeGoogleMaps(businessName, location);
    // If Google succeeds, also copy universal coordinates to OSM to keep both ready
    if (googleResult.success && googleResult.latitude != null && googleResult.longitude != null) {
      osmResult = {
        success: true,
        latitude: googleResult.latitude,
        longitude: googleResult.longitude,
        placeId: googleResult.placeId,
        formattedAddress: googleResult.formattedAddress,
        provider: "GEOAPIFY",
        confidence: googleResult.confidence,
      };
    }
  } else if (mode === "GEOAPIFY") {
    osmResult = await geocodeGeoapify(businessName, location);
  }

  // Determine primary coordinates (prefer Google if available and valid, else OSM)
  let primaryLat: number | null = null;
  let primaryLng: number | null = null;
  let primaryPlaceId: string | null = null;
  let primaryFormattedAddress: string | null = null;
  let providerUsed: "BOTH" | "GOOGLE" | "GEOAPIFY" | "NONE" = "NONE";

  if (googleResult?.success && googleResult.latitude != null && googleResult.longitude != null) {
    primaryLat = googleResult.latitude;
    primaryLng = googleResult.longitude;
    primaryPlaceId = googleResult.placeId || null;
    primaryFormattedAddress = googleResult.formattedAddress || null;
    providerUsed = osmResult?.success ? "BOTH" : "GOOGLE";
  } else if (osmResult?.success && osmResult.latitude != null && osmResult.longitude != null) {
    primaryLat = osmResult.latitude;
    primaryLng = osmResult.longitude;
    primaryPlaceId = osmResult.placeId || null;
    primaryFormattedAddress = osmResult.formattedAddress || null;
    providerUsed = "GEOAPIFY";
  }

  return {
    osm: osmResult,
    google: googleResult,
    primaryLatitude: primaryLat,
    primaryLongitude: primaryLng,
    primaryPlaceId,
    primaryFormattedAddress,
    providerUsed,
  };
}
