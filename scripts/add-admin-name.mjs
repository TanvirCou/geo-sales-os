import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.$executeRawUnsafe(`ALTER TABLE "admin_credentials" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255) DEFAULT 'Admin User';`);
  const creds = await db.$queryRawUnsafe(`SELECT * FROM "admin_credentials" LIMIT 1;`);
  console.log("Admin creds row:", creds);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
