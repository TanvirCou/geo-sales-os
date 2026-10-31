import type { Metadata } from "next";
import { getMapBusinesses, fetchLiveRestaurantProspects } from "@/actions/map";
import { getBusinessFilterOptions } from "@/actions/businesses";
import GeoapifyMapClient from "@/components/maps/GeoapifyMapClient";

export const metadata: Metadata = { title: "Territory Sales Map — MapLibre" };

export default async function GeoapifyMapPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;

  const [mapData, filterOptions, initialProspectsData] = await Promise.all([
    getMapBusinesses(),
    getBusinessFilterOptions(),
    fetchLiveRestaurantProspects({ lat: 23.7405, lon: 90.3846, radiusMeters: 4000 }).catch(() => ({ prospects: [] })),
  ]);

  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span>Territory Sales Map</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-500/20">
              MapLibre
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
            Visual territory coverage, customer account management, and real-time field route planning.
          </p>
        </div>
      </div>

      <GeoapifyMapClient
        initialBusinesses={mapData.businesses}
        initialProspects={initialProspectsData.prospects || []}
        categories={filterOptions.categories}
        districts={filterOptions.districts}
        areas={filterOptions.areas}
        apiKey={apiKey}
        focusId={focus}
      />
    </div>
  );
}
