"use client";

import { MapBusiness, RestaurantProspect, calculateGeoapifyRoute, fetchLiveRestaurantProspects } from "@/actions/map";
import { restoreBusiness } from "@/actions/businesses";
import { getDistrictCoordinates } from "@/lib/district-resolver";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import AddBusinessFromMapModal, { MapPointPreset } from "./AddBusinessFromMapModal";
import RestoreBusinessFromMapModal from "./RestoreBusinessFromMapModal";
import BusinessMapFilters, { MapFiltersState, UnifiedMapPoint } from "./BusinessMapFilters";

declare global {
  interface Window {
    google: any;
    initGoogleMapCallback: () => void;
  }
}

interface GoogleMapProps {
  initialBusinesses: MapBusiness[];
  initialProspects?: RestaurantProspect[];
  categories: string[];
  districts: string[];
  areas: string[];
  apiKey?: string;
  mapId?: string;
  focusId?: string;
  canAddBusiness?: boolean;
}

export { type UnifiedMapPoint } from "./BusinessMapFilters";

function buildGoogleInfoWindowHtml(pt: UnifiedMapPoint, closeBtnId: string, routeBtnId: string) {
  const isGreen = pt.markerColor === "green";
  const isGray = pt.markerColor === "gray" || pt.isArchived;
  return `
    <div class="map-popup-inner" style="position:relative;">
      <!-- Custom close button -->
      <button
        id="${closeBtnId}"
        type="button"
        class="map-popup-close-btn"
      >✕</button>
      <!-- Business name -->
      <div class="map-popup-title">${pt.name}</div>
      <!-- Category & address -->
      <div class="map-popup-sub" style="margin-bottom:${isGreen || isGray ? "9px" : "12px"}">
        ${pt.category} • ${pt.address}
      </div>
      ${
        isGreen
          ? `<div class="map-popup-badge" style="margin-bottom:8px;">
              🟢 Ordered Client (${pt.orderCount} Order${pt.orderCount > 1 ? "s" : ""})
            </div>`
          : isGray
          ? `<div class="map-popup-badge-gray" style="margin-bottom:8px; display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:600; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">
              📁 Archived Client (${pt.orderCount || 0} Past Orders)
            </div>`
          : `<div class="map-popup-badge-red" style="margin-bottom:8px;">
              🔴 Lead / Prospect (0 Orders)
            </div>`
      }
      <!-- Route button -->
      <button
        id="${routeBtnId}"
        type="button"
        style="width: 100%; padding: 8px 12px; background: #2563eb; color: #ffffff; border: none; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35); transition: background 0.15s ease; margin-top: 4px;"
        onmouseenter="this.style.background='#1d4ed8';"
        onmouseleave="this.style.background='#2563eb';"
      >
        <span>🚗</span><span>Route ETA from My Location</span>
      </button>
    </div>
  `;
}

