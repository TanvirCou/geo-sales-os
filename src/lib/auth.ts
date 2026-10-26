import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "bsm_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function createSession(): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const session = await db.adminSession.create({
    data: { expiresAt },
  });
  return session.id;
}

export async function getSession(): Promise<{ id: string } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await db.adminSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.expiresAt < new Date()) {
    // expired — delete it
    if (session) {
      await db.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
    }
    return null;
  }

  return { id: session.id };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
}

export function setSessionCookie(sessionId: string): void {
  // Called server-side; we return the cookie header string to be set by the route
  // This function is intentionally a no-op here; use `setSessionCookieInResponse`
  // from Server Actions or Route Handlers where cookies() is writable.
  void sessionId;
}

// ─── PIN verification ─────────────────────────────────────────────────────────

export type LoginResult =
  | { success: true }
  | { success: false; error: string; remainingAttempts?: number; lockedUntil?: Date };

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function verifyPin(pin: string): Promise<LoginResult> {
  // Validate input shape before hitting DB
  if (!/^\d{6}$/.test(pin)) {
    return { success: false, error: "PIN must be exactly 6 digits." };
  }

  const credential = await db.adminCredential.findFirst();
  if (!credential) {
    return { success: false, error: "Admin account not configured." };
  }

  // Check lockout
  if (credential.lockedUntil && credential.lockedUntil > new Date()) {
    return {
      success: false,
      error: `Account locked. Try again after ${credential.lockedUntil.toLocaleTimeString()}.`,
      lockedUntil: credential.lockedUntil,
    };
  }

  // Use bcrypt dynamically imported to keep this server-only
  const bcrypt = await import("bcryptjs");
  const isValid = await bcrypt.compare(pin, credential.pinHash);

  if (isValid) {
    // Reset failure counter on success
    await db.adminCredential.update({
      where: { id: credential.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    return { success: true };
  }

  // Increment failure counter
  const newAttempts = credential.failedAttempts + 1;
  const shouldLock = newAttempts >= MAX_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
    : null;

  await db.adminCredential.update({
    where: { id: credential.id },
    data: {
      failedAttempts: newAttempts,
      lockedUntil,
    },
  });

  if (shouldLock) {
    return {
      success: false,
      error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
      lockedUntil: lockedUntil!,
    };
  }

  return {
    success: false,
    error: "Incorrect PIN.",
    remainingAttempts: MAX_ATTEMPTS - newAttempts,
  };
}

export { SESSION_COOKIE };
