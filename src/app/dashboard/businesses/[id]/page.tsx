import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness } from "@/actions/businesses";
import { db } from "@/lib/db";
import BusinessDetailClient from "@/components/businesses/BusinessDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const business = await getBusiness(id);
  return { title: business ? `${business.name} — Business Details` : "Business Not Found" };
}

export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [business, products, allBusinesses] = await Promise.all([
    getBusiness(id),
    db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, priceBdt: true, unit: true },
      orderBy: { name: "asc" },
    }),
    db.business.findMany({
      where: { isActive: true },
      select: { id: true, name: true, area: true, district: true, phoneRaw: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!business) {
    notFound();
  }

  const productOptions = products.map((p) => ({
    id: p.id,
    name: p.name,
    priceBdt: Number(p.priceBdt),
    unit: p.unit,
  }));

  return (
    <BusinessDetailClient
      business={business}
      products={productOptions}
      businesses={allBusinesses}
    />
  );
}
