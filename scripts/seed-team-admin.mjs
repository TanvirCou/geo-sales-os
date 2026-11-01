import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminCred = await prisma.adminCredential.findFirst();
  const phone = "01859594373";
  const name = adminCred?.name || "Tanvir";
  const pinHash = adminCred?.pinHash || "$2b$12$WOFVQSKTt34F6RzGYQVLpuUy2h8qxjI/SXmUygclkc0KQxIXYU3c.";

  const existing = await prisma.user.findUnique({
    where: { phone },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: "ADMIN",
        pinHash,
        isActive: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
    console.log(`✅ Admin user with phone ${phone} updated.`);
  } else {
    await prisma.user.create({
      data: {
        name,
        phone,
        role: "ADMIN",
        pinHash,
        isActive: true,
      },
    });
    console.log(`✅ Admin user created with phone: ${phone}, name: ${name}, role: ADMIN`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
