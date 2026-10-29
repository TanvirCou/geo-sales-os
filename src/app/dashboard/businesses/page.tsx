import type { Metadata } from "next";
import { getBusinesses, getBusinessFilterOptions } from "@/actions/businesses";
import BusinessListClient from "@/components/businesses/BusinessListClient";

export const metadata: Metadata = { title: "Businesses — GeoSales OS" };

export default async function BusinessesPage() {
  const [businesses, filterOptions] = await Promise.all([
    getBusinesses({ isActive: true }),
    getBusinessFilterOptions(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Client Businesses
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
          Directory of client accounts who have purchased products. Manage client details, GPS locations, and order histories.
        </p>
      </div>

      <BusinessListClient
        initialBusinesses={businesses}
        filterOptions={filterOptions}
      />
    </div>
  );
}
