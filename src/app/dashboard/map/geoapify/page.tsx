import type { Metadata } from "next";
import { getMapBusinesses, fetchLiveRestaurantProspects } from "@/actions/map";
import { getBusinessFilterOptions } from "@/actions/businesses";
import GeoapifyMapClient from "@/components/maps/GeoapifyMapClient";

export const metadata: Metadata = { title: "Geoapify Map — Business Sales" };

export default async function GeoapifyMapPage() {
  const [mapData, filterOptions, initialProspectsData] = await Promise.all([
    getMapBusinesses(),
    getBusinessFilterOptions(),
    fetchLiveRestaurantProspects({ lat: 23.7405, lon: 90.3846, radiusMeters: 4000 }).catch(() => ({ prospects: [] })),
  ]);

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Geo-Mapping &amp; Routing: MapLibre + Geoapify
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
          Compare live field coverage. Green markers indicate businesses with ≥1 recorded order; Red markers indicate prospects with 0 orders.
        </p>
      </div>

      <GeoapifyMapClient
        initialBusinesses={mapData.businesses}
        initialProspects={initialProspectsData.prospects || []}
        categories={filterOptions.categories}
        districts={filterOptions.districts}
        areas={filterOptions.areas}
        apiKey={apiKey}
      />
    </div>
  );
}
