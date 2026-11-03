"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { encrypt, decrypt } from "@/lib/encryption";

// Steadfast Courier API official endpoint (powered by Packzy engine)
const STEADFAST_API_BASE = "https://portal.packzy.com/api/v1";

export interface CourierConfigDTO {
  id?: string;
  provider: string;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  isActive: boolean;
  balance: number | null;
  lastSyncedAt: string | null;
  lastTestedAt: string | null;
  updatedAt: string | null;
}

export interface WebhookEventDTO {
  id: string;
  provider: string;
  eventType: string | null;
  invoice: string | null;
  status: string | null;
  resultStatus: string;
  error: string | null;
  createdAt: string;
  payloadSnippet: string;
}

// ── 1. Get Courier Configuration ──────────────────────────────────────────────
export async function getCourierConfig(): Promise<CourierConfigDTO | null> {
  await requireAuth();

  const config = await db.courierConfig.findUnique({
    where: { provider: "steadfast" },
  });

  if (!config) return null;

  return {
    id: config.id,
    provider: config.provider,
    apiKey: decrypt(config.apiKey),
    secretKey: decrypt(config.secretKey),
    webhookSecret: decrypt(config.webhookSecret),
    isActive: config.isActive,
    balance: config.balance ? Number(config.balance) : null,
    lastSyncedAt: config.lastSyncedAt ? config.lastSyncedAt.toISOString() : null,
    lastTestedAt: config.lastTestedAt ? config.lastTestedAt.toISOString() : null,
    updatedAt: config.updatedAt ? config.updatedAt.toISOString() : null,
  };
}

import bcrypt from "bcryptjs";

// Helper to verify Admin PIN for sensitive configuration updates
async function verifyAdminPin(userId: string, pin: string): Promise<{ valid: boolean; error?: string }> {
  if (!pin || pin.trim().length !== 6) {
    return { valid: false, error: "6-digit Admin PIN is required." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, role: true, failedAttempts: true, lockedUntil: true },
  });

  if (!user) {
    return { valid: false, error: "User account not found." };
  }

  if (user.role !== "ADMIN") {
    return { valid: false, error: "Unauthorized: Admin privileges required." };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { valid: false, error: `Account locked due to too many failed attempts. Try again in ${mins} minute(s).` };
  }

  const isMatch = await bcrypt.compare(pin.trim(), user.pinHash);
  if (!isMatch) {
    const attempts = user.failedAttempts + 1;
    let lockedUntil: Date | null = null;
    if (attempts >= 5) {
      lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await db.user.update({
      where: { id: userId },
      data: { failedAttempts: attempts, lockedUntil },
    });
    return { valid: false, error: "Incorrect Admin PIN. Please enter your valid 6-digit PIN." };
  }

  // Reset failed attempts on success
  if (user.failedAttempts > 0) {
    await db.user.update({
      where: { id: userId },
      data: { failedAttempts: 0, lockedUntil: null },
    });
  }

  return { valid: true };
}

// ── 2a. Save Steadfast API Credentials (Protected with Admin PIN) ──────────────
export async function saveSteadfastApiCredentials(data: {
  apiKey: string;
  secretKey: string;
  isActive?: boolean;
  adminPin: string;
}): Promise<{ success: boolean; error?: string; config?: CourierConfigDTO }> {
  const session = await requireAuth();

  const pinVerification = await verifyAdminPin(session.user.id, data.adminPin);
  if (!pinVerification.valid) {
    return { success: false, error: pinVerification.error || "Incorrect Admin PIN." };
  }

  const cleanApiKey = data.apiKey.trim();
  const cleanSecretKey = data.secretKey.trim();

  const encApiKey = cleanApiKey ? encrypt(cleanApiKey) : "";
  const encSecretKey = cleanSecretKey ? encrypt(cleanSecretKey) : "";

  try {
    const updateData: { apiKey: string; secretKey: string; isActive?: boolean } = {
      apiKey: encApiKey,
      secretKey: encSecretKey,
    };
    if (typeof data.isActive === "boolean") {
      updateData.isActive = data.isActive;
    }

    const updated = await db.courierConfig.upsert({
      where: { provider: "steadfast" },
      update: updateData,
      create: {
        provider: "steadfast",
        apiKey: encApiKey,
        secretKey: encSecretKey,
        isActive: data.isActive ?? false,
      },
    });

    revalidatePath("/dashboard/settings");

    return {
      success: true,
      config: {
        id: updated.id,
        provider: updated.provider,
        apiKey: cleanApiKey,
        secretKey: cleanSecretKey,
        webhookSecret: decrypt(updated.webhookSecret),
        isActive: updated.isActive,
        balance: updated.balance ? Number(updated.balance) : null,
        lastSyncedAt: updated.lastSyncedAt ? updated.lastSyncedAt.toISOString() : null,
        lastTestedAt: updated.lastTestedAt ? updated.lastTestedAt.toISOString() : null,
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
      },
    };
  } catch (err: any) {
    console.error("Failed to save Steadfast API credentials:", err);
    return { success: false, error: err.message || "Failed to save API credentials." };
  }
}

