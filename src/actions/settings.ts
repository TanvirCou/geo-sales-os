"use server";

import { requireAuth } from "./auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getAdminProfile() {
  await requireAuth();

  const creds = await db.$queryRawUnsafe<any[]>(
    `SELECT "id", "name", "created_at", "updated_at" FROM "admin_credentials" LIMIT 1;`
  );

  const admin = creds[0];
  return {
    name: admin?.name || "Admin User",
  };
}

export async function updateAdminName(name: string) {
  await requireAuth();

  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return { error: "Admin name must be at least 2 characters long." };
  }

  const creds = await db.$queryRawUnsafe<any[]>(
    `SELECT "id" FROM "admin_credentials" LIMIT 1;`
  );

  if (!creds[0]) {
    return { error: "Admin credential not found." };
  }

  await db.$executeRawUnsafe(
    `UPDATE "admin_credentials" SET "name" = $1, "updated_at" = NOW() WHERE "id" = $2;`,
    trimmed,
    creds[0].id
  );

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
  await requireAuth();

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

  // Fetch credential
  const creds = await db.$queryRawUnsafe<any[]>(
    `SELECT "id", "pin_hash" FROM "admin_credentials" LIMIT 1;`
  );

  const cred = creds[0];
  if (!cred) {
    return { error: "Admin account record not found." };
  }

  // Verify current PIN
  const isValid = await bcrypt.compare(currentPin, cred.pin_hash);
  if (!isValid) {
    return { error: "Incorrect current PIN. Please enter your existing PIN correctly." };
  }

  // Hash new PIN
  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPin, salt);

  // Update in database
  await db.$executeRawUnsafe(
    `UPDATE "admin_credentials" SET "pin_hash" = $1, "failed_attempts" = 0, "locked_until" = NULL, "updated_at" = NOW() WHERE "id" = $2;`,
    newHash,
    cred.id
  );

  revalidatePath("/dashboard/settings");

  return {
    success: true,
    message: "Security PIN has been updated successfully! Please use this new PIN next time you sign in.",
  };
}
