import type { Metadata } from "next";
import { getMapBusinesses, fetchLiveRestaurantProspects } from "@/actions/map";
import { getBusinessFilterOptions } from "@/actions/businesses";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import GoogleMapClient from "@/components/maps/GoogleMapClient";

export const metadata: Metadata = { title: "Territory Sales Map — Google Maps" };

export default async function GoogleMapPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;

  const [mapData, filterOptions, initialProspectsData, session] = await Promise.all([
    getMapBusinesses(),
    getBusinessFilterOptions(),
    fetchLiveRestaurantProspects({ lat: 23.7405, lon: 90.3846, radiusMeters: 4000 }).catch(() => ({ prospects: [] })),
    getSession(),
  ]);

  const canAddBusiness = hasPermission(session?.user, "canAddBusiness");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <span>Territory Sales Map</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-500/20">
              Google Maps
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
            Visual territory coverage, customer account management, and real-time field route planning.
          </p>
        </div>
      </div>

      <GoogleMapClient
        initialBusinesses={mapData.businesses}
        initialProspects={initialProspectsData.prospects || []}
        categories={filterOptions.categories}
        districts={filterOptions.districts}
        areas={filterOptions.areas}
        apiKey={apiKey}
        mapId={mapId}
        focusId={focus}
        canAddBusiness={canAddBusiness}
      />
    </div>
  );
}
