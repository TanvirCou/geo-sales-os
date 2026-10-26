#!/usr/bin/env node
/**
 * Hash a 6-digit PIN and print the result.
 * Usage: node scripts/hash-pin.mjs 123456
 *
 * Copy the output into .env.local as ADMIN_PIN_HASH=<hash>
 */

import { createHash } from "crypto";

// Use dynamic import for bcryptjs
const { default: bcrypt } = await import("bcryptjs");

const pin = process.argv[2];

if (!pin || !/^\d{6}$/.test(pin)) {
  console.error("Usage: node scripts/hash-pin.mjs <6-digit-PIN>");
  process.exit(1);
}

const hash = await bcrypt.hash(pin, 12);
console.log("\n✅  PIN hashed successfully!\n");
console.log("Add this to your .env.local:");
console.log(`ADMIN_PIN_HASH="${hash}"\n`);
