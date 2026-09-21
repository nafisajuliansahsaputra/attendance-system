import { createHash, randomBytes } from "node:crypto";

export const TERMINAL_SESSION_COOKIE = "attendance_terminal_session";
export const TERMINAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function generateTerminalSessionToken(): string {
  return `ats_terminal_${randomBytes(32).toString("base64url")}`;
}

export function hashTerminalSessionToken(token: string): string {
  return `sha256:${createHash("sha256").update(token, "utf8").digest("hex")}`;
}

export function readTerminalSessionToken(headers: Headers): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName !== TERMINAL_SESSION_COOKIE) continue;

    const value = rawValue.join("=");
    if (!value) return null;

    try {
      const decoded = decodeURIComponent(value).trim();
      return decoded.length >= 24 && decoded.length <= 512 ? decoded : null;
    } catch {
      return null;
    }
  }

  return null;
}
