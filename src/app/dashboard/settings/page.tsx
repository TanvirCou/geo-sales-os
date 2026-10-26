import type { Metadata } from "next";
import { getAdminProfile } from "@/actions/settings";
import SettingsClient from "@/components/settings/SettingsClient";

export const metadata: Metadata = { title: "Settings — Business Sales" };

export default async function SettingsPage() {
  const profile = await getAdminProfile();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Account & Security Settings
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
          Update administrator display name, change 6-digit access PIN with verification, and inspect active session.
        </p>
      </div>

      <SettingsClient initialName={profile.name} />
    </div>
  );
}
