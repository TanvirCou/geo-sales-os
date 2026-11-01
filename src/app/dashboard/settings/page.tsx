import type { Metadata } from "next";
import { getAdminProfile } from "@/actions/settings";
import { getTeamMembers } from "@/actions/team";
import SettingsClient from "@/components/settings/SettingsClient";

export const metadata: Metadata = { title: "Settings & Team Management — GeoSales OS" };

export default async function SettingsPage() {
  const profile = await getAdminProfile();
  const teamMembers = profile.role === "ADMIN" ? await getTeamMembers() : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Account & System Settings
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
          {profile.role === "ADMIN"
            ? "Manage team members, roles, authorization permissions, and your administrator profile."
            : "Update your profile name, change your 6-digit access PIN, and view your active session."}
        </p>
      </div>

      <SettingsClient
        currentUser={profile}
        initialTeamMembers={teamMembers}
      />
    </div>
  );
}
