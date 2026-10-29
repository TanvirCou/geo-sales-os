import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const cfg = require("./seed-config.json");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding hospitality businesses...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.business.deleteMany();
  await prisma.product.deleteMany();

  // Products
  const cp = [];
  for (const p of cfg.products) {
    cp.push(await prisma.product.create({ data: { name: p.name, sku: p.sku, unit: p.unit, priceBdt: null } }));
  }
  console.log("Products:", cp.length);

  // Businesses — all hospitality type
  const cb = [];
  for (const b of cfg.businesses) {
    cb.push(await prisma.business.create({
      data: {
        name: b.name,
        category: b.category,
        area: b.area,
        district: b.district,
        contactName: b.contactName,
        phoneRaw: b.phoneRaw,
        phoneNormalized: b.phoneNormalized,
        address: b.address,
        latitude: b.latitude,
        longitude: b.longitude,
        coordinateSource: b.latitude ? "manual_verified" : null,
        isActive: true,
      }
    }));
  }
  console.log("Businesses:", cb.length);

  // Orders — every business has >= 1 order (all are green clients)
  const cr = {
    "Menu Book":       { v: [390,420,480,520], q: [10,15,20,25] },
    "Menu Card":       { v: [75,95,110,130],   q: [30,50,80,100] },
    "Bill Fold":       { v: [280,310,350,400], q: [10,15,20,30] },
    "Membership Card": { v: [30,40,45,55],     q: [100,200,300,500] },
    "Visiting Card":   { v: [200,250,280,320], q: [4,6,8,10] },
    "Liflet":          { v: [1.8,2.2,2.6,3.0], q: [500,1000,1500,2000] },
    "X-banner":        { v: [1050,1200,1350,1500], q: [1,2,3,5] },
    "Sticker":         { v: [2.5,3.5,4.2,5.0], q: [200,500,1000,2000] },
  };

  let oc = 0, ic = 0;
  for (let i = 0; i < cb.length; i++) {
    const b = cb[i];
    // Every client business has at least 1 order
    const no = (i % 3) + 1;
    for (let o = 0; o < no; o++) {
      const d = new Date();
      d.setDate(d.getDate() - ((i * 3 + o * 4 + 1) % 60));
      const ord = await prisma.order.create({
        data: {
          businessId: b.id,
          orderedAt: d,
          status: o === 0 && i % 4 === 0 ? "PENDING" : "COMPLETED",
          source: "manual",
          externalOrderId: "ORD-2026-" + (1000 + oc),
        }
      });
      oc++;
      const p1 = cp[(i + o) % cp.length];
      const p2 = cp[(i + o + 3) % cp.length];
      const r1 = cr[p1.name];
      const r2 = cr[p2.name];
      await prisma.orderItem.create({ data: { orderId: ord.id, productId: p1.id, sourceProductName: p1.name, quantity: r1.q[(i+o)%4], unitPriceBdt: r1.v[(i+o)%4] } });
      ic++;
      if (o % 2 === 0) {
        await prisma.orderItem.create({ data: { orderId: ord.id, productId: p2.id, sourceProductName: p2.name, quantity: r2.q[(i+o+1)%4], unitPriceBdt: r2.v[(i+o+2)%4] } });
        ic++;
      }
    }
  }
  console.log("Done! Orders:", oc, "Items:", ic);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
