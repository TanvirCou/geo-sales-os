import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/actions/orders";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const order = await getOrder(id);
  return {
    title: order
      ? `Order ${order.externalOrderId || id.slice(0, 8)} — Details`
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/dashboard/orders"
          className="text-xs md:text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
        >
          ← Back to Orders
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                Order #{order.externalOrderId || order.id.slice(0, 8)}
              </h1>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  order.status === "COMPLETED"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                    : order.status === "CANCELLED"
                    ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                    : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                }`}
              >
                {order.status}
              </span>
            </div>

            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">
              Client:{" "}
              <Link
                href={`/dashboard/businesses/${order.businessId}`}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                {order.business.name}
              </Link>{" "}
              ({order.business.area || "Unspecified Area"}, {order.business.district || "Dhaka"})
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Calculated Order Total
            </span>
            <div className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-1 tabular-nums">
              BDT {order.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Order Date
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm">
              {new Date(order.orderedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Order Source
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm">
              {order.source || "Manual Entry"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Client Phone
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm font-mono">
              {order.business.phoneRaw || "—"}
            </p>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Delivery Address
            </span>
            <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1 text-sm truncate">
              {order.business.address || `${order.business.area || "Area"}, ${order.business.district || "Dhaka"}`}
            </p>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">
          Line Items ({order.items.length})
        </h2>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <th className="px-4 py-3.5">Product Description</th>
                <th className="px-4 py-3.5">SKU</th>
                <th className="px-4 py-3.5 text-right">Quantity</th>
                <th className="px-4 py-3.5 text-right">Unit Price (BDT)</th>
                <th className="px-4 py-3.5 text-right">Subtotal (BDT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                    {item.sourceProductName || item.productName || "Item"}
                  </td>
                  <td className="px-4 py-3.5">
                    <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-500/20">
                      {item.productSku || "—"}
                    </code>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-600 dark:text-slate-300 tabular-nums text-xs">
                    BDT {item.unitPriceBdt.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-slate-900 dark:text-slate-100 font-mono tabular-nums text-xs">
                    BDT {item.lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800">
                <td colSpan={4} className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-200">
                  Grand Total:
                </td>
                <td className="px-4 py-4 text-right font-extrabold text-lg text-blue-600 dark:text-blue-400 font-mono tabular-nums">
                  BDT {order.totalBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
