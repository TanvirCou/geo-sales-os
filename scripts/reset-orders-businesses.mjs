import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking current database counts...");
  const orderItemsBefore = await prisma.orderItem.count();
  const ordersBefore = await prisma.order.count();
  const businessesBefore = await prisma.business.count();
  const batchesBefore = await prisma.importBatch.count();
  const productsCount = await prisma.product.count();
  const adminsCount = await prisma.adminCredential.count();

  console.log(`Before Reset:`);
  console.log(`- Order Items: ${orderItemsBefore}`);
  console.log(`- Orders: ${ordersBefore}`);
  console.log(`- Businesses: ${businessesBefore}`);
  console.log(`- Import Batches: ${batchesBefore}`);
  console.log(`- Products (preserved): ${productsCount}`);
  console.log(`- Admins (preserved): ${adminsCount}`);

  console.log("\nResetting order and business data...");
  const delItems = await prisma.orderItem.deleteMany();
  console.log(`✓ Deleted ${delItems.count} order items.`);

  const delOrders = await prisma.order.deleteMany();
  console.log(`✓ Deleted ${delOrders.count} orders.`);

  const delBusinesses = await prisma.business.deleteMany();
  console.log(`✓ Deleted ${delBusinesses.count} businesses.`);

  const delBatches = await prisma.importBatch.deleteMany();
  console.log(`✓ Deleted ${delBatches.count} import batches.`);

  console.log("\nVerifying database state after reset...");
  const ordersAfter = await prisma.order.count();
  const businessesAfter = await prisma.business.count();
  const orderItemsAfter = await prisma.orderItem.count();

  console.log(`After Reset:`);
  console.log(`- Businesses: ${businessesAfter}`);
  console.log(`- Orders: ${ordersAfter}`);
  console.log(`- Order Items: ${orderItemsAfter}`);

  console.log("\nReset completed successfully! Ready for fresh import.");
}

main()
  .catch((err) => {
    console.error("Error during reset:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
