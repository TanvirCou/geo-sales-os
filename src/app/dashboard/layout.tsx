import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAdminProfile } from "@/actions/settings";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { TopNavbar } from "@/components/dashboard/TopNavbar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { ToastProvider } from "@/components/ui/Toast";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const profile = await getAdminProfile().catch(() => ({ name: "Admin User" }));

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">
        {/* Desktop Left Sidebar */}
        <DashboardSidebar adminName={profile.name} />

        {/* Main Container */}
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
          <TopNavbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 bg-slate-50 dark:bg-slate-950">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </main>
        </div>

        {/* Native App-Style Mobile Bottom Navigation Bar & Sheet */}
        <MobileBottomNav adminName={profile.name} />
      </div>
    </ToastProvider>
  );
}
