#!/usr/bin/env node
/**
 * Seeds the admin credential into the database.
 * Run AFTER applying Prisma migrations.
 *
 * Usage: node scripts/seed-admin.mjs
 *
 * The PIN hash is read from ADMIN_PIN_HASH in .env.local
 * To generate a hash, first run: node scripts/hash-pin.mjs 123456
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local manually (Prisma client doesn't auto-load it in scripts)
function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  try {
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn("⚠️  Could not read .env.local — using existing environment variables.");
  }
}

loadEnv();

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const pinHash = process.env.ADMIN_PIN_HASH;
  if (!pinHash) {
    console.error("❌  ADMIN_PIN_HASH not set in .env.local");
    console.error("    Run: node scripts/hash-pin.mjs 123456  to generate one.");
    process.exit(1);
  }

  // Upsert: only one admin credential record
  const existing = await prisma.adminCredential.findFirst();
  if (existing) {
    await prisma.adminCredential.update({
      where: { id: existing.id },
      data: { pinHash, failedAttempts: 0, lockedUntil: null },
    });
    console.log("✅  Admin credential updated.");
  } else {
    await prisma.adminCredential.create({ data: { pinHash } });
    console.log("✅  Admin credential created.");
  }
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
