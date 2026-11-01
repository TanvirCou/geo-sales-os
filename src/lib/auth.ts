import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "bsm_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: "ADMIN" | "MODERATOR" | "MARKETER" | "CUSTOM";
  permissions: any;
  isActive: boolean;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function createSession(userId?: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  
  // If no userId passed, attach to the first admin user for fallback compatibility
  let targetUserId = userId;
  if (!targetUserId) {
    const adminUser = await db.user.findFirst({
      where: { role: "ADMIN", isActive: true },
    });
    if (adminUser) {
      targetUserId = adminUser.id;
    }
  }

  if (targetUserId) {
    const session = await db.userSession.create({
      data: { userId: targetUserId, expiresAt },
    });
    return session.id;
  }

  // Fallback to adminSession if no user exists yet
  const fallbackSession = await db.adminSession.create({
    data: { expiresAt },
  });
  return fallbackSession.id;
}

export async function getSession(): Promise<{ id: string; user: AuthUser } | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  // 1. Look in userSession
  const userSession = await db.userSession.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (userSession) {
    if (userSession.expiresAt < new Date() || !userSession.user.isActive) {
      await db.userSession.delete({ where: { id: sessionId } }).catch(() => {});
      return null;
    }

    return {
      id: userSession.id,
      user: {
        id: userSession.user.id,
        name: userSession.user.name,
        phone: userSession.user.phone,
        role: userSession.user.role as any,
        permissions: userSession.user.permissions,
        isActive: userSession.user.isActive,
      },
    };
  }

  // 2. Fallback check in adminSession (for legacy sessions during transition)
  const legacySession = await db.adminSession.findUnique({
    where: { id: sessionId },
  });

  if (legacySession) {
    if (legacySession.expiresAt < new Date()) {
      await db.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
      return null;
    }
    const adminUser = await db.user.findFirst({ where: { role: "ADMIN" } });
    if (adminUser) {
      return {
        id: legacySession.id,
        user: {
          id: adminUser.id,
          name: adminUser.name,
          phone: adminUser.phone,
          role: "ADMIN",
          permissions: null,
          isActive: true,
        },
      };
    }
  }

  return null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.userSession.delete({ where: { id: sessionId } }).catch(() => {});
  await db.adminSession.delete({ where: { id: sessionId } }).catch(() => {});
}

export function setSessionCookie(sessionId: string): void {
  void sessionId;
}

// ─── PIN & Credential verification ──────────────────────────────────────────

export type LoginResult =
  | { success: true; user: AuthUser }
  | { success: false; error: string; remainingAttempts?: number; lockedUntil?: Date };

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Verifies mobile phone number and 6-digit PIN.
 */
export async function verifyUserCredentials(phone: string, pin: string): Promise<LoginResult> {
  const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
  if (!cleanPhone || cleanPhone.length < 8) {
    return { success: false, error: "Please provide a valid mobile number." };
  }

  if (!/^\d{6}$/.test(pin)) {
    return { success: false, error: "PIN must be exactly 6 digits." };
  }

  // Find user by phone (flexible matching e.g. with/without leading 0 or +88)
  const user = await db.user.findFirst({
    where: {
      OR: [
        { phone: cleanPhone },
        { phone: cleanPhone.replace(/^\+88/, "") },
        { phone: `+88${cleanPhone}` },
        { phone: cleanPhone.startsWith("0") ? cleanPhone : `0${cleanPhone}` },
      ],
    },
  });

  if (!user) {
    return { success: false, error: "No account found with this phone number." };
  }

  if (!user.isActive) {
    return { success: false, error: "Your account is deactivated. Please contact the administrator." };
  }

  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      success: false,
      error: `Account locked. Try again after ${user.lockedUntil.toLocaleTimeString()}.`,
      lockedUntil: user.lockedUntil,
    };
  }

  const bcrypt = await import("bcryptjs");
  const isValid = await bcrypt.compare(pin, user.pinHash);

  if (isValid) {
    // Reset failure counter on success
    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null },
    });
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role as any,
        permissions: user.permissions,
        isActive: user.isActive,
      },
    };
  }

  // Increment failure counter
  const newAttempts = user.failedAttempts + 1;
  const shouldLock = newAttempts >= MAX_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
    : null;

  await db.user.update({
    where: { id: user.id },
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

/**
 * Fallback verification for PIN-only input: checks against the primary Admin user.
 */
export async function verifyPin(pin: string): Promise<LoginResult> {
  const admin = await db.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    return { success: false, error: "Admin account not found in system." };
  }

  return verifyUserCredentials(admin.phone, pin);
}

export { SESSION_COOKIE };
