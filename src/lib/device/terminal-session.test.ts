import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  generateTerminalSessionToken,
  hashTerminalSessionToken,
  readTerminalSessionToken,
  TERMINAL_SESSION_COOKIE,
} from "./terminal-session";

describe("hosted terminal session helpers", () => {
  it("generates a high-entropy terminal session token", () => {
    const first = generateTerminalSessionToken();
    const second = generateTerminalSessionToken();

    expect(first).toMatch(/^ats_terminal_[A-Za-z0-9_-]{40,}$/);
    expect(second).not.toBe(first);
  });

  it("hashes terminal session tokens without persisting plaintext", () => {
    const token = "ats_terminal_synthetic-token-for-test-1234567890";
    const expected = createHash("sha256").update(token, "utf8").digest("hex");

    expect(hashTerminalSessionToken(token)).toBe(`sha256:${expected}`);
    expect(hashTerminalSessionToken(token)).not.toContain(token);
  });

  it("reads only the dedicated terminal cookie", () => {
    const headers = new Headers({
      cookie: `other=value; ${TERMINAL_SESSION_COOKIE}=ats_terminal_synthetic-session-token-123456; theme=light`,
    });

    expect(readTerminalSessionToken(headers)).toBe(
      "ats_terminal_synthetic-session-token-123456",
    );
  });

  it("returns null when the terminal cookie is absent", () => {
    expect(readTerminalSessionToken(new Headers())).toBeNull();
  });
});
