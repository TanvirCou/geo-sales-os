import type { Metadata } from "next";
import { getAdminProfile } from "@/actions/settings";
import { getTeamMembers } from "@/actions/team";
import { getCourierConfig, getRecentWebhookEvents } from "@/actions/courier";
import SettingsClient from "@/components/settings/SettingsClient";

export const metadata: Metadata = { title: "Settings & Integrations — GeoSales OS" };

export default async function SettingsPage() {
  const profile = await getAdminProfile();
  const [teamMembers, courierConfig, webhookEventsData] = await Promise.all([
    profile.role === "ADMIN" ? getTeamMembers() : Promise.resolve([]),
    profile.role === "ADMIN" ? getCourierConfig() : Promise.resolve(null),
    profile.role === "ADMIN"
      ? getRecentWebhookEvents(1, 5)
      : Promise.resolve({ events: [], total: 0, page: 1, pageSize: 5, totalPages: 1 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Account & System Settings
        </h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
          {profile.role === "ADMIN"
            ? "Manage team members, roles, permissions, Steadfast courier integration, and your administrator profile."
            : "Update your profile name, change your 6-digit access PIN, and view your active session."}
        </p>
      </div>

      <SettingsClient
        currentUser={profile}
        initialTeamMembers={teamMembers}
        initialCourierConfig={courierConfig}
        initialWebhookEventsData={webhookEventsData}
      />
    </div>
  );
}

