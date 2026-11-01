import { requireAuth } from "@/actions/auth";
import { hasPermission } from "@/lib/permissions";
import type { Metadata } from "next";
import ImportManagerClient from "@/components/imports/ImportManagerClient";
import AccessDenied from "@/components/ui/AccessDenied";

export const metadata: Metadata = { title: "Excel & CSV Imports — GeoSales OS" };

export default async function ImportsPage() {
  const session = await requireAuth();

  if (!hasPermission(session.user, "canImport")) {
    return (
      <AccessDenied
        moduleName="Batch Excel & CSV Data Imports"
        userRole={session.user.role}
        userName={session.user.name}
        userPhone={session.user.phone}
        reason="Excel data ingestion and bulk geocoding is restricted for this account role."
      />
    );
  }

  return <ImportManagerClient />;
}
