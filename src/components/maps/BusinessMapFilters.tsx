"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, MapPin, CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { searchLivePlacesAcrossBD } from "@/actions/map";

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

export interface MapFiltersState {
  q: string;
  category: string;
  district: string;
  area: string;
  orderColor: "ALL" | "GREEN" | "RED";
}

interface FilterProps {
  filters: MapFiltersState;
  onChange: (filters: MapFiltersState) => void;
  categories: string[];
  districts: string[];
  areas?: string[];
  stats: {
    total: number;
    located: number;
    unlocated: number;
    green: number;
    red: number;
  };
  candidateBusinesses?: UnifiedMapPoint[];
  onSelectBusiness?: (point: UnifiedMapPoint) => void;
}

function cleanLocation(
  address: string | null | undefined,
  area: string | null | undefined,
  district: string | null | undefined
): string {
  let loc = (address || "").trim();

  // If there's an explicit "Address:" marker, extract what comes after it
  if (/address\s*:\s*/i.test(loc)) {
    loc = loc.replace(/^.*address\s*:\s*/i, "").trim();
  } else if (/^name\s*:\s*/i.test(loc)) {
    // If it starts with "Name: ...", remove up to the first comma or address section
    loc = loc.replace(/^name\s*:[^,]+,\s*/i, "").trim();
  }

  // Remove any trailing phone numbers
  loc = loc.replace(/,?\s*(?:phone|mobile|contact|tel)?\s*:?\s*01\d{9}.*$/i, "").trim();

  // If still empty or contains "Name:", fallback to area/district
  if (!loc || /^name\s*:/i.test(loc)) {
    if (area && district) {
      return area.toLowerCase().includes(district.toLowerCase())
        ? area
        : `${area}, ${district}`;
    }
    return area || district || "Location on record";
  }

  return loc;
}

