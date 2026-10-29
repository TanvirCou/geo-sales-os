"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";

export interface OrderItemInput {
  productId?: string;
  sourceProductName?: string;
  quantity: number;
  unitPriceBdt: number;
}

export interface OrderInput {
  businessId: string;
  orderedAt?: string | null;
  status?: OrderStatus;
  source?: string;
  externalOrderId?: string;
  items: OrderItemInput[];
}

export async function getOrders(params?: {
  q?: string;
  businessId?: string;
  status?: OrderStatus | "ALL";
  page?: number;
  limit?: number;
}) {
  await requireAuth();

  const businessId = params?.businessId;
  const status = params?.status && params.status !== "ALL" ? params.status : undefined;
  const q = params?.q?.trim();

  const whereClause: any = {};

  if (businessId) {
    whereClause.businessId = businessId;
  }
  if (status) {
    whereClause.status = status;
  }
  if (q) {
    whereClause.OR = [
      { externalOrderId: { contains: q, mode: "insensitive" } },
      { business: { name: { contains: q, mode: "insensitive" } } },
      { business: { area: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orders = await db.order.findMany({
    where: whereClause,
    orderBy: [
      { orderedAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    include: {
      business: {
        select: { id: true, name: true, area: true, district: true, phoneRaw: true },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          unitPriceBdt: true,
          sourceProductName: true,
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    externalOrderId: o.externalOrderId,
    businessId: o.businessId,
    businessName: o.business.name,
    businessArea: o.business.area || o.business.district || "Unspecified",
    orderedAt: o.orderedAt?.toISOString() ?? null,
    status: o.status,
    source: o.source,
    itemCount: o.items.length,
    totalBdt:
      o.totalAmountBdt != null && Number(o.totalAmountBdt) > 0
        ? Number(o.totalAmountBdt)
        : o.items.length > 0
        ? o.items.reduce(
            (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
            0
          )
        : null,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.sourceProductName || i.product?.name || "Item",
      quantity: Number(i.quantity),
      unitPriceBdt: Number(i.unitPriceBdt),
    })),
  }));
}

export async function getOrder(id: string) {
  await requireAuth();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      business: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    externalOrderId: order.externalOrderId,
    businessId: order.businessId,
    business: {
      id: order.business.id,
      name: order.business.name,
      area: order.business.area,
      district: order.business.district,
      address: order.business.address,
      phoneRaw: order.business.phoneRaw,
    },
    orderedAt: order.orderedAt?.toISOString() ?? null,
    status: order.status,
    source: order.source,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      sourceProductName: i.sourceProductName,
      productName: i.product?.name,
      productSku: i.product?.sku,
      quantity: Number(i.quantity),
      unitPriceBdt: Number(i.unitPriceBdt),
      lineTotal: Number(i.quantity) * Number(i.unitPriceBdt),
    })),
    totalBdt:
      order.totalAmountBdt != null && Number(order.totalAmountBdt) > 0
        ? Number(order.totalAmountBdt)
        : order.items.length > 0
        ? order.items.reduce(
            (sum, i) => sum + Number(i.quantity) * Number(i.unitPriceBdt),
            0
          )
        : null,
  };
}

export async function createOrder(data: OrderInput) {
  await requireAuth();

  if (!data.businessId) {
    return { error: "Business selection is required." };
  }
  if (!data.items || data.items.length === 0) {
    return { error: "At least one order line item is required." };
  }

  try {
    const order = await db.$transaction(async (tx) => {
      const ord = await tx.order.create({
        data: {
          businessId: data.businessId,
          orderedAt: data.orderedAt ? new Date(data.orderedAt) : null,
          status: data.status || OrderStatus.PENDING,
          source: data.source || "manual",
          externalOrderId: data.externalOrderId || `ORD-${Date.now().toString().slice(-6)}`,
        },
      });

      for (const item of data.items) {
        if (!item.quantity || item.quantity <= 0) continue;
        await tx.orderItem.create({
          data: {
            orderId: ord.id,
            productId: item.productId || null,
            sourceProductName: item.sourceProductName || null,
            quantity: item.quantity,
            unitPriceBdt: item.unitPriceBdt || 0,
          },
        });
      }

      return ord;
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/businesses");
    revalidatePath(`/dashboard/businesses/${data.businessId}`);
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");

    return { success: true, orderId: order.id };
  } catch (err: any) {
    return { error: err.message || "Failed to create order." };
  }
}

export async function cancelOrder(id: string) {
  await requireAuth();

  try {
    const order = await db.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${id}`);
    revalidatePath(`/dashboard/businesses/${order.businessId}`);

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to cancel order." };
  }
}

/**
 * Permanently delete a mistaken order and its line items in a transaction.
 * If this was the business's only order, the business marker color returns to RED.
 */
export async function deleteOrder(id: string) {
  await requireAuth();

  try {
    const order = await db.order.findUnique({
      where: { id },
      select: { businessId: true },
    });

    if (!order) return { error: "Order not found." };

    await db.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/businesses");
    revalidatePath(`/dashboard/businesses/${order.businessId}`);
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete order." };
  }
}
