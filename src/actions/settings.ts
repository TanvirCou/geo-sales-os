"use server";

import { requireAuth } from "./auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getAdminProfile() {
  const session = await requireAuth();

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  return {
    id: user?.id || session.user.id,
    name: user?.name || session.user.name || "User",
    phone: user?.phone || session.user.phone || "",
    role: user?.role || session.user.role || "ADMIN",
    permissions: user?.permissions || session.user.permissions,
  };
}

export async function updateAdminName(name: string) {
  const session = await requireAuth();

  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return { error: "Name must be at least 2 characters long." };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { name: trimmed },
  });

  // Keep legacy admin_credentials in sync if this user is Admin
  if (session.user.role === "ADMIN") {
    await db.$executeRawUnsafe(
      `UPDATE "admin_credentials" SET "name" = $1, "updated_at" = NOW();`,
      trimmed
    ).catch(() => {});
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");

  return { success: true, name: trimmed };
}

export async function changeAdminPin({
  currentPin,
  newPin,
  confirmPin,
}: {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}) {
  const session = await requireAuth();

  // Validate format
  if (!/^\d{6}$/.test(currentPin)) {
    return { error: "Current PIN must be exactly 6 digits." };
  }

  if (!/^\d{6}$/.test(newPin)) {
    return { error: "New PIN must be exactly 6 digits (numbers only)." };
  }

  if (newPin !== confirmPin) {
    return { error: "New PIN and Confirm PIN do not match." };
  }

  if (currentPin === newPin) {
    return { error: "New PIN cannot be the same as your current PIN." };
  }

  // Fetch current user from DB
  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { error: "User account record not found." };
  }

  // Verify current PIN
  const isValid = await bcrypt.compare(currentPin, user.pinHash);
  if (!isValid) {
    return { error: "Incorrect current PIN. Please enter your existing PIN correctly." };
  }

  // Hash new PIN
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPin, salt);

  // Update user in database
  await db.user.update({
    where: { id: user.id },
    data: {
      pinHash: newHash,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  // Keep legacy admin_credentials in sync if this user is Admin
  if (session.user.role === "ADMIN") {
    await db.$executeRawUnsafe(
      `UPDATE "admin_credentials" SET "pin_hash" = $1, "failed_attempts" = 0, "locked_until" = NULL, "updated_at" = NOW();`,
      newHash
    ).catch(() => {});
  }

  revalidatePath("/dashboard/settings");

  return {
    success: true,
    message: "PIN changed successfully! Use your new PIN for future logins.",
  };
}
