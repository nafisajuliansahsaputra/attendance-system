import { describe, expect, it } from "vitest";
import {
  generateDeviceSecret,
  generatePairingCode,
  hashPairingCode,
  normalizePairingCode,
} from "./pairing";

describe("device pairing helpers", () => {
  it("normalizes human-friendly pairing codes before hashing", () => {
    expect(normalizePairingCode("a12-abcd-2345")).toBe("A12ABCD2345");
    expect(hashPairingCode("A12-ABCDE-23456")).toBe(
      hashPairingCode("a12 abcde 23456"),
    );
  });

  it("generates an A12-prefixed 10-character one-time pairing code", () => {
    const code = generatePairingCode();

    expect(code).toMatch(/^A12-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
    expect(normalizePairingCode(code)).toHaveLength(13);
  });

  it("generates long device secrets suitable for bearer authentication", () => {
    const first = generateDeviceSecret();
    const second = generateDeviceSecret();

    expect(first).toMatch(/^ats_dev_[A-Za-z0-9_-]{40,}$/);
    expect(second).not.toBe(first);
  });
});
