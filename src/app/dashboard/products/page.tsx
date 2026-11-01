import type { Metadata } from "next";
import { getProducts } from "@/actions/products";
import { getSession } from "@/lib/auth";
import ProductListClient from "@/components/products/ProductListClient";

export const metadata: Metadata = { title: "Products — GeoSales OS" };

export default async function ProductsPage() {
  const [products, session] = await Promise.all([
    getProducts({}),
    getSession(),
  ]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Product Catalog &amp; Pricing
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Master inventory and pricing catalog. Manage product specifications, default rates, and SKU categories for field sales and order processing.
        </p>
      </div>

      <ProductListClient
        initialProducts={products}
        userRole={session?.user.role}
        userPermissions={session?.user.permissions}
      />
    </div>
  );
}
