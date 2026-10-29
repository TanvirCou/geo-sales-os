import { requireAuth } from "@/actions/auth";
import type { Metadata } from "next";
import ImportManagerClient from "@/components/imports/ImportManagerClient";

export const metadata: Metadata = { title: "Excel & CSV Imports — Business Sales" };

export default async function ImportsPage() {
  await requireAuth();

  return <ImportManagerClient />;
}