// ── 2b. Save Webhook Settings (Protected with Admin PIN) ───────────────────────
export async function saveWebhookSettings(data: {
  webhookSecret?: string;
  isActive?: boolean;
  adminPin: string;
}): Promise<{ success: boolean; error?: string; config?: CourierConfigDTO }> {
  const session = await requireAuth();

  const pinVerification = await verifyAdminPin(session.user.id, data.adminPin);
  if (!pinVerification.valid) {
    return { success: false, error: pinVerification.error || "Incorrect Admin PIN." };
  }

  const cleanWebhookSecret = (data.webhookSecret || "").trim();
  const encWebhookSecret = cleanWebhookSecret ? encrypt(cleanWebhookSecret) : "";

  try {
    const updateData: { webhookSecret: string; isActive?: boolean } = {
      webhookSecret: encWebhookSecret,
    };
    if (typeof data.isActive === "boolean") {
      updateData.isActive = data.isActive;
    }

    const updated = await db.courierConfig.upsert({
      where: { provider: "steadfast" },
      update: updateData,
      create: {
        provider: "steadfast",
        apiKey: "",
        secretKey: "",
        webhookSecret: encWebhookSecret,
        isActive: data.isActive ?? false,
      },
    });

    revalidatePath("/dashboard/settings");

    return {
      success: true,
      config: {
        id: updated.id,
        provider: updated.provider,
        apiKey: decrypt(updated.apiKey),
        secretKey: decrypt(updated.secretKey),
        webhookSecret: cleanWebhookSecret,
        isActive: updated.isActive,
        balance: updated.balance ? Number(updated.balance) : null,
        lastSyncedAt: updated.lastSyncedAt ? updated.lastSyncedAt.toISOString() : null,
        lastTestedAt: updated.lastTestedAt ? updated.lastTestedAt.toISOString() : null,
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
      },
    };
  } catch (err: any) {
    console.error("Failed to save webhook settings:", err);
    return { success: false, error: err.message || "Failed to save webhook settings." };
  }
}

