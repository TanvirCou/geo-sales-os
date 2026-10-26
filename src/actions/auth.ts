"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyPin, createSession, deleteSession, getSession, SESSION_COOKIE } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const pin = (formData.get("pin") as string | null) ?? "";

  const result = await verifyPin(pin);

  if (!result.success) {
    return {
      error: result.error,
      remainingAttempts: result.remainingAttempts,
      lockedUntil: result.lockedUntil?.toISOString(),
    };
  }

  const sessionId = await createSession();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 hours in seconds
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await deleteSession(sessionId);
    cookieStore.delete(SESSION_COOKIE);
  }
  redirect("/login");
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
