import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrder } from "@/actions/orders";
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
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) {
    notFound();
  }

  return <OrderDetailClient order={order} />;
}
