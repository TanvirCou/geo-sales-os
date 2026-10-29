import type { Metadata } from "next";
import { getProducts } from "@/actions/products";
import ProductListClient from "@/components/products/ProductListClient";

export const metadata: Metadata = { title: "Products — GeoSales OS" };

export default async function ProductsPage() {
  const products = await getProducts({ isActive: true });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Product Catalog & Pricing
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Master catalog for printing & branding collateral. Since items sell at customized rates per business, unit prices are flexibly defined per order.
        </p>
      </div>

      <ProductListClient initialProducts={products} />
    </div>
  );
}
