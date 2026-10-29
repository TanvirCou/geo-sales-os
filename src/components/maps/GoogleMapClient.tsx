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
    google: any;
    initGoogleMapCallback: () => void;
  }
}

interface GoogleMapProps {
  initialBusinesses: MapBusiness[];
  categories: string[];
  districts: string[];
  areas: string[];
  apiKey?: string;
  mapId?: string;
}

// Unified item interface for both Clients and Prospects (matches Geoapify)
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

export default function GoogleMapClient({
  initialBusinesses,
  categories,
  districts,
  areas,
  apiKey,
  mapId,
}: GoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activeInfoWindowRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

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

  // User live location state
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Filters state
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

  // Prospect points transformed to unified points
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
        markerColor: "red" as const,
        externalPlaceId: p.id,
      }));
  }, [prospects]);

  // Combined and filtered points
  const displayedPoints = useMemo(() => {
    const combined = [...clientPoints, ...prospectPoints];

    return combined.filter((pt) => {
      // Order color filter
      if (filters.orderColor === "GREEN" && pt.markerColor !== "green") return false;
      if (filters.orderColor === "RED" && pt.markerColor !== "red") return false;

      // Category filter
      if (
        filters.category !== "ALL" &&
        !pt.category.toLowerCase().includes(filters.category.toLowerCase())
      ) {
        return false;
      }

      // District filter
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

  // Scan live area for BD hospitality businesses
  const handleScanArea = async (customLat?: number, customLon?: number) => {
    setIsScanning(true);
    setScanMessage(null);

    let lat = customLat || 23.7405;
    let lon = customLon || 90.3846;

    if (!customLat && mapInstanceRef.current) {
      const center = mapInstanceRef.current.getCenter();
      lat = center.lat();
      lon = center.lng();
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

  // Convert prospect lead to active client
  const handleConvertProspect = async (point: UnifiedMapPoint) => {
    setConvertingId(point.id);
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
        setProspects((prev) =>
          prev.map((p) => (p.id === point.id ? { ...p, isClient: true, markerColor: "green" } : p))
        );
        setSelectedPoint((prev) => (prev?.id === point.id ? { ...prev, isClient: true, markerColor: "green" } : prev));
      } else {
        alert(res.error || "Failed to convert prospect.");
      }
    });
  };

  // Place pulsing dot on user location
  const placePulsingDot = useCallback((map: any, lat: number, lng: number) => {
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
    if (userCircleRef.current) {
      userCircleRef.current.setMap(null);
      userCircleRef.current = null;
    }

    // Outer radar circle
    const circle = new window.google.maps.Circle({
      map,
      center: { lat, lng },
      radius: 120,
      fillColor: "#3b82f6",
      fillOpacity: 0.18,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.5,
      strokeWeight: 1.5,
    });
    userCircleRef.current = circle;

    // Center blue dot
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      title: "আপনি এখানে আছেন (My Location)",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: "#3b82f6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      zIndex: 9999,
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div style="padding: 6px 10px; font-family: inherit; color: #0f172a; font-size: 12px; font-weight: 600;">📍 আপনি এখানে আছেন</div>`,
    });

    infoWindow.addListener("closeclick", () => {
      if (activeInfoWindowRef.current === infoWindow) {
        activeInfoWindowRef.current = null;
      }
    });

    marker.addListener("click", () => {
      if (activeInfoWindowRef.current === infoWindow) {
        infoWindow.close();
        activeInfoWindowRef.current = null;
        return;
      }
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      activeInfoWindowRef.current = infoWindow;
      infoWindow.open(map, marker);
    });

    userMarkerRef.current = marker;
  }, []);

  // Fly to user's real location
  const handleLocateMe = () => {
    if (!mapInstanceRef.current || !window.google) return;
    if (!navigator.geolocation) {
      setLocationError("⚠️ Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const map = mapInstanceRef.current;
        if (!map) return;

        setUserLocation({ lat, lng });
        placePulsingDot(map, lat, lng);

        map.panTo({ lat, lng });
        map.setZoom(15);
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
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Road Route calculation with seamless failover
  // Calls real road routing action to compute genuine road geometry & ETA without hitting Google Legacy Directions API error
  const handleCalculateRoute = async (targetPoint?: UnifiedMapPoint) => {
    const pt = targetPoint || selectedPoint;
    if (!pt || !mapInstanceRef.current || !window.google) return;

    setSelectedPoint(pt);
    setIsRouting(true);

    const map = mapInstanceRef.current;
    const startLat = userLocation?.lat ?? 23.7405;
    const startLng = userLocation?.lng ?? 90.3846;
    const destLat = pt.latitude;
    const destLng = pt.longitude;

    // Clear previous polyline and renderer
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }

    try {
      // 1. Primary: Use real road routing service to draw road-following polyline
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

        // Parse coordinates into Google Maps LatLng
        const coords: { lat: number; lng: number }[] = [];
        const geom = res.geojson.geometry;
        if (geom.type === "LineString") {
          geom.coordinates.forEach((p: [number, number]) => {
            coords.push({ lat: p[1], lng: p[0] });
          });
        } else if (geom.type === "MultiLineString") {
          geom.coordinates.forEach((line: [number, number][]) => {
            line.forEach((p) => coords.push({ lat: p[1], lng: p[0] }));
          });
        }

        // Draw genuine road Polyline on Google Map
        const polyline = new window.google.maps.Polyline({
          path: coords,
          geodesic: true,
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });
        routePolylineRef.current = polyline;

        // Fit Google Map bounds to show route perfectly
        const bounds = new window.google.maps.LatLngBounds();
        coords.forEach((c) => bounds.extend(c));
        bounds.extend({ lat: startLat, lng: startLng });
        bounds.extend({ lat: destLat, lng: destLng });
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        return;
      }
    } catch (err: any) {
      console.warn("Server road route had issue, checking DirectionsService fallback...", err);
    }

    // 2. Secondary fallback: Attempt Google DirectionsService
    try {
      if (window.google.maps.DirectionsService) {
        const directionsService = new window.google.maps.DirectionsService();
        if (!directionsRendererRef.current) {
          directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            map,
            suppressMarkers: false,
          });
        } else {
          directionsRendererRef.current.setMap(map);
        }

        directionsService.route(
          {
            origin: { lat: startLat, lng: startLng },
            destination: { lat: destLat, lng: destLng },
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result: any, status: any) => {
            if (status === window.google.maps.DirectionsStatus.OK) {
              directionsRendererRef.current.setDirections(result);
              const leg = result.routes[0].legs[0];
              setRouteInfo({
                distanceKm: Math.round((leg.distance.value / 1000) * 10) / 10,
                durationMin: Math.round(leg.duration.value / 60),
              });
            } else {
              alert(`Could not calculate route: ${status}. To use Google's native Directions, please enable "Directions API" in your Google Cloud Console.`);
            }
          }
        );
      }
    } catch (err: any) {
      alert("Route error: " + err.message);
    } finally {
      setIsRouting(false);
    }
  };

  const handleClearRoute = () => {
    setRouteInfo(null);
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  };

  // Helper: Create custom Google Map pin icon (🟢 green check vs 🔴 red category emoji)
  const getMarkerIcon = (isGreen: boolean, category: string) => {
    const catLower = category.toLowerCase();
    const icon = isGreen
      ? "✓"
      : catLower.includes("hotel") || catLower.includes("accommodation")
      ? "🏨"
      : catLower.includes("parlour") || catLower.includes("salon") || catLower.includes("beauty") || catLower.includes("hair")
      ? "💇"
      : catLower.includes("cafe")
      ? "☕"
      : "🍽️";

    const color = isGreen ? "#10b981" : "#ef4444";
    const size = isGreen ? 28 : 26;
    const radius = isGreen ? 12 : 11;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
        <text x="${size / 2}" y="${size / 2 + (isGreen ? 4 : 4)}" font-size="${isGreen ? 12 : 11}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, sans-serif">${icon}</text>
      </svg>
    `;

    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.trim()),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2),
    };
  };

  // Initialize Google Map
  useEffect(() => {
    window.initGoogleMapCallback = () => {
      if (!window.google || !mapContainerRef.current || mapInstanceRef.current) return;

      const dhakaCenter = { lat: 23.7405, lng: 90.3846 };
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: dhakaCenter,
        zoom: 13,
        mapId: mapId || "DEMO_MAP_ID",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Close any active info window when clicking map background
      map.addListener("click", () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
          activeInfoWindowRef.current = null;
        }
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Check user location on initial load
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserLocation({ lat, lng });
            placePulsingDot(map, lat, lng);
            map.setCenter({ lat, lng });
            handleScanArea(lat, lng);
          },
          () => {
            handleScanArea(23.7405, 90.3846);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        handleScanArea(23.7405, 90.3846);
      }
    };

    if (window.google?.maps && mapContainerRef.current && !mapInstanceRef.current) {
      window.initGoogleMapCallback();
    }
  }, [mapId, placePulsingDot]);

  // Render company markers on Google Map with rich interactive single popup
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;

    // Clear old markers & active popup
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }

    const map = mapInstanceRef.current;

    displayedPoints.forEach((pt) => {
      const isGreen = pt.markerColor === "green";
      const iconConfig = getMarkerIcon(isGreen, pt.category);

      const marker = new window.google.maps.Marker({
        position: { lat: pt.latitude, lng: pt.longitude },
        map,
        title: isGreen
          ? `${pt.name} (🟢 Ordered - ${pt.orderCount} Orders)`
          : `${pt.name} (🔴 0 Orders - Hospitality Lead)`,
        icon: iconConfig,
      });

      // Build InfoWindow HTML
      // Rule: For red pins, omit the Hospitality Prospect badge completely!
      // For green pins, keep the Ordered Client badge!
      // Note: Google's default close button (.gm-ui-hover-effect) is hidden via CSS,
      // so we inject our own custom close button inside the content.
      const infoContent = `
        <div style="position: relative; padding: 14px 16px 14px 16px; font-family: inherit; color: #0f172a; min-width: 230px; max-width: 270px; box-sizing: border-box;">
          <!-- Custom close button -->
          <button
            id="google-close-btn-${pt.id}"
            type="button"
            style="position: absolute; top: 10px; right: 10px; width: 24px; height: 24px; border-radius: 50%; background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; font-size: 14px; line-height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; outline: none; box-shadow: 0 1px 3px rgba(0,0,0,0.08); transition: all 0.18s ease; z-index: 2;"
            onmouseenter="this.style.background='#fee2e2';this.style.borderColor='#fca5a5';this.style.color='#dc2626';"
            onmouseleave="this.style.background='#f1f5f9';this.style.borderColor='#e2e8f0';this.style.color='#64748b';"
          >✕</button>
          <!-- Business name -->
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 4px; padding-right: 28px; line-height: 1.35; color: #0f172a;">${pt.name}</div>
          <!-- Category & address -->
          <div style="font-size: 11.5px; color: #64748b; margin-bottom: ${isGreen ? "9px" : "12px"}; line-height: 1.5;">
            ${pt.category} • ${pt.address}
          </div>
          ${
            isGreen
              ? `<div style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; font-size: 11px; font-weight: 700; border-radius: 9999px; margin-bottom: 11px; background: rgba(16, 185, 129, 0.12); color: #047857; border: 1px solid rgba(16,185,129,0.2);">
                  🟢 Ordered Client (${pt.orderCount} Order${pt.orderCount > 1 ? "s" : ""})
                </div>`
              : ""
          }
          <!-- Route button -->
          <button
            id="google-route-btn-${pt.id}"
            type="button"
            style="width: 100%; padding: 8px 12px; background: #2563eb; color: #ffffff; border: none; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35); transition: background 0.15s ease;"
            onmouseenter="this.style.background='#1d4ed8';"
            onmouseleave="this.style.background='#2563eb';"
          >
            <span>🚗</span><span>Route ETA from My Location</span>
          </button>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent,
        maxWidth: 280,
      });

      infoWindow.addListener("closeclick", () => {
        if (activeInfoWindowRef.current === infoWindow) {
          activeInfoWindowRef.current = null;
        }
      });

      marker.addListener("click", () => {
        // 1. If clicking the currently open popup, toggle it closed
        if (activeInfoWindowRef.current === infoWindow) {
          infoWindow.close();
          activeInfoWindowRef.current = null;
          return;
        }

        // 2. Close any other active popup immediately
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
          activeInfoWindowRef.current = null;
        }

        // 3. Open this marker's popup
        activeInfoWindowRef.current = infoWindow;
        infoWindow.open(map, marker);
        setSelectedPoint(pt);

        // 4. Attach click listeners to buttons inside the InfoWindow once DOM is ready
        window.google.maps.event.addListenerOnce(infoWindow, "domready", () => {
          // Wire up custom close button
          const closeBtn = document.getElementById(`google-close-btn-${pt.id}`);
          if (closeBtn) {
            closeBtn.onclick = (e) => {
              e.stopPropagation();
              infoWindow.close();
              if (activeInfoWindowRef.current === infoWindow) {
                activeInfoWindowRef.current = null;
              }
            };
          }
          // Wire up route button
          const btn = document.getElementById(`google-route-btn-${pt.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation();
              // Auto close popup immediately when road route is computed
              infoWindow.close();
              if (activeInfoWindowRef.current === infoWindow) {
                activeInfoWindowRef.current = null;
              }
              handleCalculateRoute(pt);
            };
          }
        });
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, displayedPoints]);

  return (
    <div className="space-y-4 animate-fade-in">
      {apiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapCallback&libraries=places,geometry`}
          strategy="afterInteractive"
        />
      )}

      {/* Provider Switcher Bar */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
              Map Provider: Google Maps JavaScript API
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete feature parity: Green (Orders ≥ 1), Red (0 Orders), live road routing, prospect conversion, and location dot.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/map/geoapify"
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-all"
          >
            ← Switch to Geoapify / MapLibre
          </Link>
          <button className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm cursor-default">
            Google Maps (Active)
          </button>
        </div>
      </div>

      {/* Universal Shared Filters */}
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

          {!apiKey && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-md p-6 sm:p-8 text-center space-y-4 z-30">
              <span className="text-4xl">🔑</span>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
                Google Maps API Key Required
              </h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Add <code className="text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-100 dark:border-transparent">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{" "}
                <code className="text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-100 dark:border-transparent">.env.local</code> to render Google Map tiles.
              </p>
              <Link
                href="/dashboard/map/geoapify"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                Switch to Working Geoapify / MapLibre Map →
              </Link>
            </div>
          )}

          {/* Floating Action Button: Scan Current Area */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => handleScanArea()}
              disabled={isScanning}
              className="px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Query hospitality businesses in the currently viewed map location"
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