// ── 2c. Save Courier Configuration (Legacy combined) ──────────────────────────
export async function saveCourierConfig(data: {
  apiKey: string;
  secretKey: string;
  webhookSecret?: string;
  isActive: boolean;
}): Promise<{ success: boolean; error?: string; config?: CourierConfigDTO }> {
  await requireAuth();

  const cleanApiKey = data.apiKey.trim();
  const cleanSecretKey = data.secretKey.trim();
  const cleanWebhookSecret = (data.webhookSecret || "").trim();

  // Encrypt sensitive credentials before persisting to database
  const encApiKey = cleanApiKey ? encrypt(cleanApiKey) : "";
  const encSecretKey = cleanSecretKey ? encrypt(cleanSecretKey) : "";
  const encWebhookSecret = cleanWebhookSecret ? encrypt(cleanWebhookSecret) : "";

  try {
    const updated = await db.courierConfig.upsert({
      where: { provider: "steadfast" },
      update: {
        apiKey: encApiKey,
        secretKey: encSecretKey,
        webhookSecret: encWebhookSecret,
        isActive: data.isActive,
      },
      create: {
        provider: "steadfast",
        apiKey: encApiKey,
        secretKey: encSecretKey,
        webhookSecret: encWebhookSecret,
        isActive: data.isActive,
      },
    });

    revalidatePath("/dashboard/settings");

    return {
      success: true,
      config: {
        id: updated.id,
        provider: updated.provider,
        apiKey: cleanApiKey,
        secretKey: cleanSecretKey,
        webhookSecret: cleanWebhookSecret,
        isActive: updated.isActive,
        balance: updated.balance ? Number(updated.balance) : null,
        lastSyncedAt: updated.lastSyncedAt ? updated.lastSyncedAt.toISOString() : null,
        lastTestedAt: updated.lastTestedAt ? updated.lastTestedAt.toISOString() : null,
        updatedAt: updated.updatedAt ? updated.updatedAt.toISOString() : null,
      },
    };
  } catch (err: any) {
    console.error("Failed to save courier config:", err);
    return { success: false, error: err.message || "Failed to save configuration." };
  }
}

