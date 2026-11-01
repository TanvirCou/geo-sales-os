"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { hasPermission } from "@/lib/permissions";
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
          productId: true,
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
      o.totalAmountBdt != null && !isNaN(Number(o.totalAmountBdt))
        ? Number(o.totalAmountBdt)
        : o.items.length > 0
        ? o.items.reduce(
            (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
            0
          )
        : null,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
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
      category: order.business.category,
      area: order.business.area,
      district: order.business.district,
      address: order.business.address,
      phoneRaw: order.business.phoneRaw,
      contactName: order.business.contactName,
      latitude: order.business.latitude != null ? Number(order.business.latitude) : null,
      longitude: order.business.longitude != null ? Number(order.business.longitude) : null,
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
      order.totalAmountBdt != null && !isNaN(Number(order.totalAmountBdt))
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
  const session = await requireAuth();
  if (!hasPermission(session.user, "canRecordOrder")) {
    return { error: "Unauthorized: You do not have permission to record orders." };
  }

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

export interface UpdateOrderInput {
  id: string;
  orderedAt?: string | null;
  status?: OrderStatus;
  externalOrderId?: string | null;
  totalAmountBdt?: number | null;
  isDirectTotal?: boolean;
  items?: {
    productId?: string | null;
    sourceProductName?: string | null;
    quantity: number;
    unitPriceBdt: number;
  }[];
}

export async function updateOrder(data: UpdateOrderInput) {
  const session = await requireAuth();
  if (!hasPermission(session.user, "canUpdateOrder")) {
    return { error: "Unauthorized: You do not have permission to update orders." };
  }

  if (!data.id) {
    return { error: "Order ID is required." };
  }

  try {
    const existingOrder = await db.order.findUnique({
      where: { id: data.id },
      include: { items: true },
    });

    if (!existingOrder) {
      return { error: "Order not found." };
    }

    const isDirect = data.isDirectTotal ?? (!data.items || data.items.length === 0);

    let calculatedTotal: number = 0;
    if (isDirect) {
      if (data.totalAmountBdt != null && !isNaN(Number(data.totalAmountBdt))) {
        calculatedTotal = Number(data.totalAmountBdt);
      } else if (existingOrder.totalAmountBdt != null) {
        calculatedTotal = Number(existingOrder.totalAmountBdt);
      }
    } else {
      calculatedTotal = (data.items || []).reduce((sum, item) => {
        const q = Number(item.quantity) || 0;
        const p = Number(item.unitPriceBdt) || 0;
        return sum + q * p;
      }, 0);
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: data.id },
        data: {
          orderedAt: data.orderedAt ? new Date(data.orderedAt) : null,
          status: data.status || existingOrder.status,
          externalOrderId: data.externalOrderId?.trim() || existingOrder.externalOrderId,
          totalAmountBdt: calculatedTotal,
        },
      });

      await tx.orderItem.deleteMany({
        where: { orderId: data.id },
      });

      if (!isDirect && data.items && data.items.length > 0) {
        for (const item of data.items) {
          if (!item.quantity || Number(item.quantity) <= 0) continue;
          await tx.orderItem.create({
            data: {
              orderId: data.id,
              productId: item.productId || null,
              sourceProductName: item.sourceProductName?.trim() || null,
              quantity: Number(item.quantity),
              unitPriceBdt: Number(item.unitPriceBdt) || 0,
            },
          });
        }
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath(`/dashboard/orders/${data.id}`);
    revalidatePath("/dashboard/businesses");
    revalidatePath(`/dashboard/businesses/${existingOrder.businessId}`);
    revalidatePath("/dashboard/map/google");
    revalidatePath("/dashboard/map/geoapify");

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update order." };
  }
}

export async function cancelOrder(id: string) {
  const session = await requireAuth();
  if (!hasPermission(session.user, "canUpdateOrder")) {
    return { error: "Unauthorized: You do not have permission to update or cancel orders." };
  }

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
  const session = await requireAuth();
  if (!hasPermission(session.user, "canDeleteOrder")) {
    return { error: "Unauthorized: Only administrators have permission to delete orders." };
  }

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
