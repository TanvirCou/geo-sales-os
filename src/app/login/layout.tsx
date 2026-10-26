import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If already authenticated, skip login
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
