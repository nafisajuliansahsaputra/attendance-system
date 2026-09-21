import { createHash, randomBytes, randomInt } from "node:crypto";

const pairingAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizePairingCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashPairingCode(value: string): string {
  const normalized = normalizePairingCode(value);
  return `sha256:${createHash("sha256").update(normalized, "utf8").digest("hex")}`;
}

export function generatePairingCode(): string {
  let body = "";
  for (let index = 0; index < 10; index += 1) {
    body += pairingAlphabet[randomInt(0, pairingAlphabet.length)];
  }

  return `A12-${body.slice(0, 5)}-${body.slice(5)}`;
}

export function generateDeviceSecret(): string {
  return `ats_dev_${randomBytes(32).toString("base64url")}`;
}
