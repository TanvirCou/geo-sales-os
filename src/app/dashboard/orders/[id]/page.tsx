import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrder } from "@/actions/orders";
import { requireAuth } from "@/actions/auth";
import { db } from "@/lib/db";
import OrderDetailClient from "@/components/orders/OrderDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrder(id);
  return {
    title: order
      ? `Order #${order.externalOrderId || id.slice(0, 8)} — Order Details`
      : "Order Not Found",
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const [order, products] = await Promise.all([
    getOrder(id),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, priceBdt: true, unit: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) {
    notFound();
  }

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    priceBdt: p.priceBdt != null ? Number(p.priceBdt) : null,
    unit: p.unit,
  }));

  return (
    <OrderDetailClient
      order={order}
      products={productOptions}
      userRole={session.user.role}
      userPermissions={session.user.permissions}
    />
  );
}
