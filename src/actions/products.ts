"use server";

import { db } from "@/lib/db";
import { requireAuth } from "./auth";
import { revalidatePath } from "next/cache";

export interface ProductInput {
  name: string;
  sku?: string;
  unit?: string;
  priceBdt?: number | null;
}

export async function getProducts(params?: { q?: string; isActive?: boolean }) {
  await requireAuth();

  const isActive = params?.isActive !== undefined ? params.isActive : true;
  const q = params?.q?.trim();

  const whereClause: any = { isActive };

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }

  const products = await db.product.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { orderItems: true },
      },
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    priceBdt: p.priceBdt != null ? Number(p.priceBdt) : null,
    isActive: p.isActive,
    orderItemCount: p._count.orderItems,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function createProduct(data: ProductInput) {
  await requireAuth();

  if (!data.name || data.name.trim().length === 0) {
    return { error: "Product name is required." };
  }
  if (data.priceBdt != null && (isNaN(data.priceBdt) || data.priceBdt < 0)) {
    return { error: "Price must be a non-negative number if provided." };
  }

  try {
    const product = await db.product.create({
      data: {
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        unit: data.unit?.trim() || null,
        priceBdt: data.priceBdt != null ? data.priceBdt : null,
        isActive: true,
      },
    });

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/orders");
    return { success: true, productId: product.id };
  } catch (err: any) {
    return { error: err.message || "Failed to create product." };
  }
}

export async function updateProduct(id: string, data: ProductInput) {
  await requireAuth();

  if (!data.name || data.name.trim().length === 0) {
    return { error: "Product name is required." };
  }
  if (data.priceBdt != null && (isNaN(data.priceBdt) || data.priceBdt < 0)) {
    return { error: "Price must be a non-negative number if provided." };
  }

  try {
    await db.product.update({
      where: { id },
      data: {
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        unit: data.unit?.trim() || null,
        priceBdt: data.priceBdt != null ? data.priceBdt : null,
      },
    });

    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/orders");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to update product." };
  }
}

/**
 * Product hard delete: allowed only if no order_items reference it.
 * Otherwise prompt to archive (preserving historical line items).
 */
export async function deleteProduct(id: string) {
  await requireAuth();

  const product = await db.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });

  if (!product) {
    return { error: "Product not found." };
  }

  if (product._count.orderItems > 0) {
    return {
      error: `Cannot hard delete: this product is referenced in ${product._count.orderItems} historical order item(s). Use Archive instead to preserve historical invoices.`,
      canArchive: true,
    };
  }

  try {
    await db.product.delete({ where: { id } });
    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete product." };
  }
}

export async function archiveProduct(id: string) {
  await requireAuth();

  try {
    await db.product.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to archive product." };
  }
}

export async function restoreProduct(id: string) {
  await requireAuth();

  try {
    await db.product.update({
      where: { id },
      data: { isActive: true },
    });
    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to restore product." };
  }
}
