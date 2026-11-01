"use client";

import { MapBusiness, RestaurantProspect, calculateGeoapifyRoute, fetchLiveRestaurantProspects } from "@/actions/map";
import { restoreBusiness } from "@/actions/businesses";
import { getDistrictCoordinates } from "@/lib/district-resolver";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import AddBusinessFromMapModal, { MapPointPreset } from "./AddBusinessFromMapModal";
import RestoreBusinessFromMapModal from "./RestoreBusinessFromMapModal";
import BusinessMapFilters, { MapFiltersState, UnifiedMapPoint } from "./BusinessMapFilters";

declare global {
  interface Window {
    maplibregl: any;
  }
}

interface GeoapifyMapProps {
  initialBusinesses: MapBusiness[];
  initialProspects?: RestaurantProspect[];
  categories: string[];
  districts: string[];
  areas?: string[];
  apiKey?: string;
  focusId?: string;
  canAddBusiness?: boolean;
}

export { type UnifiedMapPoint } from "./BusinessMapFilters";

export default function GeoapifyMapClient({
  initialBusinesses,
  initialProspects,
  categories,
  districts,
  areas,
  apiKey,
  focusId,
  canAddBusiness = true,
}: GeoapifyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clientMarkersRef = useRef<any[]>([]);
  const prospectMarkersRef = useRef<any[]>([]);
  const locationMarkerRef = useRef<any>(null);
  const activePopupRef = useRef<any>(null);
  const popupsMapRef = useRef<Map<string, { popup: any; point: UnifiedMapPoint }>>(new Map());
  const isInitializingRef = useRef(false);
  const pendingSelectedPointIdRef = useRef<string | null>(null);

  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoringTarget, setRestoringTarget] = useState<UnifiedMapPoint | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<UnifiedMapPoint | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Live Prospects / Leads State (Red & Gray Markers)
  const [prospects, setProspects] = useState<RestaurantProspect[]>(initialProspects || []);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Add-from-map modal
  const [addFromMapPreset, setAddFromMapPreset] = useState<MapPointPreset | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);

  // Filter state
  const [filters, setFilters] = useState<MapFiltersState>({
    q: "",
    category: "ALL",
    district: "ALL",
    area: "ALL",
    orderColor: "ALL",
  });

  // Live converted clients from map
  const [convertedClients, setConvertedClients] = useState<UnifiedMapPoint[]>([]);

  // Client DB businesses transformed to unified points
  const clientPoints: UnifiedMapPoint[] = useMemo(() => {
    const base = initialBusinesses
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => {
        return {
          id: b.id,
          name: b.name,
          category: b.category || "Hospitality",
          area: b.area || "Dhaka",
          district: b.district || "Dhaka",
          address: b.address || "Address on record",
          phoneRaw: b.phoneRaw,
          latitude: Number(b.latitude),
          longitude: Number(b.longitude),
          isClient: true,
          orderCount: b.orderCount || 0,
          markerColor: "green" as const, // In DB -> Green Client!
        };
      });
    return [...base, ...convertedClients];
  }, [initialBusinesses, convertedClients]);

  // Prospect points transformed to unified points (Red & Gray Markers)
  const prospectPoints: UnifiedMapPoint[] = useMemo(() => {
    return prospects
      .filter((p) => !p.isClient || p.isArchived)
      .map((p) => ({
        id: p.clientBusinessId || p.id,
        name: p.name,
        category: p.category || "Restaurant",
        area: "Dhaka",
        district: "Dhaka",
        address: p.address || "Dhaka, Bangladesh",
        phoneRaw: p.phoneRaw || null,
        latitude: p.latitude,
        longitude: p.longitude,
        isClient: p.isClient,
        isArchived: p.isArchived,
        orderCount: p.orderCount || 0,
        markerColor: p.isArchived ? ("gray" as const) : ("red" as const),
        externalPlaceId: p.id,
      }));
  }, [prospects]);

  // Candidate points strictly filtered by non-search filters (Category, District, Marker Color)
  // These are both rendered on the map and used for search autocomplete suggestions!
  const candidatePoints = useMemo(() => {
    const combined = [...clientPoints, ...prospectPoints];
    return combined.filter((pt) => {
      if (filters.orderColor === "GREEN" && pt.markerColor !== "green") return false;
      if (filters.orderColor === "GRAY" && pt.markerColor !== "gray") return false;
      if (filters.orderColor === "RED" && pt.markerColor !== "red") return false;
      if (filters.category !== "ALL" && !pt.category.toLowerCase().includes(filters.category.toLowerCase())) return false;
      // District filter: only apply to DB clients — prospect/red markers are geo-scanned
      // around the district center so they naturally belong there; hardcoded district field
      // on them is always "Dhaka" regardless of where they are.
      if (filters.district !== "ALL" && pt.isClient && pt.district !== filters.district) return false;
      return true;
    });
  }, [clientPoints, prospectPoints, filters.orderColor, filters.category, filters.district]);

  // Points displayed on map (respects the active combined filters)
  const displayedPoints = candidatePoints;

  const greenCount = displayedPoints.filter((p) => p.markerColor === "green").length;
  const grayCount = displayedPoints.filter((p) => p.markerColor === "gray").length;
  const redCount = displayedPoints.filter((p) => p.markerColor === "red").length;
  const unlocatedClients = initialBusinesses.filter((b) => b.latitude == null || b.longitude == null);

  // Helper: place the blue pulsing dot on a map instance with single-popup enforcement
  const placePulsingDot = useCallback((map: any, lat: number, lng: number) => {
    if (locationMarkerRef.current) {
      locationMarkerRef.current.remove();
      locationMarkerRef.current = null;
    }

    const el = document.createElement("div");
    el.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.6);
      animation: locationPulse 2s ease-out infinite;
      position: relative;
      cursor: pointer;
    `;

    if (!document.getElementById("location-pulse-style")) {
      const style = document.createElement("style");
      style.id = "location-pulse-style";
      style.textContent = `
        @keyframes locationPulse {
          0%   { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70%  { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    const popup = new window.maplibregl.Popup({
      offset: 16,
      closeButton: true,
      closeOnClick: true,
    }).setHTML(
      `<div style="padding: 6px 10px; font-family: inherit; color: #0f172a; font-size: 12px; font-weight: 600;">📍 আপনি এখানে আছেন</div>`
    );

    popup.on("close", () => {
      if (activePopupRef.current === popup) {
        activePopupRef.current = null;
      }
    });

    el.addEventListener("click", (e) => {
      e.stopPropagation();

      // If clicked while already open, toggle off
      if (activePopupRef.current === popup && popup.isOpen()) {
        popup.remove();
        activePopupRef.current = null;
        return;
      }

      // Close any other open popup
      if (activePopupRef.current) {
        try {
          activePopupRef.current.remove();
        } catch (err) {}
        activePopupRef.current = null;
      }

      // Remove lingering popups
      const popups = mapContainerRef.current?.querySelectorAll(".maplibregl-popup");
      popups?.forEach((p) => p.remove());

      popup.setLngLat([lng, lat]).addTo(map);
      activePopupRef.current = popup;
    });

    const marker = new window.maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);

    locationMarkerRef.current = marker;
  }, []);

  // Scan live area for BD hospitality businesses (Hotels, Parlours, Food) within radius (default 3000m / 3km)
  const handleScanArea = async (customLat?: number, customLon?: number, customRadius: number = 3000) => {
    setIsScanning(true);
    setScanMessage(null);

    let lat: number = customLat ?? userLocation?.lat ?? 23.7405;
    let lon: number = customLon ?? userLocation?.lng ?? 90.3846;

    if (customLat == null && !userLocation && mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      lat = typeof center.lat === "function" ? center.lat() : center.lat;
      lon = typeof center.lng === "function" ? center.lng() : center.lng;
    }

    try {
      const result = await fetchLiveRestaurantProspects({
        lat,
        lon,
        radiusMeters: customRadius,
      });

      if (result.error) {
        setScanMessage(`⚠️ ${result.error}`);
      } else if (result.prospects) {
        setProspects(result.prospects);
        setScanMessage(`✅ আপনার বর্তমান লোকেশনের ৩ কিমি এর মধ্যে ${result.prospects.length} টি সম্ভাব্য বিজনেস (Red Mark) পাওয়া গেছে।`);
      }
    } catch (err: any) {
      setScanMessage(`❌ Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Fly to user's current location, place pulsing blue dot, and scan 3km around
  // Fly to user's real location and scan 3km around (Scan Nearby Area)
  const handleLocateMe = () => {
    if (!mapInstanceRef.current || !window.maplibregl) return;
    const map = mapInstanceRef.current;

    setFilters({
      q: "",
      category: "ALL",
      district: "ALL",
      area: "ALL",
      orderColor: "ALL",
    });
    setRouteInfo(null);

    // If userLocation is already cached, immediately fly there and scan
    if (userLocation) {
      placePulsingDot(map, userLocation.lat, userLocation.lng);
      map.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 15,
        speed: 1.4,
      });
      handleScanArea(userLocation.lat, userLocation.lng, 3000);
    }

    if (!navigator.geolocation) {
      if (!userLocation) {
        setLocationError("⚠️ Geolocation is not supported by your browser.");
      }
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!map) return;

        placePulsingDot(map, latitude, longitude);
        setUserLocation({ lat: latitude, lng: longitude });

        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          speed: 1.4,
          curve: 1.4,
        });

        setIsLocating(false);
        handleScanArea(latitude, longitude, 3000);
      },
      (err) => {
        setIsLocating(false);
        if (!userLocation) {
          if (err.code === 1) {
            setLocationError("⚠️ Location permission denied. Please allow location access in your browser.");
          } else {
            setLocationError(`⚠️ Could not get your location: ${err.message}`);
          }
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };


  // Initialize MapLibre Map — loads English-only style to prevent broken Bengali ligatures
  const initMap = async () => {
    if (!window.maplibregl || !mapContainerRef.current || mapInstanceRef.current || isInitializingRef.current) return;
    isInitializingRef.current = true;

    let styleConfig: any = apiKey
      ? `https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`
      : {
          version: 8,
          sources: {
            "osm-tiles": {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            },
          },
          layers: [
            {
              id: "osm-tiles-layer",
              type: "raster",
              source: "osm-tiles",
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        };

    // If Geoapify apiKey is available, fetch the style JSON and remove {name:nonlatin}
    // so that all place and road names display cleanly in English without broken Bengali ligatures
    if (apiKey) {
      try {
        const res = await fetch(`https://maps.geoapify.com/v1/styles/osm-bright/style.json?apiKey=${apiKey}`);
        if (res.ok) {
          const styleJson = await res.json();
          if (styleJson && Array.isArray(styleJson.layers)) {
            styleJson.layers.forEach((layer: any) => {
              if (layer.layout && typeof layer.layout["text-field"] === "string") {
                layer.layout["text-field"] = layer.layout["text-field"]
                  .replace(/\s*\{name:nonlatin\}/g, "")
                  .trim();
              }
            });
            styleConfig = styleJson;
          }
        }
      } catch (err) {
        console.warn("Could not customize Geoapify style to English-only:", err);
      }
    }

    // Helper: finish building map once we have a starting coordinate
    const buildMap = (centerLat: number, centerLng: number, isRealLocation: boolean) => {
      if (!mapContainerRef.current || mapInstanceRef.current) {
        isInitializingRef.current = false;
        return;
      }

      const map = new window.maplibregl.Map({
        container: mapContainerRef.current,
        style: styleConfig,
        center: [centerLng, centerLat],
        zoom: 14,
      });

      map.addControl(new window.maplibregl.NavigationControl(), "top-right");

      // Global click handler: close any active popup when clicking map background
      map.on("click", () => {
        if (activePopupRef.current) {
          try {
            activePopupRef.current.remove();
          } catch (e) {}
          activePopupRef.current = null;
        }
      });

      map.on("load", () => {
        mapInstanceRef.current = map;
        isInitializingRef.current = false;
        setMapLoaded(true);

        if (isRealLocation) {
          placePulsingDot(map, centerLat, centerLng);
        }

        // Always scan 3km around starting coordinates on map load
        handleScanArea(centerLat, centerLng, 3000);
      });
    };

    const targetPoint = focusId ? initialBusinesses.find((b) => b.id === focusId) : null;
    if (targetPoint && targetPoint.latitude != null && targetPoint.longitude != null) {
      buildMap(Number(targetPoint.latitude), Number(targetPoint.longitude), false);
      return;
    }

    // Try to get real location first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          buildMap(lat, lng, true);
        },
        () => {
          // Permission denied or error → fallback to Dhaka center
          buildMap(23.7405, 90.3846, false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      buildMap(23.7405, 90.3846, false);
    }
  };

  // ── Mount / Unmount lifecycle ────────────────────────────────────────────────
  // Fix: on mount, if library is already in memory, init with container readiness check.
  // On unmount, fully destroy the map and clear state so returning to this route re-inits cleanly.
  useEffect(() => {
    if (typeof window !== "undefined" && window.maplibregl) {
      const timer = setTimeout(() => {
        if (mapContainerRef.current && !mapInstanceRef.current) {
          initMap();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Map remove error:", e);
        }
        mapInstanceRef.current = null;
      }
      isInitializingRef.current = false;
      setMapLoaded(false);
      clientMarkersRef.current.forEach((m) => m.remove());
      clientMarkersRef.current = [];
      if (locationMarkerRef.current) {
        locationMarkerRef.current.remove();
        locationMarkerRef.current = null;
      }
      if (activePopupRef.current) {
        try {
          activePopupRef.current.remove();
        } catch (e) {}
        activePopupRef.current = null;
      }
    };
  }, []);

  // Helper to execute Geoapify route calculation
  const executeGeoapifyRoute = async (startLat: number, startLng: number, pt: UnifiedMapPoint) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const destLng = pt.longitude;
    const destLat = pt.latitude;

    setIsRouting(true);

    try {
      const res = await calculateGeoapifyRoute({
        originLat: startLat,
        originLon: startLng,
        destLat: destLat,
        destLon: destLng,
        mode: "drive",
      });

      if (res.success && res.geojson) {
        setRouteInfo({
          distanceKm: res.distanceKm || 0,
          durationMin: res.durationMin || 0,
        });

        if (map.getSource("route")) {
          map.getSource("route").setData(res.geojson);
        } else {
          map.addSource("route", { type: "geojson", data: res.geojson });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.9 },
          });
        }

        const bounds = new window.maplibregl.LngLatBounds();
        const coords = res.geojson.geometry?.coordinates;
        if (coords) {
          if (res.geojson.geometry.type === "MultiLineString") {
            coords.forEach((line: any[]) => {
              line.forEach((p: [number, number]) => bounds.extend(p));
            });
          } else if (res.geojson.geometry.type === "LineString") {
            coords.forEach((p: [number, number]) => bounds.extend(p));
          }
        }
        bounds.extend([startLng, startLat]);
        bounds.extend([destLng, destLat]);
        map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
      } else {
        alert(res.error || "Could not calculate road route from Geoapify.");
      }
    } catch (err: any) {
      alert("Route error: " + err.message);
    } finally {
      setIsRouting(false);
    }
  };

  // Route calculation — routes directly from user's current location to selected business
  const handleCalculateRoute = async (targetPoint?: UnifiedMapPoint) => {
    const pt = targetPoint || selectedPoint;
    if (!pt || !mapInstanceRef.current) return;

    setSelectedPoint(pt);

    // If userLocation is already available, calculate directly from user's current location!
    if (userLocation) {
      executeGeoapifyRoute(userLocation.lat, userLocation.lng, pt);
      return;
    }

    // If userLocation is not yet set, obtain current position first then calculate route
    if (navigator.geolocation) {
      setIsRouting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          if (mapInstanceRef.current) {
            placePulsingDot(mapInstanceRef.current, lat, lng);
          }
          executeGeoapifyRoute(lat, lng, pt);
        },
        () => {
          // If denied, fallback to map center
          const center = mapInstanceRef.current?.getCenter();
          const fallbackLat = center ? (typeof center.lat === "function" ? center.lat() : center.lat) : 23.7405;
          const fallbackLng = center ? (typeof center.lng === "function" ? center.lng() : center.lng) : 90.3846;
          executeGeoapifyRoute(fallbackLat, fallbackLng, pt);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      executeGeoapifyRoute(23.7405, 90.3846, pt);
    }
  };

  const handleClearRoute = () => {
    setRouteInfo(null);
    if (mapInstanceRef.current && mapInstanceRef.current.getSource("route")) {
      mapInstanceRef.current.getSource("route").setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  const handleConfirmRestore = () => {
    if (!restoringTarget) return;
    const target = restoringTarget;
    setIsRestoring(true);
    startTransition(async () => {
      const res = await restoreBusiness(target.id);
      setIsRestoring(false);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`‘${target.name}’ has been successfully restored!`);
        setSelectedPoint((prev) => (prev ? { ...prev, isArchived: false, markerColor: "green" } : null));
        setProspects((prev) =>
          prev.map((p) =>
            p.clientBusinessId === target.id || p.id === target.id
              ? { ...p, isArchived: false, markerColor: "green", isClient: true }
              : p
          )
        );
        setRestoringTarget(null);
        router.refresh();
      }
    });
  };


  // Render Markers on MapLibre with Rich Interactive Popups
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.maplibregl) return;

    const map = mapInstanceRef.current;

    // Clear old markers and close any lingering popups (unless pending selected point)
    if (activePopupRef.current && !pendingSelectedPointIdRef.current) {
      try {
        activePopupRef.current.remove();
      } catch (e) {}
      activePopupRef.current = null;
    }
    if (!pendingSelectedPointIdRef.current) {
      const lingeringPopups = mapContainerRef.current?.querySelectorAll(".maplibregl-popup");
      lingeringPopups?.forEach((p) => p.remove());
    }

    clientMarkersRef.current.forEach((m) => m.remove());
    clientMarkersRef.current = [];
    prospectMarkersRef.current.forEach((m) => m.remove());
    prospectMarkersRef.current = [];
    popupsMapRef.current.clear();

    displayedPoints.forEach((pt) => {
      const isGreen = pt.markerColor === "green";
      const isGray = pt.markerColor === "gray" || pt.isArchived;
      const catLower = pt.category.toLowerCase();
      const icon = isGreen
        ? "✓"
        : isGray
        ? "📁"
        : catLower.includes("hotel") || catLower.includes("accommodation")
        ? "🏨"
        : catLower.includes("parlour") || catLower.includes("salon") || catLower.includes("beauty") || catLower.includes("hair")
        ? "💇"
        : catLower.includes("cafe")
        ? "☕"
        : "🍽️";

      const el = document.createElement("div");
      el.className = `custom-map-pin ${isGreen ? "ordered-pin" : isGray ? "archived-pin" : "unopened-pin"}`;
      el.style.width = isGreen ? "26px" : "24px";
      el.style.height = isGreen ? "26px" : "24px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = isGreen ? "#10b981" : isGray ? "#64748b" : "#ef4444";
      el.style.border = isGreen ? "3px solid #ffffff" : isGray ? "2px solid #ffffff" : "2px solid #ffffff";
      el.style.boxShadow = isGreen
        ? "0 0 14px rgba(16, 185, 129, 0.85), 0 2px 6px rgba(0,0,0,0.3)"
        : isGray
        ? "0 0 10px rgba(100, 116, 139, 0.85), 0 2px 4px rgba(0,0,0,0.2)"
        : "0 0 12px rgba(239, 68, 68, 0.85), 0 2px 4px rgba(0,0,0,0.2)";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.color = "#ffffff";
      el.style.fontSize = isGreen ? "12px" : "11px";
      el.style.fontWeight = "bold";
      el.innerHTML = icon;
      el.title = isGreen
        ? `${pt.name} (🟢 Ordered - ${pt.orderCount} Orders)`
        : isGray
        ? `${pt.name} (📁 Archived Client - ${pt.orderCount} Orders)`
        : `${pt.name} (🔴 0 Orders - Hospitality Lead)`;

      // Popup Container DOM — theme handled by CSS classes .map-popup-inner etc.
      const popupContainer = document.createElement("div");
      popupContainer.className = "map-popup-inner";

      // Title
      const titleEl = document.createElement("div");
      titleEl.className = "map-popup-title";
      titleEl.textContent = pt.name;

      // Subtitle (Category & Address)
      const subEl = document.createElement("div");
      subEl.className = "map-popup-sub";
      subEl.style.marginBottom = isGreen || isGray ? "9px" : "12px";
      subEl.textContent = `${pt.category} • ${pt.address}`;

      popupContainer.appendChild(titleEl);
      popupContainer.appendChild(subEl);

      // Status Badge
      if (isGreen) {
        const badgeEl = document.createElement("div");
        badgeEl.className = "map-popup-badge";
        badgeEl.style.marginBottom = "11px";
        badgeEl.textContent = `🟢 Ordered Client (${pt.orderCount} Order${pt.orderCount > 1 ? "s" : ""})`;
        popupContainer.appendChild(badgeEl);
      } else if (isGray) {
        const badgeEl = document.createElement("div");
        badgeEl.className = "map-popup-badge";
        badgeEl.style.marginBottom = "11px";
        badgeEl.style.background = "#64748b";
        badgeEl.style.color = "#ffffff";
        badgeEl.textContent = `📁 Archived Client (${pt.orderCount} Past Order${pt.orderCount > 1 ? "s" : ""})`;
        popupContainer.appendChild(badgeEl);
      }

      const popup = new window.maplibregl.Popup({
        offset: 16,
        closeButton: true,
        closeOnClick: true,
        maxWidth: "280px",
      });

      popup.on("close", () => {
        if (activePopupRef.current === popup) {
          activePopupRef.current = null;
        }
      });

      // Route Action Button inside popup
      const routeBtn = document.createElement("button");
      routeBtn.type = "button";
      routeBtn.style.cssText =
        "width: 100%; padding: 8px 12px; background: #2563eb; color: #ffffff; border: none; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35); transition: background 0.15s ease; margin-top: 4px;";
      routeBtn.innerHTML = `<span>🚗</span><span>Route ETA from My Location</span>`;
      routeBtn.onmouseenter = () => {
        routeBtn.style.background = "#1d4ed8";
      };
      routeBtn.onmouseleave = () => {
        routeBtn.style.background = "#2563eb";
      };
      routeBtn.onclick = (e) => {
        e.stopPropagation();
        popup.remove();
        if (activePopupRef.current === popup) {
          activePopupRef.current = null;
        }
        handleCalculateRoute(pt);
      };
      popupContainer.appendChild(routeBtn);

      popup.setDOMContent(popupContainer);

      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([pt.longitude, pt.latitude])
        .addTo(map);

      el.addEventListener("click", (e) => {
        e.stopPropagation();

        // 1. If this exact popup is already open, toggle it closed
        if (activePopupRef.current === popup && popup.isOpen()) {
          popup.remove();
          activePopupRef.current = null;
          return;
        }

        // 2. Close any other popup that might currently be open
        if (activePopupRef.current) {
          try {
            activePopupRef.current.remove();
          } catch (err) {}
          activePopupRef.current = null;
        }

        // 3. Remove any remaining popup DOM elements from map container
        const currentPopups = mapContainerRef.current?.querySelectorAll(".maplibregl-popup");
        currentPopups?.forEach((p) => p.remove());

        // 4. Open this popup at the marker's coordinates
        popup.setLngLat([pt.longitude, pt.latitude]).addTo(map);
        activePopupRef.current = popup;
        setSelectedPoint(pt);
      });

      if (isGreen) {
        clientMarkersRef.current.push(marker);
      } else {
        prospectMarkersRef.current.push(marker);
      }

      popupsMapRef.current.set(pt.id, { popup, point: pt });

      // If this is the focused business from URL OR pending selected from search, auto-center and open popup!
      const isPendingFromSearch = pendingSelectedPointIdRef.current === pt.id;
      const isFocusFromUrl = focusId && pt.id === focusId;

      if (isPendingFromSearch || isFocusFromUrl) {
        if (isPendingFromSearch) {
          pendingSelectedPointIdRef.current = null;
        }
        if (activePopupRef.current) {
          try {
            activePopupRef.current.remove();
          } catch (err) {}
          activePopupRef.current = null;
        }
        popup.setLngLat([pt.longitude, pt.latitude]).addTo(map);
        activePopupRef.current = popup;
        setSelectedPoint(pt);
        map.flyTo({
          center: [pt.longitude, pt.latitude],
          zoom: 16,
          speed: 1.4,
        });
      }
    });
  }, [mapLoaded, displayedPoints, focusId]);

  // Focus on business selected from search dropdown & open its popup
  const handleSelectBusinessFromSearch = useCallback((pt: UnifiedMapPoint) => {
    if (!mapInstanceRef.current || !window.maplibregl) return;
    const map = mapInstanceRef.current;

    // Always update sidebar immediately
    setSelectedPoint(pt);

    // Check if marker already exists by id OR by close coordinates
    let record = popupsMapRef.current.get(pt.id);
    if (!record) {
      for (const entry of popupsMapRef.current.values()) {
        if (
          Math.abs(entry.point.latitude - pt.latitude) < 0.0001 &&
          Math.abs(entry.point.longitude - pt.longitude) < 0.0001
        ) {
          record = entry;
          break;
        }
      }
    }

    if (record) {
      pendingSelectedPointIdRef.current = null;
      map.flyTo({ center: [pt.longitude, pt.latitude], zoom: 16, speed: 1.4, essential: true });
      map.once("moveend", () => {
        if (activePopupRef.current && activePopupRef.current !== record!.popup) {
          try { activePopupRef.current.remove(); } catch (err) {}
        }
        record!.popup.setLngLat([pt.longitude, pt.latitude]).addTo(map);
        activePopupRef.current = record!.popup;
      });
    } else {
      pendingSelectedPointIdRef.current = pt.id;
      map.flyTo({ center: [pt.longitude, pt.latitude], zoom: 16, speed: 1.4, essential: true });

      if (!pt.isClient) {
        setProspects((prev) => {
          if (prev.some((p) => p.id === pt.id || (Math.abs(p.latitude - pt.latitude) < 0.0001 && Math.abs(p.longitude - pt.longitude) < 0.0001))) {
            return prev;
          }
          return [
            ...prev,
            {
              id: pt.id,
              name: pt.name,
              category: pt.category,
              address: pt.address,
              phoneRaw: pt.phoneRaw || undefined,
              latitude: pt.latitude,
              longitude: pt.longitude,
              isClient: false,
              orderCount: 0,
              markerColor: "red",
            },
          ];
        });
      }
    }
  }, [handleCalculateRoute]);


  // Filter change handler — intercepts district changes to fly map to district center
  const handleFiltersChange = useCallback((newFilters: MapFiltersState) => {
    setFilters(newFilters);

    // When district changes: fly to that district & scan nearby prospects
    if (newFilters.district !== filters.district && newFilters.district !== "ALL") {
      const coords = getDistrictCoordinates(newFilters.district);
      if (coords && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 12,
          speed: 1.4,
          curve: 1.3,
          essential: true,
        });
        // Scan prospects in that district area
        handleScanArea(coords.lat, coords.lng, 8000);
      }
    }
  }, [filters.district]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 animate-fade-in">
      <Script
        src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"
        onLoad={initMap}
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css"
      />

      {/* Filter and Overview Controls with Autocomplete Dropdown */}
      <BusinessMapFilters
        filters={filters}
        onChange={handleFiltersChange}
        categories={categories}
        districts={districts}
        areas={areas || []}
        candidateBusinesses={candidatePoints}
        onSelectBusiness={handleSelectBusinessFromSearch}
        stats={{
          total: displayedPoints.length,
          located: displayedPoints.length,
          unlocated: unlocatedClients.length,
          green: greenCount,
          red: redCount,
        }}
      />

      {/* Notification banner */}
      {(scanMessage || conversionSuccess || locationError) && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 font-medium">
          <span>{conversionSuccess || scanMessage || locationError}</span>
          <button
            onClick={() => {
              setScanMessage(null);
              setConversionSuccess(null);
              setLocationError(null);
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 min-h-[520px]">
        {/* Map Canvas */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg min-h-[440px] sm:min-h-[540px]">
          <div
            ref={mapContainerRef}
            className="w-full h-full min-h-[440px] sm:min-h-[540px] bg-slate-100 dark:bg-slate-900"
          />

          {/* Floating Action Button: Scan Nearby Area */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <button
              onClick={handleLocateMe}
              disabled={isScanning || isLocating}
              className="px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Fly to your current location and scan 3km nearby area"
            >
              {isScanning || isLocating ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                  <span>Scanning…</span>
                </>
              ) : (
                <>
                  <span className="text-sm">📡</span>
                  <span>Scan Nearby Area</span>
                </>
              )}
            </button>

            {/* Quick Legend floating card */}
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-md flex items-center gap-2.5 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                Clients ({greenCount})
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block shadow-[0_0_6px_rgba(100,116,139,0.8)]" />
                Archived ({grayCount})
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                Leads ({redCount})
              </span>
            </div>
          </div>

          {/* My Location Button — bottom-right */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className="absolute bottom-4 right-4 z-20 w-11 h-11 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-md transition-all flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
            title="আমার বর্তমান অবস্থান দেখাও (My Current Location)"
          >
            {isLocating ? (
              <svg className="animate-spin w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" strokeOpacity="0.3" />
              </svg>
            )}
          </button>

          {/* Floating Route Information Card */}
          {routeInfo && (
            <div className="absolute bottom-4 left-4 right-16 sm:right-auto z-10 p-4 rounded-xl bg-slate-900/95 backdrop-blur-md border border-blue-500/40 shadow-2xl sm:max-w-xs space-y-2 text-white">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400">🚗 Field Route &amp; ETA</span>
                <button
                  onClick={handleClearRoute}
                  className="text-slate-400 hover:text-slate-200 text-xs p-1"
                >
                  ✕
                </button>
              </div>
              <div>
                <span className="text-2xl font-black text-slate-100 font-mono">
                  {routeInfo.distanceKm} km
                </span>{" "}
                <span className="text-xs text-slate-400 font-medium">
                  (~{routeInfo.durationMin} mins)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {userLocation ? "📍 আপনার অবস্থান" : "Central Hub (Dhaka)"} → {selectedPoint?.name}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar: Selected Pin Details & Prospect Conversion */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Client Account Details
            </h3>

            {selectedPoint ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        selectedPoint.markerColor === "green"
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
                          : selectedPoint.markerColor === "gray" || selectedPoint.isArchived
                          ? "bg-slate-400 shadow-[0_0_8px_rgba(100,116,139,0.7)]"
                          : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                      }`}
                    />
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug">
                      {selectedPoint.name}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedPoint.category} • {selectedPoint.address}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Order Status:</span>
                    <span
                      className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                        selectedPoint.markerColor === "green"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                          : selectedPoint.markerColor === "gray" || selectedPoint.isArchived
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                      }`}
                    >
                      {selectedPoint.markerColor === "green"
                        ? `🟢 Ordered (${selectedPoint.orderCount} Orders)`
                        : selectedPoint.markerColor === "gray" || selectedPoint.isArchived
                        ? `📁 Archived (${selectedPoint.orderCount} Past Orders)`
                        : selectedPoint.isClient
                        ? "🔴 In DB (0 Orders)"
                        : "🔴 New Prospect (0 Orders)"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Coordinates:</span>{" "}
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      {selectedPoint.latitude.toFixed(5)}, {selectedPoint.longitude.toFixed(5)}
                    </span>
                  </div>

                  {selectedPoint.phoneRaw && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Phone:</span>{" "}
                      <span className="font-mono font-semibold">{selectedPoint.phoneRaw}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  {selectedPoint.markerColor === "green" ? (
                    <Link
                      href={`/dashboard/businesses/${selectedPoint.id}`}
                      className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer"
                    >
                      View Account &amp; Orders →
                    </Link>
                  ) : selectedPoint.markerColor === "gray" || selectedPoint.isArchived ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => setRestoringTarget(selectedPoint)}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <span>🔄</span>
                        <span>Re-activate / Restore Account</span>
                      </button>
                      <Link
                        href={`/dashboard/businesses/${selectedPoint.id}`}
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer block"
                      >
                        View Historical Records →
                      </Link>
                    </div>
                  ) : canAddBusiness ? (
                    <button
                      onClick={() => setAddFromMapPreset({
                        name: selectedPoint.name,
                        category: selectedPoint.category,
                        address: selectedPoint.address,
                        area: selectedPoint.area,
                        district: selectedPoint.district,
                        latitude: selectedPoint.latitude,
                        longitude: selectedPoint.longitude,
                        phoneRaw: selectedPoint.phoneRaw,
                      })}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      ➕ Convert to Client
                    </button>
                  ) : (
                    <div className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
                      Prospect Lead (View Only)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 space-y-2">
                <span className="text-3xl">🗺️</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any <strong className="text-emerald-600">Green</strong> or <strong className="text-rose-600">Red</strong> pin to inspect the business. Red pins can be converted to a client.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Add Business from Map Modal */}
      {addFromMapPreset && (
        <AddBusinessFromMapModal
          preset={addFromMapPreset}
          onClose={() => setAddFromMapPreset(null)}
          onSuccess={(name, newId) => {
            setConversionSuccess(`✅ "${name}" has been converted to client successfully!`);
            // Remove from prospect leads
            setProspects((prev) => prev.filter((p) => p.name.toLowerCase() !== name.toLowerCase()));
            // Add as registered DB client (0 orders -> red marker)
            if (addFromMapPreset) {
              const newClientPoint: UnifiedMapPoint = {
                id: newId || `client_${Date.now()}`,
                name: name,
                category: addFromMapPreset.category || "Hospitality",
                area: addFromMapPreset.area || "Dhaka",
                district: addFromMapPreset.district || "Dhaka",
                address: addFromMapPreset.address || "Address on record",
                phoneRaw: addFromMapPreset.phoneRaw || null,
                latitude: addFromMapPreset.latitude,
                longitude: addFromMapPreset.longitude,
                isClient: true,
                orderCount: 0,
                markerColor: "green",
              };
              setConvertedClients((prev) => [...prev, newClientPoint]);
              setSelectedPoint(newClientPoint);
            }
          }}
        />
      )}

      {/* Restore Business Confirmation Modal */}
      <RestoreBusinessFromMapModal
        business={restoringTarget}
        isOpen={!!restoringTarget}
        isPending={isRestoring}
        onClose={() => setRestoringTarget(null)}
        onConfirm={handleConfirmRestore}
      />
    </div>
  );
}
