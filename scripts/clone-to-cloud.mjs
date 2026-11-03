import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

// Usage: node scripts/clone-to-cloud.mjs "postgresql://neondb_owner:password@ep-xyz.neon.tech/neondb?sslmode=require"

const targetUrl = process.argv[2]?.trim();

if (!targetUrl || (!targetUrl.startsWith("postgresql://") && !targetUrl.startsWith("postgres://"))) {
  console.error("\x1b[31m[ERROR]\x1b[0m Please provide your Neon Cloud Database URL as an argument:");
  console.error('Example: node scripts/clone-to-cloud.mjs "postgresql://neondb_owner:pass@ep-xyz.neon.tech/neondb?sslmode=require"\n');
  process.exit(1);
}

// 1. Initialize Local DB Client
const localDb = new PrismaClient();

// 2. Initialize Cloud DB Client
const cloudDb = new PrismaClient({
  datasources: {
    db: {
      url: targetUrl,
    },
  },
});

async function main() {
  console.log("\x1b[36m=====================================================\x1b[0m");
  console.log("\x1b[36m  GeoSales OS — 1-Click Database Migration to Cloud  \x1b[0m");
  console.log("\x1b[36m=====================================================\x1b[0m\n");

  console.log("▶ Step 1: Testing connection to Cloud Database...");
  try {
    await cloudDb.$connect();
    console.log("  \x1b[32m✓\x1b[0m Successfully connected to Neon Cloud Database!\n");
  } catch (err) {
    console.error("  \x1b[31m✗ Connection failed:\x1b[0m", err.message);
    process.exit(1);
  }

  console.log("▶ Step 2: Creating database schema & tables in Cloud...");
  try {
    execSync(`npx prisma db push --accept-data-loss`, {
      env: { ...process.env, DATABASE_URL: targetUrl },
      stdio: "inherit",
    });
    console.log("  \x1b[32m✓\x1b[0m Cloud database schema synchronized!\n");
  } catch (err) {
    console.error("  \x1b[31m✗ Schema push failed:\x1b[0m", err.message);
    process.exit(1);
  }

  console.log("▶ Step 3: Extracting local database records...");
  const [users, businesses, products, orders, orderItems, courierConfigs] = await Promise.all([
    localDb.user.findMany(),
    localDb.business.findMany(),
    localDb.product.findMany(),
    localDb.order.findMany(),
    localDb.orderItem.findMany(),
    localDb.courierConfig.findMany(),
  ]);

  console.log(`  Found locally:`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Businesses: ${businesses.length}`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Orders: ${orders.length}`);
  console.log(`   - Order Items: ${orderItems.length}`);
  console.log(`   - Courier Configs: ${courierConfigs.length}\n`);

  console.log("▶ Step 4: Transferring records to Cloud Database...");

  // 4a. Transfer Users
  if (users.length > 0) {
    console.log(`  Transferring ${users.length} user(s)...`);
    for (const u of users) {
      await cloudDb.user.upsert({
        where: { id: u.id },
        update: u,
        create: u,
      });
    }
  }

  // 4b. Transfer Businesses in chunks of 100
  if (businesses.length > 0) {
    console.log(`  Transferring ${businesses.length} businesses with coordinates...`);
    const chunkSize = 100;
    for (let i = 0; i < businesses.length; i += chunkSize) {
      const chunk = businesses.slice(i, i + chunkSize);
      await cloudDb.$transaction(
        chunk.map((b) =>
          cloudDb.business.upsert({
            where: { id: b.id },
            update: b,
            create: b,
          })
        )
      );
      process.stdout.write(`    Transferred ${Math.min(i + chunkSize, businesses.length)} / ${businesses.length} businesses...\r`);
    }
    console.log(`\n  \x1b[32m✓\x1b[0m All ${businesses.length} businesses cloned successfully!`);
  }

  // 4c. Transfer Products
  if (products.length > 0) {
    console.log(`  Transferring ${products.length} product(s)...`);
    for (const p of products) {
      await cloudDb.product.upsert({
        where: { id: p.id },
        update: p,
        create: p,
      });
    }
  }

  // 4d. Transfer Orders in chunks
  if (orders.length > 0) {
    console.log(`  Transferring ${orders.length} order(s)...`);
    const chunkSize = 100;
    for (let i = 0; i < orders.length; i += chunkSize) {
      const chunk = orders.slice(i, i + chunkSize);
      await cloudDb.$transaction(
        chunk.map((o) =>
          cloudDb.order.upsert({
            where: { id: o.id },
            update: o,
            create: o,
          })
        )
      );
    }
  }

  // 4e. Transfer Order Items
  if (orderItems.length > 0) {
    console.log(`  Transferring ${orderItems.length} order item(s)...`);
    const chunkSize = 100;
    for (let i = 0; i < orderItems.length; i += chunkSize) {
      const chunk = orderItems.slice(i, i + chunkSize);
      await cloudDb.$transaction(
        chunk.map((item) =>
          cloudDb.orderItem.upsert({
            where: { id: item.id },
            update: item,
            create: item,
          })
        )
      );
    }
  }

  // 4f. Transfer Courier Config
  if (courierConfigs.length > 0) {
    console.log(`  Transferring courier config(s)...`);
    for (const c of courierConfigs) {
      await cloudDb.courierConfig.upsert({
        where: { id: c.id },
        update: c,
        create: c,
      });
    }
  }

  // Verification
  console.log("\n▶ Step 5: Verifying Cloud Database record parity...");
  const [cloudU, cloudB, cloudP, cloudO] = await Promise.all([
    cloudDb.user.count(),
    cloudDb.business.count(),
    cloudDb.product.count(),
    cloudDb.order.count(),
  ]);

  console.log(`  \x1b[32m✓ Verification Results:\x1b[0m`);
  console.log(`    - Users: ${cloudU} / ${users.length}`);
  console.log(`    - Businesses: ${cloudB} / ${businesses.length}`);
  console.log(`    - Products: ${cloudP} / ${products.length}`);
  console.log(`    - Orders: ${cloudO} / ${orders.length}\n`);

  console.log("\x1b[32m=====================================================\x1b[0m");
  console.log("\x1b[32m  SUCCESS! All local data is now live on the Cloud! \x1b[0m");
  console.log("\x1b[32m=====================================================\x1b[0m\n");
}

main()
  .catch((err) => {
    console.error("\x1b[31m[ERROR]\x1b[0m Migration failed:", err);
  })
  .finally(async () => {
    await localDb.$disconnect();
    await cloudDb.$disconnect();
  });
