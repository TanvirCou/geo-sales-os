import type { Metadata } from "next";
import { getOrders } from "@/actions/orders";
import { db } from "@/lib/db";
import { requireAuth } from "@/actions/auth";
import { getSession } from "@/lib/auth";
import OrderListClient from "@/components/orders/OrderListClient";

export const metadata: Metadata = { title: "Orders — GeoSales OS" };

export default async function OrdersPage() {
  await requireAuth();

  const [orders, businesses, products, session] = await Promise.all([
    getOrders(),
    db.business.findMany({
      where: { isActive: true },
      select: { id: true, name: true, area: true },
      orderBy: { name: "asc" },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, priceBdt: true, unit: true },
      orderBy: { name: "asc" },
    }),
    getSession(),
  ]);

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    priceBdt: Number(p.priceBdt),
    unit: p.unit,
  }));

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Orders &amp; Field Invoices
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage client sales orders, monitor delivery and payment statuses, and review field invoice records across all accounts.
        </p>
      </div>

      <OrderListClient
        initialOrders={orders}
        businesses={businesses}
        products={productOptions}
        userRole={session?.user.role}
        userPermissions={session?.user.permissions}
      />
    </div>
  );
}