export default function GoogleMapClient({
  initialBusinesses,
  initialProspects,
  categories,
  districts,
  areas,
  apiKey,
  mapId,
  focusId,
  canAddBusiness = true,
}: GoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const clientMarkersRef = useRef<any[]>([]);
  const prospectMarkersRef = useRef<any[]>([]);
  const activeInfoWindowRef = useRef<any>(null);
  const singleInfoWindowRef = useRef<any>(null);
  const iconCacheRef = useRef<Map<string, any>>(new Map());
  const markersMapRef = useRef<Map<string, { marker: any; point: UnifiedMapPoint }>>(new Map());
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const pendingSelectedPointIdRef = useRef<string | null>(null);
  const currentOpenPointIdRef = useRef<string | null>(null);
  const flightAnimationRef = useRef<number | null>(null);

  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoringTarget, setRestoringTarget] = useState<UnifiedMapPoint | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<UnifiedMapPoint | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  // Live Prospects / Leads State (Red Markers)
  const [prospects, setProspects] = useState<RestaurantProspect[]>(initialProspects || []);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Add business from map modal preset
  const [addFromMapPreset, setAddFromMapPreset] = useState<MapPointPreset | null>(null);
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

  // Prospect points transformed to unified points (Red or Gray Markers)
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
        isClient: !p.isArchived && p.isClient,
        isArchived: p.isArchived,
        orderCount: p.orderCount || 0,
        markerColor: p.isArchived ? ("gray" as const) : ("red" as const),
        externalPlaceId: p.id,
      }));
  }, [prospects]);

  // Combined candidate points strictly filtered by non-search filters (Category, District, Marker Color)
  // These are both rendered on the map and used for search autocomplete suggestions!
  const candidatePoints = useMemo(() => {
    const combined = [...clientPoints, ...prospectPoints];
    return combined.filter((pt) => {
      // Order color filter
      if (filters.orderColor === "GREEN" && pt.markerColor !== "green") return false;
      if (filters.orderColor === "GRAY" && pt.markerColor !== "gray") return false;
      if (filters.orderColor === "RED" && pt.markerColor !== "red") return false;

      // Category filter
      if (
        filters.category !== "ALL" &&
        !pt.category.toLowerCase().includes(filters.category.toLowerCase())
      ) {
        return false;
      }

      // District filter: only apply to DB clients — prospect/red markers are geo-scanned
      // around the district center so they naturally belong there; hardcoded district field
      // on them is always "Dhaka" regardless of where they are.
      if (filters.district !== "ALL" && pt.isClient && pt.district !== filters.district) {
        return false;
      }

      return true;
    });
  }, [clientPoints, prospectPoints, filters.orderColor, filters.category, filters.district]);

  // Points displayed on map (respects the active combined filters)
  const displayedPoints = candidatePoints;

  const greenCount = displayedPoints.filter((p) => p.markerColor === "green").length;
  const grayCount = displayedPoints.filter((p) => p.markerColor === "gray").length;
  const redCount = displayedPoints.filter((p) => p.markerColor === "red").length;
  const unlocatedClients = initialBusinesses.filter((b) => b.latitude == null || b.longitude == null);

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

    // Crisp native blue location dot (no semi-transparent overlay circle)
    const marker = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      title: "আপনি এখানে আছেন (My Location)",
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#2563eb",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2.5,
      },
      zIndex: 9999,
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `<div class="map-popup-inner" style="min-width:auto;padding:6px 10px;"><span style="font-size:12px;font-weight:600;">📍 আপনি এখানে আছেন</span></div>`,
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

  // Smooth cinematic flyTo animation for Google Maps (matches MapLibre flyTo experience)
  const flyToGoogleMap = useCallback(
    (
      map: any,
      targetLat: number,
      targetLng: number,
      targetZoom: number = 16,
      options?: {
        duration?: number;
        onComplete?: () => void;
      }
    ) => {
      if (!map || !window.google) return;

      // Cancel any running flight animation
      if (flightAnimationRef.current !== null) {
        cancelAnimationFrame(flightAnimationRef.current);
        flightAnimationRef.current = null;
      }

      const startCenter = map.getCenter();
      if (!startCenter) {
        map.setCenter({ lat: targetLat, lng: targetLng });
        map.setZoom(targetZoom);
        options?.onComplete?.();
        return;
      }

      const startLat = startCenter.lat();
      const startLng = startCenter.lng();
      const startZoom = typeof map.getZoom === "function" ? map.getZoom() : 14;

      const dLat = targetLat - startLat;
      const dLng = targetLng - startLng;
      const distanceDeg = Math.sqrt(dLat * dLat + dLng * dLng);

      // If already at the exact spot and zoom, complete immediately
      if (distanceDeg < 0.00005 && Math.abs(targetZoom - startZoom) < 0.3) {
        options?.onComplete?.();
        return;
      }

      // Dynamic duration based on travel distance (600ms - 1300ms)
      const duration =
        options?.duration ||
        (distanceDeg > 0.3 ? 1250 : distanceDeg > 0.05 ? 950 : 650);

      // Parabolic zoom curve: zoom out slightly mid-flight for bird's-eye perspective (like MapLibre)
      const isFar = distanceDeg > 0.015;
      const minZoom = Math.min(startZoom, targetZoom);
      let dipZoom = minZoom;
      if (distanceDeg > 0.4) {
        dipZoom = Math.max(7, minZoom - 4);
      } else if (distanceDeg > 0.1) {
        dipZoom = Math.max(9, minZoom - 2.5);
      } else if (isFar) {
        dipZoom = Math.max(11, minZoom - 1.5);
      }

      const startTime = performance.now();

      // Smooth cubic ease-in-out curve
      const easeInOutCubic = (t: number) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeInOutCubic(progress);

        const curLat = startLat + dLat * ease;
        const curLng = startLng + dLng * ease;

        let curZoom = startZoom + (targetZoom - startZoom) * ease;
        if (isFar) {
          if (progress < 0.5) {
            const p = easeInOutCubic(progress * 2);
            curZoom = startZoom + (dipZoom - startZoom) * p;
          } else {
            const p = easeInOutCubic((progress - 0.5) * 2);
            curZoom = dipZoom + (targetZoom - dipZoom) * p;
          }
        }

        if (typeof map.moveCamera === "function") {
          map.moveCamera({
            center: { lat: curLat, lng: curLng },
            zoom: curZoom,
          });
        } else {
          map.setCenter({ lat: curLat, lng: curLng });
          map.setZoom(Math.round(curZoom));
        }

        if (progress < 1) {
          flightAnimationRef.current = requestAnimationFrame(animate);
        } else {
          flightAnimationRef.current = null;
          if (typeof map.moveCamera === "function") {
            map.moveCamera({ center: { lat: targetLat, lng: targetLng }, zoom: targetZoom });
          } else {
            map.setCenter({ lat: targetLat, lng: targetLng });
            map.setZoom(targetZoom);
          }
          options?.onComplete?.();
        }
      };

      flightAnimationRef.current = requestAnimationFrame(animate);
    },
    []
  );

  // Fly/pan to user's real location, reset filters, and scan 3km around (Scan Nearby Area)
  const handleLocateMe = () => {
    if (!mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    // Reset all filters so that all nearby client businesses and leads are visible
    setFilters({
      q: "",
      category: "ALL",
      district: "ALL",
      area: "ALL",
      orderColor: "ALL",
    });
    setRouteInfo(null);

    const executeLocateAndScan = (lat: number, lng: number) => {
      setUserLocation({ lat, lng });
      placePulsingDot(map, lat, lng);
      window.google.maps.event.trigger(map, "resize");
      flyToGoogleMap(map, lat, lng, 15, {
        onComplete: () => {
          handleScanArea(lat, lng, 3000);
        },
      });
    };

    if (userLocation) {
      executeLocateAndScan(userLocation.lat, userLocation.lng);
    }

    if (navigator.geolocation) {
      setIsLocating(true);
      setLocationError(null);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (!map) return;
          // Re-scan only if we didn't have userLocation or if moved by >50 meters
          if (!userLocation || Math.abs(userLocation.lat - lat) > 0.0005 || Math.abs(userLocation.lng - lng) > 0.0005) {
            executeLocateAndScan(lat, lng);
          } else {
            placePulsingDot(map, lat, lng);
          }
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
    } else if (!userLocation) {
      setLocationError("⚠️ Geolocation is not supported by your browser.");
    }
  };

  // Helper to execute Google / Geoapify road route calculation
  const executeGoogleRoute = async (startLat: number, startLng: number, pt: UnifiedMapPoint) => {
    const map = mapInstanceRef.current;
    if (!map || !window.google) return;

    setIsRouting(true);
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

        const polyline = new window.google.maps.Polyline({
          path: coords,
          geodesic: true,
          strokeColor: "#2563eb",
          strokeOpacity: 0.9,
          strokeWeight: 5,
          map,
        });
        routePolylineRef.current = polyline;

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

  // Road Route calculation starting from current user location
  const handleCalculateRoute = async (targetPoint?: UnifiedMapPoint) => {
    const pt = targetPoint || selectedPoint;
    if (!pt || !mapInstanceRef.current || !window.google) return;

    setSelectedPoint(pt);

    // If userLocation is already available, calculate directly from user's current location!
    if (userLocation) {
      executeGoogleRoute(userLocation.lat, userLocation.lng, pt);
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
          executeGoogleRoute(lat, lng, pt);
        },
        () => {
          const center = mapInstanceRef.current?.getCenter();
          const fallbackLat = center ? center.lat() : 23.7405;
          const fallbackLng = center ? center.lng() : 90.3846;
          executeGoogleRoute(fallbackLat, fallbackLng, pt);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      executeGoogleRoute(23.7405, 90.3846, pt);
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
        const entry = markersMapRef.current.get(target.id);
        if (entry && window.google) {
          entry.point.markerColor = "green";
          entry.point.isArchived = false;
          entry.point.isClient = true;
          entry.marker.setIcon(getMarkerIcon("green", entry.point.category));
          entry.marker.setTitle(`${target.name} (🟢 Ordered - ${entry.point.orderCount} Orders)`);
        }
        setRestoringTarget(null);
        router.refresh();
      }
    });
  };


  // Helper: Create custom Google Map pin icon (cached by markerColor + icon emoji)
  const getMarkerIcon = useCallback((markerColor: "green" | "red" | "gray", category: string) => {
    if (!window.google) return undefined;

    const isGreen = markerColor === "green";
    const isGray = markerColor === "gray";
    const catLower = category.toLowerCase();
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

    const cacheKey = `${markerColor}_${icon}`;
    if (iconCacheRef.current.has(cacheKey)) {
      return iconCacheRef.current.get(cacheKey);
    }

    const color = isGreen ? "#10b981" : isGray ? "#64748b" : "#ef4444";
    const size = isGreen ? 28 : 26;
    const radius = isGreen ? 12 : 11;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${color}" stroke="#ffffff" stroke-width="2.5"/>
        <text x="${size / 2}" y="${size / 2 + 4}" font-size="${isGreen ? 12 : 11}" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central" font-family="system-ui, -apple-system, sans-serif">${icon}</text>
      </svg>
    `;

    const iconObj = {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg.trim()),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2),
    };

    iconCacheRef.current.set(cacheKey, iconObj);
    return iconObj;
  }, []);

  // Initialize Google Map
  useEffect(() => {
    window.initGoogleMapCallback = () => {
      if (!window.google || !mapContainerRef.current || mapInstanceRef.current) return;

      const targetPoint = focusId ? initialBusinesses.find((b) => b.id === focusId) : null;
      const initialCenter =
        targetPoint && targetPoint.latitude != null && targetPoint.longitude != null
          ? { lat: Number(targetPoint.latitude), lng: Number(targetPoint.longitude) }
          : { lat: 23.7405, lng: 90.3846 };
      const initialZoom = targetPoint ? 16 : 13;

      const mapOptions: any = {
        center: initialCenter,
        zoom: initialZoom,
        isFractionalZoomEnabled: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      };
      if (mapId && mapId !== "DEMO_MAP_ID") {
        mapOptions.mapId = mapId;
      }

      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions);

      // Close any active info window when clicking map background
      map.addListener("click", () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
          activeInfoWindowRef.current = null;
        }
      });

      // Cancel running flight animation if user interacts / drags map
      map.addListener("dragstart", () => {
        if (flightAnimationRef.current !== null) {
          cancelAnimationFrame(flightAnimationRef.current);
          flightAnimationRef.current = null;
        }
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // Check user location on initial load and scan 3km around (only pan to user if no focusId)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setUserLocation({ lat, lng });
            placePulsingDot(map, lat, lng);
            if (!focusId) {
              flyToGoogleMap(map, lat, lng, 15, {
                onComplete: () => {
                  handleScanArea(lat, lng, 3000);
                },
              });
            }
          },
          () => {
            if (!focusId) {
              handleScanArea(23.7405, 90.3846, 3000);
            }
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else if (!focusId) {
        handleScanArea(23.7405, 90.3846, 3000);
      }
    };

    if (window.google?.maps && mapContainerRef.current && !mapInstanceRef.current) {
      window.initGoogleMapCallback();
    }
  }, [mapId, placePulsingDot, flyToGoogleMap]);

  // Single reusable InfoWindow opener with custom close & route listeners
  const openPointInfoWindow = useCallback(
    (pt: UnifiedMapPoint, marker: any, isDirectMarkerClick: boolean = false) => {
      if (!mapInstanceRef.current || !window.google) return;
      const map = mapInstanceRef.current;

      // 1. Toggle off ONLY when directly clicking the map pin that is already open
      if (isDirectMarkerClick && activeInfoWindowRef.current && currentOpenPointIdRef.current === pt.id) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
        currentOpenPointIdRef.current = null;
        return;
      }

      // 2. Close any other open popup
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }

      // 3. Ensure single InfoWindow instance exists
      if (!singleInfoWindowRef.current) {
        singleInfoWindowRef.current = new window.google.maps.InfoWindow({
          maxWidth: 280,
          disableAutoPan: false,
        });
        singleInfoWindowRef.current.addListener("closeclick", () => {
          activeInfoWindowRef.current = null;
          currentOpenPointIdRef.current = null;
        });
      }

      const infoWindow = singleInfoWindowRef.current;
      const sanitizedId = pt.id.replace(/[^a-zA-Z0-9_-]/g, "_");
      const closeBtnId = `google-close-btn-${sanitizedId}`;
      const routeBtnId = `google-route-btn-${sanitizedId}`;
      const infoContent = buildGoogleInfoWindowHtml(pt, closeBtnId, routeBtnId);

      infoWindow.setContent(infoContent);

      if (marker) {
        marker.setVisible(true);
        if (!marker.getMap()) {
          marker.setMap(map);
        }
      }

      infoWindow.setPosition({ lat: pt.latitude, lng: pt.longitude });

      if (marker) {
        infoWindow.open({
          map,
          anchor: marker,
          shouldFocus: false,
        });
      } else {
        infoWindow.open({
          map,
          shouldFocus: false,
        });
      }

      activeInfoWindowRef.current = infoWindow;
      currentOpenPointIdRef.current = pt.id;
      setSelectedPoint(pt);

      window.google.maps.event.addListenerOnce(infoWindow, "domready", () => {
        const closeBtn = document.getElementById(closeBtnId);
        if (closeBtn) {
          closeBtn.onclick = (e) => {
            e.stopPropagation();
            infoWindow.close();
            if (activeInfoWindowRef.current === infoWindow) {
              activeInfoWindowRef.current = null;
              currentOpenPointIdRef.current = null;
            }
          };
        }
        const btn = document.getElementById(routeBtnId);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            infoWindow.close();
            if (activeInfoWindowRef.current === infoWindow) {
              activeInfoWindowRef.current = null;
              currentOpenPointIdRef.current = null;
            }
            handleCalculateRoute(pt);
          };
        }
      });
    },
    [handleCalculateRoute]
  );

  // Render / sync green DB client markers (created once, updated only when clientPoints change)
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    // Clear old client markers
    clientMarkersRef.current.forEach((m) => m.setMap(null));
    clientMarkersRef.current = [];

    // Remove client point keys from markersMapRef
    for (const [key, val] of markersMapRef.current.entries()) {
      if (val.point.isClient) {
        markersMapRef.current.delete(key);
      }
    }

    clientPoints.forEach((pt) => {
      const iconConfig = getMarkerIcon("green", pt.category);
      const marker = new window.google.maps.Marker({
        position: { lat: pt.latitude, lng: pt.longitude },
        map,
        title: `${pt.name} (🟢 Ordered - ${pt.orderCount} Orders)`,
        icon: iconConfig,
        zIndex: 100, // Client markers always stay on top of prospect pins
      });
      (marker as any).__pointId = pt.id;

      marker.addListener("click", () => {
        openPointInfoWindow(pt, marker, true);
      });

      clientMarkersRef.current.push(marker);
      markersMapRef.current.set(pt.id, { marker, point: pt });
    });
  }, [mapLoaded, clientPoints, getMarkerIcon, openPointInfoWindow]);

  // Render / sync red live prospect and gray archived markers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    const currentIds = new Set(prospectPoints.map((p) => p.id));

    // Clear only prospect markers that are no longer in prospectPoints AND not currently active in popup
    const remainingMarkers: any[] = [];
    prospectMarkersRef.current.forEach((m) => {
      const ptId = (m as any).__pointId;
      if (ptId && !currentIds.has(ptId) && ptId !== currentOpenPointIdRef.current) {
        m.setMap(null);
        markersMapRef.current.delete(ptId);
      } else {
        remainingMarkers.push(m);
      }
    });
    prospectMarkersRef.current = remainingMarkers;

    prospectPoints.forEach((pt) => {
      const existing = markersMapRef.current.get(pt.id);
      if (!existing) {
        const iconConfig = getMarkerIcon(pt.markerColor, pt.category);
        const marker = new window.google.maps.Marker({
          position: { lat: pt.latitude, lng: pt.longitude },
          map,
          title:
            pt.markerColor === "gray"
              ? `${pt.name} (📁 Archived - ${pt.orderCount} Past Orders)`
              : `${pt.name} (🔴 0 Orders - Hospitality Lead)`,
          icon: iconConfig,
          zIndex: pt.markerColor === "gray" ? 50 : 10,
        });
        (marker as any).__pointId = pt.id;

        marker.addListener("click", () => {
          openPointInfoWindow(pt, marker, true);
        });

        prospectMarkersRef.current.push(marker);
        markersMapRef.current.set(pt.id, { marker, point: pt });
      } else {
        (existing.marker as any).__pointId = pt.id;
        if (!existing.marker.getMap()) {
          existing.marker.setMap(map);
        }
      }
    });
  }, [mapLoaded, prospectPoints, getMarkerIcon, openPointInfoWindow]);

  // Instantly toggle marker visibility based on active filters (fast, no re-instantiation!)
  useEffect(() => {
    if (!mapLoaded) return;

    markersMapRef.current.forEach(({ marker, point: pt }) => {
      let isVisible = true;

      // Order color filter
      if (filters.orderColor === "GREEN" && pt.markerColor !== "green") isVisible = false;
      if (filters.orderColor === "GRAY" && pt.markerColor !== "gray") isVisible = false;
      if (filters.orderColor === "RED" && pt.markerColor !== "red") isVisible = false;

      // Category filter
      if (
        filters.category !== "ALL" &&
        !pt.category.toLowerCase().includes(filters.category.toLowerCase())
      ) {
        isVisible = false;
      }

      // District filter (only applies to DB clients)
      if (filters.district !== "ALL" && pt.isClient && pt.district !== filters.district) {
        isVisible = false;
      }

      marker.setVisible(isVisible);

      if (!isVisible && activeInfoWindowRef.current && currentOpenPointIdRef.current === pt.id) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
        currentOpenPointIdRef.current = null;
      }
    });
  }, [mapLoaded, filters]);

  // Auto-open InfoWindow when focusId or search dropdown item is selected
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    const targetId = pendingSelectedPointIdRef.current || (focusId ? focusId : null);
    if (!targetId) return;

    const entry = markersMapRef.current.get(targetId);
    if (entry) {
      entry.marker.setVisible(true);
      flyToGoogleMap(map, entry.point.latitude, entry.point.longitude, 16, {
        onComplete: () => {
          openPointInfoWindow(entry.point, entry.marker, false);
        },
      });
      pendingSelectedPointIdRef.current = null;
    }
  }, [mapLoaded, focusId, prospectPoints, openPointInfoWindow, flyToGoogleMap]);

  // Focus on business selected from search dropdown & open its InfoWindow
  const handleSelectBusinessFromSearch = useCallback(
    (pt: UnifiedMapPoint) => {
      if (!mapInstanceRef.current || !window.google) return;
      const map = mapInstanceRef.current;

      // Always update sidebar immediately
      setSelectedPoint(pt);

      // Reset any active filters that would hide this business
      setFilters((prev) => {
        const next = { ...prev };
        let changed = false;
        if (pt.isClient && prev.district !== "ALL" && pt.district !== prev.district) {
          next.district = "ALL";
          changed = true;
        }
        if (prev.orderColor === "GREEN" && pt.markerColor !== "green") {
          next.orderColor = "ALL";
          changed = true;
        }
        if (prev.orderColor === "GRAY" && pt.markerColor !== "gray") {
          next.orderColor = "ALL";
          changed = true;
        }
        if (prev.orderColor === "RED" && pt.markerColor !== "red") {
          next.orderColor = "ALL";
          changed = true;
        }
        if (prev.category !== "ALL" && !pt.category.toLowerCase().includes(prev.category.toLowerCase())) {
          next.category = "ALL";
          changed = true;
        }
        return changed ? next : prev;
      });

      // Check if marker already exists by id OR by close coordinates
      let record = markersMapRef.current.get(pt.id);
      if (!record) {
        for (const entry of markersMapRef.current.values()) {
          if (
            Math.abs(entry.point.latitude - pt.latitude) < 0.0001 &&
            Math.abs(entry.point.longitude - pt.longitude) < 0.0001
          ) {
            record = entry;
            break;
          }
        }
      }

      if (!record) {
        // Business doesn't have a rendered marker yet.
        // Instantiate marker immediately on Google Map so user gets instant response
        const iconConfig = getMarkerIcon(pt.markerColor, pt.category);
        const newMarker = new window.google.maps.Marker({
          position: { lat: pt.latitude, lng: pt.longitude },
          map,
          title:
            pt.markerColor === "green"
              ? `${pt.name} (🟢 Ordered - ${pt.orderCount} Orders)`
              : pt.markerColor === "gray"
              ? `${pt.name} (📁 Archived - ${pt.orderCount} Past Orders)`
              : `${pt.name} (🔴 0 Orders - Hospitality Lead)`,
          icon: iconConfig,
          zIndex: pt.markerColor === "green" ? 100 : pt.markerColor === "gray" ? 50 : 10,
        });
        (newMarker as any).__pointId = pt.id;

        newMarker.addListener("click", () => {
          openPointInfoWindow(pt, newMarker, true);
        });

        markersMapRef.current.set(pt.id, { marker: newMarker, point: pt });
        record = { marker: newMarker, point: pt };

        if (pt.isClient) {
          clientMarkersRef.current.push(newMarker);
        } else {
          prospectMarkersRef.current.push(newMarker);
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

      pendingSelectedPointIdRef.current = null;
      record.marker.setVisible(true);

      // Smooth cinematic fly to destination, then open InfoWindow
      flyToGoogleMap(map, pt.latitude, pt.longitude, 16, {
        onComplete: () => {
          if (record?.marker) {
            record.marker.setVisible(true);
            openPointInfoWindow(record.point, record.marker, false);
          }
        },
      });
    },
    [getMarkerIcon, openPointInfoWindow, flyToGoogleMap]
  );

  // Filter change handler — intercepts district changes to pan Google Map to district center
  const handleFiltersChange = useCallback((newFilters: MapFiltersState) => {
    setFilters(newFilters);

    // When district changes: fly Google Map to district center & scan nearby prospects
    if (newFilters.district !== filters.district && newFilters.district !== "ALL") {
      const coords = getDistrictCoordinates(newFilters.district);
      if (coords && mapInstanceRef.current) {
        flyToGoogleMap(mapInstanceRef.current, coords.lat, coords.lng, 12, {
          onComplete: () => {
            handleScanArea(coords.lat, coords.lng, 8000);
          },
        });
      }
    }
  }, [filters.district, flyToGoogleMap]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 animate-fade-in">
      {apiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapCallback&libraries=places,geometry`}
          strategy="afterInteractive"
        />
      )}

      {/* Universal Shared Filters with Autocomplete Dropdown */}
      <BusinessMapFilters
        filters={filters}
        onChange={handleFiltersChange}
        categories={categories}
        districts={districts}
        areas={areas}
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

          {/* Floating Action Button: Scan Nearby Area */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            <button
              onClick={handleLocateMe}
              disabled={isScanning || isLocating}
              className="px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xl backdrop-blur-md text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Pan to your current location and scan 3km nearby area"
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
            <div className="px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-md flex items-center gap-3 text-[11px] font-semibold">
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
                      onClick={() =>
                        setAddFromMapPreset({
                          name: selectedPoint.name,
                          category: selectedPoint.category,
                          address: selectedPoint.address,
                          area: selectedPoint.area,
                          district: selectedPoint.district,
                          latitude: selectedPoint.latitude,
                          longitude: selectedPoint.longitude,
                          phoneRaw: selectedPoint.phoneRaw,
                        })
                      }
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
                  Click any <strong className="text-emerald-600">Green</strong>, <strong className="text-slate-500">Gray</strong>, or <strong className="text-rose-600">Red</strong> pin to inspect the business. Red pins can be converted to a client.
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