export default function BusinessMapFilters({
  filters,
  onChange,
  categories,
  districts,
  areas,
  stats,
  candidateBusinesses = [],
  onSelectBusiness,
}: FilterProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [liveResults, setLiveResults] = useState<UnifiedMapPoint[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);

  // Close suggestion dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Nationwide live place search across all Bangladesh (debounced)
  useEffect(() => {
    const query = filters.q.trim();
    if (query.length < 2) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      try {
        const places = await searchLivePlacesAcrossBD(query);
        const mapped: UnifiedMapPoint[] = places.map((p) => ({
          // If it's a matched DB client, use the DB business ID so popupsMapRef lookup
          // finds the rendered marker and opens the proper full popup (not the fallback).
          id: (p.isClient && p.clientBusinessId) ? p.clientBusinessId : p.id,
          name: p.name,
          category: p.category,
          area: "Bangladesh",
          district: "Bangladesh",
          address: p.address,
          phoneRaw: p.phoneRaw || null,
          latitude: p.latitude,
          longitude: p.longitude,
          isClient: p.isClient,
          orderCount: p.orderCount ?? (p.isClient ? 1 : 0),
          markerColor: p.markerColor,
          externalPlaceId: p.id,
        }));
        setLiveResults(mapped);
      } catch (err) {
        console.error("Live search error:", err);
      } finally {
        setIsSearchingLive(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [filters.q]);

  // Combined suggestions: Local candidate matches + Nationwide live matches
  const suggestions = useMemo(() => {
    if (!filters.q || !filters.q.trim()) return [];
    const query = filters.q.toLowerCase().trim();

    // 1. Local candidate matches
    const localMatches = candidateBusinesses.filter((pt) => {
      const matchName = pt.name?.toLowerCase().includes(query);
      const matchPhone = pt.phoneRaw?.toLowerCase().includes(query);
      const matchAddr = pt.address?.toLowerCase().includes(query);
      const matchCat = pt.category?.toLowerCase().includes(query);
      return matchName || matchPhone || matchAddr || matchCat;
    });

    // 2. Filter live results according to active orderColor / category / district
    const filteredLive = liveResults.filter((pt) => {
      if (filters.orderColor === "GREEN" && pt.markerColor !== "green") return false;
      if (filters.orderColor === "RED" && pt.markerColor !== "red") return false;
      if (
        filters.category !== "ALL" &&
        !pt.category.toLowerCase().includes(filters.category.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.district !== "ALL" &&
        !pt.address.toLowerCase().includes(filters.district.toLowerCase())
      ) {
        return false;
      }
      // Deduplicate with localMatches
      const alreadyPresent = localMatches.some(
        (l) =>
          l.id === pt.id ||
          (Math.abs(l.latitude - pt.latitude) < 0.0005 &&
            Math.abs(l.longitude - pt.longitude) < 0.0005)
      );
      return !alreadyPresent;
    });

    // Merge: local matches first, then filtered live results
    // Deduplicate by id using a Map (preserves order, local matches take priority)
    const merged = new Map<string, typeof localMatches[0]>();
    for (const pt of [...localMatches, ...filteredLive]) {
      if (!merged.has(pt.id)) {
        merged.set(pt.id, pt);
      }
    }
    return Array.from(merged.values()).slice(0, 20);
  }, [candidateBusinesses, liveResults, filters.q, filters.orderColor, filters.category, filters.district]);

  const handleSelect = (pt: UnifiedMapPoint) => {
    onChange({ ...filters, q: pt.name });
    setIsDropdownOpen(false);
    onSelectBusiness?.(pt);
  };

  const handleClearSearch = () => {
    onChange({ ...filters, q: "" });
    setLiveResults([]);
    setIsDropdownOpen(false);
  };

  const handleReset = () => {
    onChange({
      q: "",
      category: "ALL",
      district: "ALL",
      area: "ALL",
      orderColor: "ALL",
    });
    setLiveResults([]);
    setIsDropdownOpen(false);
  };

  const selectBaseCls =
    "px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all cursor-pointer shadow-sm truncate";

  return (
    <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm mb-4 space-y-3.5">
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        {/* Name / Phone search with Autocomplete Dropdown - Dominant & Wide */}
        <div ref={searchContainerRef} className="relative flex-1 min-w-[280px] sm:min-w-[340px] md:min-w-[400px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search business name, phone, or location..."
              value={filters.q}
              onChange={(e) => {
                onChange({ ...filters, q: e.target.value });
                setIsDropdownOpen(true);
              }}
              onFocus={() => {
                if (filters.q.trim()) {
                  setIsDropdownOpen(true);
                }
              }}
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
            />
            {filters.q && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {isDropdownOpen && filters.q.trim().length > 0 && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-full md:min-w-[460px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 animate-fade-in">
              <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  Suggestions ({suggestions.length})
                  {filters.orderColor === "GREEN" && " • 🟢 Clients Only"}
                  {filters.orderColor === "RED" && " • 🔴 Leads Only"}
                  {isSearchingLive && (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-normal ml-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching nationwide...
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                  Click to locate on map
                </span>
              </div>

              {suggestions.length === 0 ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    No businesses matching &ldquo;{filters.q}&rdquo; under current filters.
                  </p>
                  {(filters.orderColor !== "ALL" || filters.category !== "ALL" || filters.district !== "ALL") && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                      Tip: Other active filters might be restricting this search.
                    </p>
                  )}
                </div>
              ) : (
                suggestions.map((pt) => {
                  const isGreen = pt.markerColor === "green";
                  return (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => handleSelect(pt)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-blue-50/70 dark:hover:bg-blue-900/20 flex items-center justify-between gap-3 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span
                          className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                            isGreen
                              ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                              : "bg-rose-500 shadow-sm shadow-rose-500/50"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs md:text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                            {pt.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors" />
                            <span className="truncate">
                              {cleanLocation(pt.address, pt.area, pt.district)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isGreen ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {pt.orderCount} Order{pt.orderCount !== 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                            Lead
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Category Filter - Compact */}
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className={`w-full sm:w-[145px] shrink-0 ${selectBaseCls}`}
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* District Filter - Compact */}
        <select
          value={filters.district}
          onChange={(e) => onChange({ ...filters, district: e.target.value, area: "ALL" })}
          className={`w-full sm:w-[135px] shrink-0 ${selectBaseCls}`}
        >
          <option value="ALL">All Districts</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        {/* Marker Color Filter - Compact */}
        <select
          value={filters.orderColor}
          onChange={(e) => onChange({ ...filters, orderColor: e.target.value as any })}
          className={`w-full sm:w-[180px] shrink-0 ${selectBaseCls}`}
        >
          <option value="ALL">All Markers</option>
          <option value="GREEN">🟢 Clients</option>
          <option value="RED">🔴 Leads</option>
        </select>

        {/* Reset button - Compact & crisp */}
        <button
          onClick={handleReset}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm font-medium transition-all shadow-sm cursor-pointer shrink-0"
        >
          Reset Filters
        </button>
      </div>

      {/* Filter Counts Bar */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          Total Mapped Pins: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{stats.total}</strong>
        </span>

        <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {stats.green} Clients
        </span>

        <span className="text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
          {stats.red} Leads
        </span>
      </div>
    </div>
  );
}
