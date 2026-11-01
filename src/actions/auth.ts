"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifyUserCredentials,
  verifyPin,
  createSession,
  deleteSession,
  getSession,
  SESSION_COOKIE,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const phone = ((formData.get("phone") as string | null) ?? "").trim();
  const pin = ((formData.get("pin") as string | null) ?? "").trim();

  let result;
  if (phone) {
    result = await verifyUserCredentials(phone, pin);
  } else {
    // Fallback to direct admin PIN verification
    result = await verifyPin(pin);
  }

  if (!result.success) {
    return {
      error: result.error,
      remainingAttempts: result.remainingAttempts,
      lockedUntil: result.lockedUntil?.toISOString(),
    };
  }

  const sessionId = await createSession(result.user.id);
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
