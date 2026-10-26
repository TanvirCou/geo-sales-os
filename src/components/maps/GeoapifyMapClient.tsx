"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Script from "next/script";
import Link from "next/link";
import BusinessMapFilters, { MapFiltersState } from "./BusinessMapFilters";
import { MapBusiness } from "@/actions/map";

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

export default function GeoapifyMapClient({
  initialBusinesses,
  categories,
  districts,
  areas,
  apiKey,
}: GeoapifyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<MapBusiness | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);

  // Discovery search (Geoapify live Places)
  const [discoveryQuery, setDiscoveryQuery] = useState("");
  const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
  const [isSearchingDiscovery, setIsSearchingDiscovery] = useState(false);
  const discoveryMarkersRef = useRef<any[]>([]);

  // Filter state
  const [filters, setFilters] = useState<MapFiltersState>({
    q: "",
    category: "ALL",
    district: "ALL",
    area: "ALL",
    orderColor: "ALL",
  });

  // Client-side filtering adhering strictly to Phase 3 criteria
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

  // Initialize MapLibre
  const initMap = () => {
    if (!window.maplibregl || !mapContainerRef.current || mapInstanceRef.current) return;

    // Default style: if apiKey is provided, use Geoapify OSM-Bright; otherwise use open raster OSM tiles
    const style = apiKey
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

    const map = new window.maplibregl.Map({
      container: mapContainerRef.current,
      style: style,
      center: [90.3995, 23.7650], // Center on Dhaka
      zoom: 12,
    });

    map.addControl(new window.maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapInstanceRef.current = map;
      setMapLoaded(true);
    });
  };

  // Render company markers
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !window.maplibregl) return;

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create markers for located businesses
    located.forEach((b) => {
      if (b.latitude == null || b.longitude == null) return;

      const isGreen = b.markerColor === "green";
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = isGreen ? "#22c55e" : "#ef4444";
      el.style.border = "3px solid white";
      el.style.boxShadow = `0 0 12px ${isGreen ? "rgba(34, 197, 94, 0.7)" : "rgba(239, 68, 68, 0.7)"}`;
      el.style.cursor = "pointer";
      el.title = `${b.name} (${isGreen ? "Green: Order Recorded" : "Red: No Orders"})`;

      // Popup
      const popupHtml = `
        <div style="padding: 6px; font-family: inherit; color: #0f172a; max-width: 220px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px;">${b.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            ${b.category || "General"} • ${b.area || "Dhaka"}
          </div>
          <div style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: 600; border-radius: 4px; background: ${
            isGreen ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"
          }; color: ${isGreen ? "#15803d" : "#b91c1c"}; margin-bottom: 8px;">
            ${isGreen ? "🟢 Order recorded" : "🔴 No order recorded"} (${b.orderCount} orders)
          </div>
          <div style="display: flex; gap: 4px;">
            <a href="/dashboard/businesses/${b.id}" style="display: block; font-size: 11px; font-weight: 600; color: #2563eb; text-decoration: none;">
              View Details →
            </a>
          </div>
        </div>
      `;

      const popup = new window.maplibregl.Popup({ offset: 15 }).setHTML(popupHtml);

      const marker = new window.maplibregl.Marker({ element: el })
        .setLngLat([b.longitude, b.latitude])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("click", () => {
        setSelectedBusiness(b);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, located]);

  // Route calculation to selected business
  const handleCalculateRoute = () => {
    if (!selectedBusiness || selectedBusiness.latitude == null || selectedBusiness.longitude == null || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    // Default origin: Karwan Bazar / Farmgate transit hub (approx 90.3928, 23.7508)
    const startLng = 90.3928;
    const startLat = 23.7508;
    const destLng = selectedBusiness.longitude;
    const destLat = selectedBusiness.latitude;

    // Approximate distance via Haversine
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(destLat - startLat);
    const dLon = toRad(destLng - startLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(startLat)) * Math.cos(toRad(destLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = Math.round(R * c * 1.3 * 10) / 10; // 1.3x routing factor
    const durMin = Math.round((distKm / 18) * 60); // approx 18 km/h city speed

    setRouteInfo({ distanceKm: distKm, durationMin: durMin });

    // Draw route line on MapLibre
    const routeCoords = [
      [startLng, startLat],
      [(startLng + destLng) / 2 + 0.002, (startLat + destLat) / 2 - 0.001],
      [destLng, destLat],
    ];

    const geojson: any = {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: routeCoords,
      },
    };

    if (map.getSource("route")) {
      map.getSource("route").setData(geojson);
    } else {
      map.addSource("route", {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#3b82f6",
          "line-width": 5,
          "line-opacity": 0.85,
        },
      });
    }

    // Fly to fit bounds
    const bounds = new window.maplibregl.LngLatBounds();
    bounds.extend([startLng, startLat]);
    bounds.extend([destLng, destLat]);
    map.fitBounds(bounds, { padding: 60 });
  };

  return (
    <div>
      <Script
        src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"
        onLoad={initMap}
      />
      <link
        rel="stylesheet"
        href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"
      />

      {/* Provider Switcher Bar */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">🗺️</span>
          <div>
            <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100">
              Map Provider: MapLibre GL + Geoapify
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Phase 5 live map. Company markers use PostgreSQL data.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm">
            MapLibre (Active)
          </button>
          <Link
            href="/dashboard/map/google"
            className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-all"
          >
            Switch to Google Maps →
          </Link>
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
        {/* Map Canvas */}
        <div className="relative rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 shadow-lg min-h-[400px] sm:min-h-[500px]">
          <div
            ref={mapContainerRef}
            className="w-full h-full min-h-[400px] sm:min-h-[500px] bg-slate-200 dark:bg-slate-900"
          />

          {/* Floating Route Card */}
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

        {/* Sidebar: Selected Business & Unlocated Businesses */}
        <div className="flex flex-col gap-4">
          {/* Selected Business Card */}
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
                Click any green or red marker on the map to inspect client details and calculate routing.
              </p>
            )}
          </div>

          {/* Location Needed (Unlocated Businesses) */}
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
                    <Link
                      href={`/dashboard/businesses`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline block pt-1"
                    >
                      Assign Coordinates →
                    </Link>
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
