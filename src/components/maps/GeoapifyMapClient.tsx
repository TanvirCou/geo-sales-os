"use client";

import {
    MapBusiness,
    RestaurantProspect,
    calculateGeoapifyRoute,
    convertProspectToClient,
    fetchLiveRestaurantProspects,
} from "@/actions/map";
import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import BusinessMapFilters, { MapFiltersState } from "./BusinessMapFilters";

declare global {
  interface Window {
    maplibregl: any;
  }
}

interface GeoapifyMapProps {
  initialBusinesses: MapBusiness[];
  categories: string[];
  districts: string[];
  areas: string[];
  apiKey?: string;
}

// Unified item interface for both Clients and Prospects
export interface UnifiedMapPoint {
  id: string;
  name: string;
  category: string;
  area: string;
  district: string;
  address: string;
  phoneRaw: string | null;
  latitude: number;
  longitude: number;
  isClient: boolean;
  orderCount: number;
  markerColor: "green" | "red";
  externalPlaceId?: string;
}

export default function GeoapifyMapClient({
  initialBusinesses,
  categories,
  districts,
  areas,
  apiKey,
}: GeoapifyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clientMarkersRef = useRef<any[]>([]);
  const prospectMarkersRef = useRef<any[]>([]);
  const locationMarkerRef = useRef<any>(null);
  const activePopupRef = useRef<any>(null);
  const isInitializingRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<UnifiedMapPoint | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Live Prospects State
  const [prospects, setProspects] = useState<RestaurantProspect[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // Stores the user's real GPS position for routing
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Filter state
  const [filters, setFilters] = useState<MapFiltersState>({
    q: "",
    category: "ALL",
    district: "ALL",
    area: "ALL",
    orderColor: "ALL",
  });

  // Client DB businesses transformed to unified points
  const clientPoints: UnifiedMapPoint[] = useMemo(() => {
    return initialBusinesses
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => {
        const hasOrders = (b.orderCount || 0) > 0;
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
          markerColor: hasOrders ? ("green" as const) : ("red" as const),
        };
      });
  }, [initialBusinesses]);

  // Prospect points transformed to unified points (avoiding duplicates with client points)
  const prospectPoints: UnifiedMapPoint[] = useMemo(() => {
    return prospects
      .filter((p) => !p.isClient)
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || "Restaurant",
        area: "Dhaka",
        district: "Dhaka",
        address: p.address || "Dhaka, Bangladesh",
        phoneRaw: p.phoneRaw || null,
        latitude: p.latitude,
        longitude: p.longitude,
        isClient: false,
        orderCount: 0,
        markerColor: "red",
        externalPlaceId: p.id,
      }));
  }, [prospects]);

  // Combine and apply client-side search & filters
  const displayedPoints = useMemo(() => {
    const all = [...clientPoints, ...prospectPoints];

    return all.filter((pt) => {
      // Color / Status filter: GREEN = Has Orders (>= 1), RED = No Orders (= 0)
      if (filters.orderColor === "GREEN" && pt.markerColor !== "green") return false;
      if (filters.orderColor === "RED" && pt.markerColor !== "red") return false;

      // Category filter
      if (
        filters.category !== "ALL" &&
        !pt.category.toLowerCase().includes(filters.category.toLowerCase())
      ) {
        return false;
      }

      // District filter (for clients)
      if (filters.district !== "ALL" && pt.district !== filters.district) {
        return false;
      }

      // Search query filter
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const matchName = pt.name.toLowerCase().includes(query);
        const matchAddr = pt.address.toLowerCase().includes(query);
        const matchCat = pt.category.toLowerCase().includes(query);
        if (!matchName && !matchAddr && !matchCat) return false;
      }

      return true;
    });
  }, [clientPoints, prospectPoints, filters]);

  const greenCount = displayedPoints.filter((p) => p.markerColor === "green").length;
  const redCount = displayedPoints.filter((p) => p.markerColor === "red").length;
  const unlocatedClients = initialBusinesses.filter((b) => b.latitude == null || b.longitude == null);

  // Scan live area for BD restaurants using Geoapify Places API
  const handleScanArea = async (customLat?: number, customLon?: number) => {
    setIsScanning(true);
    setScanMessage(null);

    let lat = customLat || 23.7405;
    let lon = customLon || 90.3846;

    if (!customLat && mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      lat = center.lat;
      lon = center.lng;
    }

    try {
      const result = await fetchLiveRestaurantProspects({
        lat,
        lon,
        radiusMeters: 3000,
      });

      if (result.error) {
        setScanMessage(`⚠️ ${result.error}`);
      } else if (result.prospects) {
        // Merge without duplicating existing IDs
        setProspects((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newUnique = result.prospects.filter((p: RestaurantProspect) => !existingIds.has(p.id));
          return [...prev, ...newUnique];
        });
        setScanMessage(`✅ Found ${result.prospects.length} hospitality businesses in this area! Red pins are leads with 0 orders.`);
      }
    } catch (err: any) {
      setScanMessage(`❌ Scan failed: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

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

  // Fly to user's current location and place a pulsing blue dot
  const handleLocateMe = () => {
    if (!mapInstanceRef.current || !window.maplibregl) return;
    if (!navigator.geolocation) {
      setLocationError("⚠️ Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const map = mapInstanceRef.current;
        if (!map) return;

        placePulsingDot(map, latitude, longitude);

        // Update userLocation so routes use real position
        setUserLocation({ lat: latitude, lng: longitude });

        // Fly to current location
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          speed: 1.4,
          curve: 1.4,
        });

        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        if (err.code === 1) {
          setLocationError("⚠️ Location permission denied. Please allow location access in your browser.");
        } else {
          setLocationError(`⚠️ Could not get your location: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Convert a prospect to a client
  const handleConvertProspect = async (point: UnifiedMapPoint) => {
    setConvertingId(point.id);
    setConversionSuccess(null);

    startTransition(async () => {
      const res = await convertProspectToClient({
        name: point.name,
        address: point.address,
        category: point.category,
        area: point.area,
        district: point.district,
        latitude: point.latitude,
        longitude: point.longitude,
        externalPlaceId: point.externalPlaceId,
      });

      setConvertingId(null);

      if (res.success) {
        setConversionSuccess(`🎉 "${point.name}" has been converted to an active Client! Initial order created.`);
        // Mark as client in local state immediately so marker turns green
        setProspects((prev) =>
          prev.map((p) => (p.id === point.id ? { ...p, isClient: true, markerColor: "green" } : p))
        );
        setSelectedPoint((prev) => (prev?.id === point.id ? { ...prev, isClient: true, markerColor: "green" } : prev));
      } else {
        alert(res.error || "Failed to convert prospect.");
      }
    });
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
          // Place pulsing blue dot for the user's real location
          placePulsingDot(map, centerLat, centerLng);
        }

        // Scan the area the map loaded on
        handleScanArea(centerLat, centerLng);
      });
    };

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
      prospectMarkersRef.current.forEach((m) => m.remove());
      prospectMarkersRef.current = [];
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

  // Route calculation — calls real Geoapify Routing API to trace genuine road geometry & exact ETA
  const handleCalculateRoute = async (targetPoint?: UnifiedMapPoint) => {
    const pt = targetPoint || selectedPoint;
    if (!pt || !mapInstanceRef.current) return;

    setSelectedPoint(pt);

    const map = mapInstanceRef.current;
    // Use real user GPS location if available, otherwise fallback to Dhaka center
    const startLat = userLocation?.lat ?? 23.7405;
    const startLng = userLocation?.lng ?? 90.3846;
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

        // Fit map bounds to the actual road coordinates returned by Geoapify
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

  const handleClearRoute = () => {
    setRouteInfo(null);
    if (mapInstanceRef.current && mapInstanceRef.current.getSource("route")) {
      mapInstanceRef.current.getSource("route").setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  // Render Markers on MapLibre with Rich Interactive Popups
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.maplibregl) return;

    const map = mapInstanceRef.current;

    // Clear old markers and close any lingering popups
    if (activePopupRef.current) {
      try {
        activePopupRef.current.remove();
      } catch (e) {}
      activePopupRef.current = null;
    }
    const lingeringPopups = mapContainerRef.current?.querySelectorAll(".maplibregl-popup");
    lingeringPopups?.forEach((p) => p.remove());

    clientMarkersRef.current.forEach((m) => m.remove());
    clientMarkersRef.current = [];
    prospectMarkersRef.current.forEach((m) => m.remove());
    prospectMarkersRef.current = [];

    displayedPoints.forEach((pt) => {
      const isGreen = pt.markerColor === "green";
      const catLower = pt.category.toLowerCase();
      const icon = isGreen
        ? "✓"
        : catLower.includes("hotel") || catLower.includes("accommodation")
        ? "🏨"
        : catLower.includes("parlour") || catLower.includes("salon") || catLower.includes("beauty") || catLower.includes("hair")
        ? "💇"
        : catLower.includes("cafe")
        ? "☕"
        : "🍽️";

      const el = document.createElement("div");
      el.className = `custom-map-pin ${isGreen ? "ordered-pin" : "unopened-pin"}`;
      el.style.width = isGreen ? "26px" : "24px";
      el.style.height = isGreen ? "26px" : "24px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = isGreen ? "#10b981" : "#ef4444";
      el.style.border = isGreen ? "3px solid #ffffff" : "2px solid #ffffff";
      el.style.boxShadow = isGreen
        ? "0 0 14px rgba(16, 185, 129, 0.85), 0 2px 6px rgba(0,0,0,0.3)"
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
        : `${pt.name} (🔴 0 Orders - Hospitality Lead)`;

      // Popup Container DOM
      const popupContainer = document.createElement("div");
      popupContainer.style.cssText = "padding: 14px 16px 14px 16px; font-family: inherit; color: #0f172a; min-width: 230px; max-width: 270px; box-sizing: border-box;";

      // Title (with right padding so close button doesn't collide)
      const titleEl = document.createElement("div");
      titleEl.style.cssText = "font-weight: 700; font-size: 14px; margin-bottom: 4px; padding-right: 28px; line-height: 1.35; color: #0f172a;";
      titleEl.textContent = pt.name;

      // Subtitle (Category & Address)
      const subEl = document.createElement("div");
      subEl.style.cssText = `font-size: 11.5px; color: #64748b; margin-bottom: ${isGreen ? "9px" : "12px"}; line-height: 1.5;`;
      subEl.textContent = `${pt.category} • ${pt.address}`;

      popupContainer.appendChild(titleEl);
      popupContainer.appendChild(subEl);

      // Status Badge (only for green ordered clients)
      if (isGreen) {
        const badgeEl = document.createElement("div");
        badgeEl.style.cssText = "display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; font-size: 11px; font-weight: 700; border-radius: 9999px; margin-bottom: 11px; background: rgba(16, 185, 129, 0.12); color: #047857; border: 1px solid rgba(16,185,129,0.2);";
        badgeEl.textContent = `🟢 Ordered Client (${pt.orderCount} Order${pt.orderCount > 1 ? "s" : ""})`;
        popupContainer.appendChild(badgeEl);
      }

      // Action Buttons Container
      const actionsEl = document.createElement("div");
      actionsEl.style.cssText = "display: flex; flex-direction: column; gap: 6px; padding-top: 2px;";

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

      // Route Location Button directly inside Popup
      const routeBtn = document.createElement("button");
      routeBtn.type = "button";
      routeBtn.style.cssText = `
        width: 100%;
        padding: 7px 12px;
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow: 0 1px 3px rgba(37, 99, 235, 0.3);
        transition: all 0.15s ease;
      `;
      routeBtn.innerHTML = "<span>🚗</span><span>Route ETA from My Location</span>";
      routeBtn.onmouseenter = () => { routeBtn.style.background = "#1d4ed8"; };
      routeBtn.onmouseleave = () => { routeBtn.style.background = "#2563eb"; };
      routeBtn.onclick = (e) => {
        e.stopPropagation();
        routeBtn.innerHTML = `
          <svg style="animation: spin 1s linear infinite; width: 13px; height: 13px; color: white;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12" />
          </svg>
          <span>Calculating Road Route…</span>
        `;
        handleCalculateRoute(pt)
          .then(() => {
            // Auto close popup immediately when road route appears on map!
            popup.remove();
            if (activePopupRef.current === popup) {
              activePopupRef.current = null;
            }
          })
          .catch(() => {
            routeBtn.innerHTML = "<span>🚗</span><span>Route ETA from My Location</span>";
          });
      };
      actionsEl.appendChild(routeBtn);

      popupContainer.appendChild(actionsEl);

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
    });
  }, [mapLoaded, displayedPoints]);

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

      {/* Filter and Overview Controls */}
      <BusinessMapFilters
        filters={filters}
        onChange={setFilters}
        categories={categories}
        districts={districts}
        areas={areas}
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

          {/* Floating Action Button: Scan Current Area for Restaurants */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => handleScanArea()}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Query Geoapify Places API for restaurants in the currently viewed map location"
            >
              {isScanning ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                  </svg>
                  <span>Scanning Area…</span>
                </>
              ) : (
                <>
                  <span className="text-sm">🔍</span>
                  <span>Scan Area (Hotels, Parlours, Food)</span>
                </>
              )}
            </button>

            {/* Quick Legend floating card */}
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-md flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                Ordered ({greenCount})
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                No Orders / Leads ({redCount})
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
              {selectedPoint?.isClient ? "Client Account Details" : "Selected Prospect (Lead)"}
            </h3>

            {selectedPoint ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        selectedPoint.markerColor === "green"
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]"
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
                          : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                      }`}
                    >
                      {selectedPoint.markerColor === "green"
                        ? `🟢 Ordered (${selectedPoint.orderCount} Orders)`
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
                  {selectedPoint.isClient ? (
                    <>
                      <Link
                        href={`/dashboard/businesses/${selectedPoint.id}`}
                        className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer"
                      >
                        View Account Invoices →
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer"
                      >
                        Open Order Desk →
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleConvertProspect(selectedPoint)}
                        disabled={convertingId === selectedPoint.id || isPending}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        {convertingId === selectedPoint.id ? (
                          <>
                            <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                            </svg>
                            <span>Converting to Client…</span>
                          </>
                        ) : (
                          <>
                            <span>➕ Convert to Client</span>
                          </>
                        )}
                      </button>

                      <Link
                        href="/dashboard/orders"
                        className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer"
                      >
                        Open Order Desk →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 space-y-2">
                <span className="text-3xl">🗺️</span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Click any <strong className="text-emerald-600">Green (Ordered)</strong> or <strong className="text-rose-600">Red (0 Orders)</strong> business on the map to inspect details, view route ETA, or create orders.
                </p>
              </div>
            )}
          </div>

          {/* Unlocated Client Businesses Accordion */}
          {unlocatedClients.length > 0 && (
            <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📍</span> Client GPS Pending ({unlocatedClients.length})
                </span>
                <span className="text-[10px] text-slate-400">Clients without GPS</span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {unlocatedClients.map((ub) => (
                  <div
                    key={ub.id}
                    className="p-2.5 bg-amber-50/60 dark:bg-slate-800/50 rounded-xl border border-amber-200 dark:border-amber-500/20 text-xs flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{ub.name}</div>
                      <div className="text-[10px] text-slate-500">{ub.area || "Dhaka"}</div>
                    </div>
                    <Link
                      href="/dashboard/businesses"
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0 hover:underline"
                    >
                      Assign GPS
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
