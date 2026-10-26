import type { Metadata } from "next";
import { getMapBusinesses } from "@/actions/map";
import { getBusinessFilterOptions } from "@/actions/businesses";
import GoogleMapClient from "@/components/maps/GoogleMapClient";

export const metadata: Metadata = { title: "Google Map — Business Sales" };

export default async function GoogleMapPage() {
  const [mapData, filterOptions] = await Promise.all([
    getMapBusinesses(),
    getBusinessFilterOptions(),
  ]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Geo-Mapping &amp; Routing: Google Maps JS API
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
          Compare live field coverage. Green markers indicate businesses with ≥1 recorded order; Red markers indicate prospects with 0 orders.
        </p>
      </div>

      <GoogleMapClient
        initialBusinesses={mapData.businesses}
        categories={filterOptions.categories}
        districts={filterOptions.districts}
        areas={filterOptions.areas}
        apiKey={apiKey}
        mapId={mapId}
      />
    </div>
  );
}
