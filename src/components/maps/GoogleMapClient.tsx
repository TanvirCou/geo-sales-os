"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Script from "next/script";
import Link from "next/link";
import BusinessMapFilters, { MapFiltersState } from "./BusinessMapFilters";
import { MapBusiness } from "@/actions/map";

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
  const directionsRendererRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<MapBusiness | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  // Filters
  const [filters, setFilters] = useState<MapFiltersState>({
    q: "",
    category: "ALL",
    district: "ALL",
    area: "ALL",
    orderColor: "ALL",
  });

  const filteredBusinesses = useMemo(() => {
    return initialBusinesses.filter((b) => {
      if (filters.category !== "ALL" && b.category !== filters.category) return false;
      if (filters.district !== "ALL" && b.district !== filters.district) return false;
      if (filters.area !== "ALL" && b.area !== filters.area) return false;

      if (filters.orderColor === "GREEN" && b.markerColor !== "green") return false;
      if (filters.orderColor === "RED" && b.markerColor !== "red") return false;

      if (filters.q) {
        const query = filters.q.toLowerCase();
        const matchName = b.name.toLowerCase().includes(query);
        const matchPhone = b.phoneRaw?.toLowerCase().includes(query) || false;
        const matchArea = b.area?.toLowerCase().includes(query) || false;
        if (!matchName && !matchPhone && !matchArea) return false;
      }

      return true;
    });
  }, [initialBusinesses, filters]);

  const located = filteredBusinesses.filter((b) => b.isLocated);
  const unlocated = filteredBusinesses.filter((b) => !b.isLocated);
  const greenCount = filteredBusinesses.filter((b) => b.markerColor === "green").length;
  const redCount = filteredBusinesses.filter((b) => b.markerColor === "red").length;

  // Initialize Google Map
  useEffect(() => {
    window.initGoogleMapCallback = () => {
      if (!window.google || !mapContainerRef.current) return;

      const dhakaCenter = { lat: 23.7650, lng: 90.3995 };
      const map = new window.google.maps.Map(mapContainerRef.current, {
        center: dhakaCenter,
        zoom: 12,
        mapId: mapId || "DEMO_MAP_ID",
      });

      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: false,
      });

      mapInstanceRef.current = map;
      setMapLoaded(true);
    };

    if (window.google?.maps && mapContainerRef.current && !mapInstanceRef.current) {
      window.initGoogleMapCallback();
    }
  }, [mapId]);

  // Render company markers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.google) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;

    located.forEach((b) => {
      if (b.latitude == null || b.longitude == null) return;

      const isGreen = b.markerColor === "green";
      const marker = new window.google.maps.Marker({
        position: { lat: b.latitude, lng: b.longitude },
        map,
        title: b.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: isGreen ? "#22c55e" : "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2.5,
        },
      });

      const infoContent = `
        <div style="padding: 6px; font-family: sans-serif; color: #0f172a; max-width: 220px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">${b.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${b.category || "General"} • ${b.area || "Dhaka"}
          </div>
          <div style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: 600; border-radius: 4px; background: ${
            isGreen ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"
          }; color: ${isGreen ? "#15803d" : "#b91c1c"}; margin-bottom: 8px;">
            ${isGreen ? "🟢 Order recorded" : "🔴 No order recorded"} (${b.orderCount} orders)
          </div>
          <div>
            <a href="/dashboard/businesses/${b.id}" style="font-size: 11px; font-weight: 600; color: #2563eb; text-decoration: none;">
              View Details →
            </a>
          </div>
        </div>
      `;

      const infoWindow = new window.google.maps.InfoWindow({ content: infoContent });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
        setSelectedBusiness(b);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, located]);

  // In-page Google route calculation
  const handleCalculateRoute = () => {
    if (!selectedBusiness || selectedBusiness.latitude == null || selectedBusiness.longitude == null) return;

    if (!window.google?.maps?.DirectionsService) {
      // Offline fallback approximation
      const startLng = 90.3928;
      const startLat = 23.7508;
      const toRad = (x: number) => (x * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(selectedBusiness.latitude - startLat);
      const dLon = toRad(selectedBusiness.longitude - startLng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(startLat)) * Math.cos(toRad(selectedBusiness.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = Math.round(R * c * 1.3 * 10) / 10;
      setRouteInfo({ distanceKm: dist, durationMin: Math.round((dist / 18) * 60) });
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    const origin = { lat: 23.7508, lng: 90.3928 }; // Farmgate Hub
    const destination = { lat: selectedBusiness.latitude, lng: selectedBusiness.longitude };

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result: any, status: any) => {
        if (status === window.google.maps.DirectionsStatus.OK && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
          const leg = result.routes[0].legs[0];
          setRouteInfo({
            distanceKm: Math.round((leg.distance.value / 1000) * 10) / 10,
            durationMin: Math.round(leg.duration.value / 60),
          });
        }
      }
    );
  };

  return (
    <div>
      {apiKey && (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMapCallback&libraries=places,marker`}
          async
          defer
        />
      )}

      {/* Provider Switcher Bar */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
              Map Provider: Google Maps JavaScript API
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phase 4 live map. Uses exact same PostgreSQL records and Green/Red rules as Geoapify.
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
          <button className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm">
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
          total: filteredBusinesses.length,
          located: located.length,
          unlocated: unlocated.length,
          green: greenCount,
          red: redCount,
        }}
      />

      {/* Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 min-h-[500px]">
        <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-lg min-h-[400px] sm:min-h-[500px]">
          <div
            ref={mapContainerRef}
            className="w-full h-full min-h-[400px] sm:min-h-[500px] bg-slate-200 dark:bg-slate-900"
          />

          {!apiKey && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-md p-6 sm:p-8 text-center space-y-4">
              <span className="text-4xl">🔑</span>
              <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
                Google Maps API Key Required
              </h3>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-md">
                Add <code className="text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-100 dark:border-transparent">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{" "}
                <code className="text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-100 dark:border-transparent">.env.local</code> to render Google JS Map tiles and Routes.
                Meanwhile, <strong className="text-slate-800 dark:text-slate-200">MapLibre + Geoapify (Phase 5)</strong> is fully active with OSM tiles.
              </p>
              <Link
                href="/dashboard/map/geoapify"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                Switch to Working Geoapify / MapLibre Map →
              </Link>
            </div>
          )}

          {routeInfo && (
            <div className="absolute top-4 left-4 right-4 sm:right-auto z-10 p-4 rounded-xl bg-slate-900/95 backdrop-blur-md border border-blue-500/40 shadow-2xl sm:max-w-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400">🚗 In-Page Route</span>
                <button
                  onClick={() => setRouteInfo(null)}
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
                Origin: Central Hub → {selectedBusiness?.name}
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
              Selected Business Pin
            </h3>

            {selectedBusiness ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        selectedBusiness.markerColor === "green"
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                          : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                      }`}
                    />
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{selectedBusiness.name}</h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedBusiness.category || "Uncategorized"} • {selectedBusiness.area || "Dhaka"}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Status:</span>{" "}
                    <span
                      className={`font-semibold ${
                        selectedBusiness.markerColor === "green" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {selectedBusiness.markerColor === "green" ? "🟢 Green" : "🔴 Red"} (
                      {selectedBusiness.orderCount} orders)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Phone:</span>{" "}
                    <span className="font-mono">{selectedBusiness.phoneRaw || "—"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">GPS:</span>{" "}
                    <span className="font-mono">
                      {selectedBusiness.latitude?.toFixed(4)}, {selectedBusiness.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleCalculateRoute}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    🗺️ In-Page Route & ETA
                  </button>
                  <Link
                    href={`/dashboard/businesses/${selectedBusiness.id}`}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-center transition-all"
                  >
                    View Account Details →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">
                Click any marker on the map to inspect details and route.
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex-1 overflow-y-auto max-h-[300px] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Location Needed ({unlocated.length})
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                No fake pins
              </span>
            </div>

            {unlocated.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                All matching businesses have valid GPS coordinates.
              </p>
            ) : (
              <div className="space-y-2">
                {unlocated.map((ub) => (
                  <div
                    key={ub.id}
                    className="p-3 bg-amber-50/50 dark:bg-slate-800/50 rounded-xl border border-dashed border-amber-300 dark:border-amber-500/30 space-y-1"
                  >
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{ub.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {ub.area || "Area unspecified"} • {ub.phoneRaw || "No phone"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
