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

// ── 3. Geospatial Mapping & Backfill Actions ──────────────────────────────────
import { geocodeGoogleMaps } from "@/lib/geocoding";

export interface GeospatialSyncStats {
  totalBusinesses: number;
  osmLocatedCount: number;
  googleLocatedCount: number;
  missingGoogleCount: number;
  googleKeyConfigured: boolean;
  geoapifyKeyConfigured: boolean;
}

export async function getGeospatialSyncStats(): Promise<GeospatialSyncStats> {
  await requireAuth();

  const totalBusinesses = await db.business.count({
    where: { isActive: true },
  });

  const osmLocatedCount = await db.business.count({
    where: { isActive: true, osmLatitude: { not: null } },
  });

  const googleLocatedCount = await db.business.count({
    where: { isActive: true, googleLatitude: { not: null } },
  });

  const missingGoogleCount = await db.business.count({
    where: {
      isActive: true,
      googleLatitude: null,
      OR: [
        { address: { not: null } },
        { area: { not: null } },
        { osmLatitude: { not: null } },
      ],
    },
  });

  const googleKey =
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const geoapifyKey =
    process.env.GEOAPIFY_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  return {
    totalBusinesses,
    osmLocatedCount,
    googleLocatedCount,
    missingGoogleCount,
    googleKeyConfigured: !!googleKey,
    geoapifyKeyConfigured: !!geoapifyKey,
  };
}

export async function syncGoogleMapsPinsChunk(batchSize = 10): Promise<{
  success: boolean;
  processedCount: number;
  successCount: number;
  remainingCount: number;
  completed: boolean;
  error?: string;
}> {
  await requireAuth();

  const googleKey =
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleKey) {
    return {
      success: false,
      processedCount: 0,
      successCount: 0,
      remainingCount: 0,
      completed: true,
      error: "Google Maps API key is not configured in .env",
    };
  }

  // Find up to batchSize businesses where googleLatitude is null
  const candidates = await db.business.findMany({
    where: {
      isActive: true,
      googleLatitude: null,
      OR: [
        { address: { not: null } },
        { area: { not: null } },
        { osmLatitude: { not: null } },
      ],
    },
    take: batchSize,
    select: {
      id: true,
      name: true,
      address: true,
      area: true,
      district: true,
      osmLatitude: true,
      osmLongitude: true,
    },
  });

  if (candidates.length === 0) {
    return {
      success: true,
      processedCount: 0,
      successCount: 0,
      remainingCount: 0,
      completed: true,
    };
  }

  let successCount = 0;

  for (const b of candidates) {
    const loc = [b.address, b.area, b.district].filter(Boolean).join(", ");
    try {
      const gRes = await geocodeGoogleMaps(b.name, loc);
      if (gRes.success && gRes.latitude != null && gRes.longitude != null) {
        await db.business.update({
          where: { id: b.id },
          data: {
            googleLatitude: gRes.latitude,
            googleLongitude: gRes.longitude,
            googlePlaceId: gRes.placeId,
            googleFormattedAddress: gRes.formattedAddress,
          },
        });
        successCount++;
      } else if (b.osmLatitude && b.osmLongitude) {
        // Fallback: copy universal OSM coordinates to Google pin
        await db.business.update({
          where: { id: b.id },
          data: {
            googleLatitude: b.osmLatitude,
            googleLongitude: b.osmLongitude,
            googleFormattedAddress: b.address || loc,
          },
        });
        successCount++;
      }
    } catch (err: any) {
      console.warn(`Error backfilling Google pin for ${b.name}:`, err.message);
    }
  }

  const remainingCount = await db.business.count({
    where: {
      isActive: true,
      googleLatitude: null,
      OR: [
        { address: { not: null } },
        { area: { not: null } },
        { osmLatitude: { not: null } },
      ],
    },
  });

  revalidatePath("/dashboard/map/google");
  revalidatePath("/dashboard/settings");

  return {
    success: true,
    processedCount: candidates.length,
    successCount,
    remainingCount,
    completed: remainingCount === 0,
  };
}
