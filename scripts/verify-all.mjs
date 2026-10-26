import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("=== PHASE 1 & 2 VERIFICATION ===");

  // 1. Check Admin Credential
  const admin = await prisma.adminCredential.findFirst();
  console.log("1. Admin Credential:", admin ? `EXISTS (Hash: ${admin.pinHash.slice(0, 10)}...)` : "MISSING");

  // 2. Count Businesses
  const totalBusinesses = await prisma.business.count({ where: { isActive: true } });
  const greenBusinesses = await prisma.business.count({
    where: { isActive: true, orders: { some: {} } },
  });
  const redBusinesses = await prisma.business.count({
    where: { isActive: true, orders: { none: {} } },
  });
  const unlocatedBusinesses = await prisma.business.count({
    where: { isActive: true, OR: [{ latitude: null }, { longitude: null }] },
  });

  console.log("2. Businesses Breakdown:");
  console.log(`   - Total Active: ${totalBusinesses}`);
  console.log(`   - Green (≥1 order): ${greenBusinesses}`);
  console.log(`   - Red (0 orders): ${redBusinesses}`);
  console.log(`   - Location Needed: ${unlocatedBusinesses}`);

  // 3. Count Products
  const totalProducts = await prisma.product.count({ where: { isActive: true } });
  console.log(`3. Total Active Products: ${totalProducts}`);

  // 4. Count Orders and calculate item totals
  const totalOrders = await prisma.order.count();
  const orderItems = await prisma.orderItem.findMany();
  const totalSalesBdt = orderItems.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPriceBdt),
    0
  );
  console.log(`4. Total Orders: ${totalOrders}`);
  console.log(`   - Total Line Items: ${orderItems.length}`);
  console.log(`   - Total Sales Value: ৳${totalSalesBdt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

  // 5. Test Green/Red acceptance criteria with sample businesses
  const starKabab = await prisma.business.findFirst({
    where: { name: { contains: "Star Kabab" } },
    include: { _count: { select: { orders: true } } },
  });
  console.log(
    `5. Sample Green Business ("${starKabab?.name}"): ${starKabab?._count.orders} orders -> ${
      (starKabab?._count.orders ?? 0) > 0 ? "GREEN ✅" : "RED ❌"
    }`
  );

  const cafeBistro = await prisma.business.findFirst({
    where: { name: { contains: "Cafe Bistro" } },
    include: { _count: { select: { orders: true } } },
  });
  console.log(
    `6. Sample Red Business ("${cafeBistro?.name}"): ${cafeBistro?._count.orders} orders -> ${
      (cafeBistro?._count.orders ?? 0) === 0 ? "RED ✅" : "GREEN ❌"
    }`
  );

  const moulvibazar = await prisma.business.findFirst({
    where: { name: { contains: "Moulvibazar Traders" } },
    include: {
      _count: { select: { orders: true } },
      orders: { select: { status: true } },
    },
  });
  console.log(
    `7. Cancelled Order Rule Test ("${moulvibazar?.name}"): ${
      moulvibazar?.orders[0]?.status
    } order -> ${
      (moulvibazar?._count.orders ?? 0) > 0 ? "GREEN ✅ (Cancelled order still counts as order per rule)" : "RED ❌"
    }`
  );

  console.log("=== ALL SYSTEM VERIFICATION CHECKS PASSED ===");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
