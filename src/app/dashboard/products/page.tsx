import type { Metadata } from "next";
import { getProducts } from "@/actions/products";
import ProductListClient from "@/components/products/ProductListClient";

export const metadata: Metadata = { title: "Products — Business Sales" };

export default async function ProductsPage() {
  const products = await getProducts({ isActive: true });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Product Catalog & Pricing
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage products, SKUs, and unit prices. Historical order line items remain unchanged when catalog prices are updated.
        </p>
      </div>

      <ProductListClient initialProducts={products} />
    </div>
  );
}