// ── 2c. Disconnect Steadfast Courier ──────────────────────────────────────────
export async function disconnectSteadfastCourier(): Promise<{
  success: boolean;
  error?: string;
}> {
  await requireAuth();

  try {
    await db.courierConfig.update({
      where: { provider: "steadfast" },
      data: {
        apiKey: "",
        secretKey: "",
        balance: null,
        lastTestedAt: null,
        isActive: false,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true };
  } catch (err: any) {
    console.error("Failed to disconnect Steadfast courier:", err);
    return { success: false, error: err.message || "Failed to disconnect." };
  }
}

// ── 3. Test Steadfast Connection via /get_balance ─────────────────────────────
export async function testSteadfastConnection(
  apiKey: string,
  secretKey: string
): Promise<{ success: boolean; balance?: number; error?: string }> {
  await requireAuth();

  const cleanApiKey = apiKey.trim();
  const cleanSecretKey = secretKey.trim();

  if (!cleanApiKey || !cleanSecretKey) {
    return { success: false, error: "Both API Key and Secret Key are required to test connection." };
  }

  try {
    const res = await fetch(`${STEADFAST_API_BASE}/get_balance`, {
      method: "GET",
      headers: {
        "Api-Key": cleanApiKey,
        "Secret-Key": cleanSecretKey,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data && (data.status === 200 || data.current_balance != null || data.current_palance != null)) {
      const rawBalance = data.current_balance ?? data.current_palance ?? 0;
      const numBalance = Number(rawBalance);

      // Persist tested status & balance if config already exists
      await db.courierConfig
        .update({
          where: { provider: "steadfast" },
          data: {
            balance: numBalance,
            lastTestedAt: new Date(),
          },
        })
        .catch(() => null);

      revalidatePath("/dashboard/settings");

      return { success: true, balance: numBalance };
    }

    const errMessage =
      data?.message ||
      data?.error ||
      `Authentication failed (HTTP ${res.status}). Please check your Steadfast API Key and Secret Key.`;

    return { success: false, error: errMessage };
  } catch (err: any) {
    console.error("Steadfast connection test failed:", err);
    return {
      success: false,
      error: `Network error connecting to Steadfast: ${err.message || "Server unreachable"}`,
    };
  }
}

// ── 4. Core Sync of Pending Steadfast Orders (Shared by UI & Automated Cron) ──
export async function executeSteadfastOrderSync(batchLimit: number = 50): Promise<{
  success: boolean;
  checkedCount: number;
  updatedCount: number;
  lastSyncedAt?: string;
  error?: string;
}> {
  const config = await db.courierConfig.findUnique({
    where: { provider: "steadfast" },
  });

  if (!config || !config.apiKey || !config.secretKey) {
    return {
      success: false,
      checkedCount: 0,
      updatedCount: 0,
      error: "Steadfast API Key and Secret Key are not configured in Settings.",
    };
  }

  // Find all pending orders that have an external order ID or were marked from steadfast
  const pendingOrders = await db.order.findMany({
    where: {
      status: OrderStatus.PENDING,
      OR: [
        { externalOrderId: { not: null } },
        { consignmentId: { not: null } },
        { source: "steadfast" },
      ],
    },
    take: 50, // Batch limit per sync
  });

  if (pendingOrders.length === 0) {
    await db.courierConfig.update({
      where: { provider: "steadfast" },
      data: { lastSyncedAt: new Date() },
    });
    return {
      success: true,
      checkedCount: 0,
      updatedCount: 0,
    };
  }

  let updatedCount = 0;

  for (const order of pendingOrders) {
    const lookupId = order.consignmentId || order.externalOrderId || order.id;
    if (!lookupId) continue;

    try {
      const url = order.consignmentId
        ? `${STEADFAST_API_BASE}/status_by_cid/${order.consignmentId}`
        : `${STEADFAST_API_BASE}/status_by_invoice/${encodeURIComponent(lookupId)}`;

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Api-Key": decrypt(config.apiKey),
          "Secret-Key": decrypt(config.secretKey),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) continue;

      const data = await res.json().catch(() => null);
      if (!data || data.status !== 200) continue;

      const rawStatus = (data.delivery_status || data.status || "").toLowerCase().trim();
      if (!rawStatus) continue;

      let newStatus: OrderStatus = order.status;

      if (rawStatus.includes("deliver") && !rawStatus.includes("cancel")) {
        newStatus = OrderStatus.COMPLETED;
      } else if (rawStatus.includes("cancel") || rawStatus.includes("return")) {
        newStatus = OrderStatus.CANCELLED;
      } else if (rawStatus.includes("partial")) {
        newStatus = OrderStatus.PARTIAL;
      }

      if (newStatus !== order.status || rawStatus !== order.sourceStatusRaw) {
        await db.order.update({
          where: { id: order.id },
          data: {
            status: newStatus,
            sourceStatusRaw: rawStatus,
            source: order.source || "steadfast",
            updatedAt: new Date(),
          },
        });
        updatedCount++;
      }
    } catch (e) {
      console.warn(`Failed to sync Steadfast order ${order.id}:`, e);
    }
  }

  const syncTimestamp = new Date();
  await db.courierConfig.update({
    where: { provider: "steadfast" },
    data: { lastSyncedAt: syncTimestamp },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/businesses");
  revalidatePath("/dashboard/settings");

  return {
    success: true,
    checkedCount: pendingOrders.length,
    updatedCount,
    lastSyncedAt: syncTimestamp.toISOString(),
  };
}

/**
 * UI Server Action: Requires user login session.
 */
export async function syncSteadfastOrders(): Promise<{
  success: boolean;
  checkedCount: number;
  updatedCount: number;
  lastSyncedAt?: string;
  error?: string;
}> {
  await requireAuth();
  return executeSteadfastOrderSync();
}

export interface WebhookEventsResponseDTO {
  events: WebhookEventDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── 5. Get Recent Webhook Events (Paginated) ──────────────────────────────────
export async function getRecentWebhookEvents(
  page: number = 1,
  pageSize: number = 5
): Promise<WebhookEventsResponseDTO> {
  await requireAuth();

  const safePage = Math.max(1, page);
  const safePageSize = Math.min(Math.max(1, pageSize), 50);

  const [total, events] = await Promise.all([
    db.webhookEvent.count({
      where: { provider: "steadfast" },
    }),
    db.webhookEvent.findMany({
      where: { provider: "steadfast" },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
  ]);

  const items = events.map((ev) => {
    const p = (ev.payload as any) || {};
    const invoice = p.invoice || p.invoice_id || p.order_id || null;
    const status = p.status || p.delivery_status || null;

    return {
      id: ev.id,
      provider: ev.provider,
      eventType: ev.eventType || status || "status_update",
      invoice,
      status,
      resultStatus: ev.status,
      error: ev.error,
      createdAt: ev.createdAt.toISOString(),
      payloadSnippet: JSON.stringify(p),
    };
  });

  return {
    events: items,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}
