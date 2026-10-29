import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "products" ALTER COLUMN "price_bdt" DROP NOT NULL;`);
  console.log("✅ Successfully dropped NOT NULL constraint on products.price_bdt");
}

main()
  .catch((e) => {
    console.error("Error altering table:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
