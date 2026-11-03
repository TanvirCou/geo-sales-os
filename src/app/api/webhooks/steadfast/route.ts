import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { decrypt } from "@/lib/encryption";
import { resolveDualGeocoding } from "@/lib/geocoding";
import { extractDistrictFromText } from "@/lib/district-resolver";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Steadfast Courier Webhook Listener",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  let body: any = null;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Empty or invalid body" }, { status: 400 });
  }

  // 1. Verify Authentication if webhookSecret is configured
  const config = await db.courierConfig.findUnique({
    where: { provider: "steadfast" },
  });

  const configuredSecret = config?.webhookSecret ? decrypt(config.webhookSecret) : "";

  if (configuredSecret) {
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const customHeaderToken = req.headers.get("x-webhook-secret") || "";
    const queryToken = req.nextUrl.searchParams.get("token") || "";

    const providedToken = bearerToken || customHeaderToken || queryToken;

    if (providedToken !== configuredSecret) {
      await db.webhookEvent.create({
        data: {
          provider: "steadfast",
          eventType: "unauthorized_attempt",
          payload: body,
          status: "failed",
          error: "Webhook authorization token mismatch.",
        },
      });

      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing webhook token." },
        { status: 401 }
      );
    }
  }

  // 2. Parse payload values
  const consignmentId = body.consignment_id ?? body.consignmentId ?? null;
  const invoice = (body.invoice ?? body.invoice_id ?? body.order_id ?? "").toString().trim();
  const rawStatus = (body.status ?? body.delivery_status ?? "").toString().toLowerCase().trim();
  const codAmount = body.cod_amount ?? body.codAmount ?? null;

  // 3. Map Steadfast status to internal OrderStatus
  let targetStatus: OrderStatus | null = null;

  if (rawStatus.includes("deliver") && !rawStatus.includes("cancel") && !rawStatus.includes("return")) {
    targetStatus = OrderStatus.COMPLETED;
  } else if (rawStatus.includes("cancel") || rawStatus.includes("return")) {
    targetStatus = OrderStatus.CANCELLED;
  } else if (rawStatus.includes("partial")) {
    targetStatus = OrderStatus.PARTIAL;
  } else if (
    rawStatus.includes("pending") ||
    rawStatus.includes("in_review") ||
    rawStatus.includes("hold") ||
    rawStatus.includes("picked")
  ) {
    targetStatus = OrderStatus.PENDING;
  }

  // 4. Find matching Order in database
  const orderWhereConditions: any[] = [];

  if (invoice) {
    orderWhereConditions.push({ externalOrderId: invoice });
    orderWhereConditions.push({ id: invoice });
  }
  if (consignmentId) {
    orderWhereConditions.push({ consignmentId: String(consignmentId) });
  }

  let matchedOrder = null;

  if (orderWhereConditions.length > 0) {
    matchedOrder = await db.order.findFirst({
      where: {
        OR: orderWhereConditions,
      },
    });
  }

  // 5. Update Order if matched
  let resultStatus = "ignored";
  let processingError: string | null = null;

  if (matchedOrder && targetStatus) {
    try {
      await db.order.update({
        where: { id: matchedOrder.id },
        data: {
          status: targetStatus,
          sourceStatusRaw: rawStatus,
          source: matchedOrder.source || "steadfast",
          consignmentId: consignmentId ? String(consignmentId) : matchedOrder.consignmentId,
          codAmount: codAmount != null ? Number(codAmount) : matchedOrder.codAmount,
          updatedAt: new Date(),
        },
      });

      resultStatus = "processed";

      // Refresh dashboard analytics and order lists
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/orders");
      revalidatePath("/dashboard/businesses");
      revalidatePath("/dashboard/map/geoapify");
      revalidatePath("/dashboard/map/google");
      revalidatePath("/dashboard/settings");

      // Update courier config lastSyncedAt timestamp on incoming live webhook event
      await db.courierConfig
        .update({
          where: { provider: "steadfast" },
          data: { lastSyncedAt: new Date() },
        })
        .catch(() => null);
    } catch (updateErr: any) {
      resultStatus = "failed";
      processingError = updateErr.message || "Failed to update order in database";
    }
  } else if (!matchedOrder) {
    const recipientName = (body.recipient_name ?? body.customer_name ?? "").toString().trim();
    const recipientPhone = (body.recipient_phone ?? body.customer_phone ?? "").toString().trim();
    const recipientAddress = (body.recipient_address ?? body.customer_address ?? "").toString().trim();

    if ((invoice || consignmentId) && recipientName && recipientPhone) {
      try {
        const phoneNorm = recipientPhone.replace(/\D/g, "");
        const existingBiz = await db.business.findFirst({
          where: {
            OR: [
              phoneNorm ? { phoneNormalized: phoneNorm } : undefined,
              { name: { equals: recipientName, mode: "insensitive" } },
            ].filter(Boolean) as any,
          },
        });

        let bizId = existingBiz?.id;
        if (!bizId) {
          const dual = await resolveDualGeocoding(recipientName, recipientAddress, { mode: "BOTH" });
          const district = extractDistrictFromText(dual.primaryFormattedAddress || recipientAddress);

          const newBiz = await db.business.create({
            data: {
              name: recipientName,
              address: dual.primaryFormattedAddress || recipientAddress,
              phoneRaw: recipientPhone,
              phoneNormalized: phoneNorm,
              district,
              area: recipientAddress.split(",")[0]?.trim() || district,
              latitude: dual.primaryLatitude,
              longitude: dual.primaryLongitude,
              osmLatitude: dual.osm?.latitude,
              osmLongitude: dual.osm?.longitude,
              osmPlaceId: dual.osm?.placeId,
              osmFormattedAddress: dual.osm?.formattedAddress,
              googleLatitude: dual.google?.latitude,
              googleLongitude: dual.google?.longitude,
              googlePlaceId: dual.google?.placeId,
              googleFormattedAddress: dual.google?.formattedAddress,
              placeProvider: dual.google?.latitude != null ? "google" : "geoapify",
              coordinateSource: "webhook_dual_geocoded",
              isActive: true,
            },
          });
          bizId = newBiz.id;
        }

        const extId = invoice || String(consignmentId);
        matchedOrder = await db.order.create({
          data: {
            businessId: bizId,
            source: "steadfast",
            externalOrderId: extId,
            consignmentId: consignmentId ? String(consignmentId) : null,
            status: targetStatus || OrderStatus.PENDING,
            sourceStatusRaw: rawStatus,
            codAmount: codAmount != null ? Number(codAmount) : null,
            totalAmountBdt: codAmount != null ? Number(codAmount) : null,
          },
        });

        resultStatus = "processed";
        revalidatePath("/dashboard");
        revalidatePath("/dashboard/orders");
        revalidatePath("/dashboard/businesses");
        revalidatePath("/dashboard/map/geoapify");
        revalidatePath("/dashboard/map/google");
      } catch (createErr: any) {
        processingError = createErr.message || "Failed to auto-create customer and order from webhook";
      }
    } else {
      processingError = `No order found matching invoice: "${invoice}" or consignmentId: "${consignmentId}"`;
    }
  } else if (!targetStatus) {
    processingError = `Unrecognized status string: "${rawStatus}"`;
  }

  // 6. Log the webhook event for admin visibility
  await db.webhookEvent.create({
    data: {
      provider: "steadfast",
      eventType: rawStatus || "status_update",
      payload: body,
      status: resultStatus,
      error: processingError,
    },
  });

  return NextResponse.json({
    status: "success",
    matched: !!matchedOrder,
    orderId: matchedOrder?.id || null,
    newStatus: targetStatus || null,
  });
}
