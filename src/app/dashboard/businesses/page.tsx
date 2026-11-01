import type { Metadata } from "next";
import { getBusinesses, getBusinessFilterOptions } from "@/actions/businesses";
import { getSession } from "@/lib/auth";
import BusinessListClient from "@/components/businesses/BusinessListClient";

export const metadata: Metadata = { title: "Businesses — GeoSales OS" };

export default async function BusinessesPage() {
  const [businesses, filterOptions, session] = await Promise.all([
    getBusinesses({}),
    getBusinessFilterOptions(),
    getSession(),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Client Businesses
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Centralized directory of client accounts. Manage business profiles, geographic coordinates, and purchase histories across regional territories.
        </p>
      </div>

      <BusinessListClient
        initialBusinesses={businesses}
        filterOptions={filterOptions}
        userRole={session?.user.role}
        userPermissions={session?.user.permissions}
      />
    </div>
  );
}
