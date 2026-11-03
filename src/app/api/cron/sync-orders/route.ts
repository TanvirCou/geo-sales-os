import { NextRequest, NextResponse } from "next/server";
import { executeSteadfastOrderSync } from "@/actions/courier";
import { db } from "@/lib/db";

// Force dynamic execution for scheduled cron jobs
export const dynamic = "force-dynamic";

/**
 * Automated Cron Job Endpoint:
 * Triggered twice daily by Vercel Cron:
 * 1. 5:00 PM BST (11:00 UTC)
 * 2. 2:00 AM BST (20:00 UTC)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Verify CRON_SECRET if configured in production environment
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing CRON_SECRET token." },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // Execute core order sync for pending orders
    const result = await executeSteadfastOrderSync(100);

    // Record audit event in database for visibility in Settings
    await db.webhookEvent.create({
      data: {
        provider: "steadfast_cron",
        eventType: "scheduled_sync",
        status: result.success ? "success" : "failed",
        error: result.error || null,
        payload: {
          scheduledTimes: "5:00 PM & 2:00 AM BST",
          durationMs: Date.now() - startTime,
          checkedCount: result.checkedCount,
          updatedCount: result.updatedCount,
          lastSyncedAt: result.lastSyncedAt,
        },
      },
    }).catch((e) => {
      console.warn("Failed to record cron audit log:", e.message);
    });

    return NextResponse.json({
      success: true,
      service: "Steadfast Automated Cron Sync",
      timestamp: new Date().toISOString(),
      executionDurationMs: Date.now() - startTime,
      checkedCount: result.checkedCount,
      updatedCount: result.updatedCount,
      lastSyncedAt: result.lastSyncedAt,
    });
  } catch (error: any) {
    console.error("Cron sync error:", error);

    await db.webhookEvent.create({
      data: {
        provider: "steadfast_cron",
        eventType: "scheduled_sync_error",
        status: "failed",
        error: error.message || "Unknown error during automated cron sync.",
        payload: {
          errorStack: error.stack,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute automated cron sync.",
      },
      { status: 500 }
    );
  }
}
