import { authenticator } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";
import { hashToken } from "./crypto";

// Configure TOTP standard: 6 digits, 30-second step (R-15.2-1)
authenticator.options = {
  step: 30,
  digits: 6,
  window: 1, // Allow 1 step drift before/after
};

export interface TotpSetupResult {
  secret: string;
  otpAuthUrl: string;
}

/**
 * Generates a new TOTP secret and key URI for the user.
 * In accordance with Rule R-15.2-1.
 */
export function generateTotpSecret(
  email: string,
  issuer: string = "Masaar Clinic"
): TotpSetupResult {
  const secret = authenticator.generateSecret();
  const otpAuthUrl = authenticator.keyuri(email, issuer, secret);
  return { secret, otpAuthUrl };
}

/**
 * Generates a QR Code as a base64 Data URL for Authenticator app setup.
 * In accordance with Rule R-15.2-2.
 */
export async function generateTotpQrCode(otpAuthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
  });
}

/**
 * Verifies a 6-digit TOTP code against a decrypted secret.
 * In accordance with Rule R-15.2-1 and R-15.2-3.
 */
export function verifyTotpToken(secret: string, token: string): boolean {
  if (!secret || !token) return false;
  // Clean token from spaces
  const cleanToken = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  return authenticator.verify({
    token: cleanToken,
    secret,
  });
}

/**
 * Generates 10 single-use backup codes for emergency login.
 * In accordance with Rule R-15.2-2.
 */
export function generateBackupCodes(count: number = 10): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate an 8-character uppercase alphanumeric code e.g. A3F8-99B2
    const part1 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const part2 = crypto.randomBytes(2).toString("hex").toUpperCase();
    const code = `${part1}-${part2}`;

    plainCodes.push(code);
    hashedCodes.push(hashToken(code));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies a plain backup code against stored SHA-256 hash.
 */
export function verifyBackupCode(plainCode: string, codeHash: string): boolean {
  if (!plainCode || !codeHash) return false;
  const normalized = plainCode.trim().toUpperCase();
  const computedHash = hashToken(normalized);
  return computedHash === codeHash;
}
