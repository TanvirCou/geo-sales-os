import crypto from "crypto";

// AES-256-GCM authenticated encryption
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 12 bytes is the standard for GCM
const PREFIX = "enc:v1:";

/**
 * Derives a deterministic 32-byte key from DATABASE_ENCRYPTION_SECRET
 * or SESSION_SECRET as fallback.
 */
function getEncryptionKey(): Buffer {
  const secret =
    process.env.DATABASE_ENCRYPTION_SECRET ||
    process.env.SESSION_SECRET ||
    "fallback_geosales_encryption_key_do_not_use_in_prod";

  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string into an authenticated ciphertext.
 * Format: enc:v1:<iv_hex>:<authTag_hex>:<cipher_hex>
 */
export function encrypt(plainText: string | null | undefined): string {
  if (!plainText || typeof plainText !== "string" || plainText.trim().length === 0) {
    return "";
  }

  // If already encrypted, avoid double-encrypting
  if (plainText.startsWith(PREFIX)) {
    return plainText;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an authenticated ciphertext string back into plaintext.
 * Gracefully handles unencrypted legacy text (returns as-is).
 */
export function decrypt(cipherText: string | null | undefined): string {
  if (!cipherText || typeof cipherText !== "string") {
    return "";
  }

  // Graceful fallback for unencrypted legacy data in database
  if (!cipherText.startsWith(PREFIX)) {
    return cipherText;
  }

  try {
    const parts = cipherText.slice(PREFIX.length).split(":");
    if (parts.length !== 3) {
      return cipherText;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Failed to decrypt sensitive field:", err);
    // If decryption fails, return as-is or empty to avoid crashing the server
    return "";
  }
}

/**
 * Checks whether a given string is currently encrypted with our format.
 */
export function isEncrypted(text: string | null | undefined): boolean {
  if (!text || typeof text !== "string") return false;
  return text.startsWith(PREFIX);
}
