import { describe, expect, it } from "vitest";
import {
  MAX_DEVICE_SCAN_AGE_MS,
  MAX_DEVICE_SCAN_FUTURE_MS,
  validateDeviceScanTime,
} from "./request-time";

const now = Date.parse("2026-09-03T12:00:00.000Z");

describe("validateDeviceScanTime", () => {
  it("accepts a recent device event", () => {
    expect(
      validateDeviceScanTime("2026-09-03T11:55:00.000Z", now),
    ).toEqual({ ok: true });
  });

  it("rejects replay that is older than the allowed retry window", () => {
    const occurredAt = new Date(now - MAX_DEVICE_SCAN_AGE_MS - 1).toISOString();

    expect(validateDeviceScanTime(occurredAt, now)).toEqual({
      ok: false,
      reason: "TOO_OLD",
    });
  });

  it("rejects a clock that is too far in the future", () => {
    const occurredAt = new Date(now + MAX_DEVICE_SCAN_FUTURE_MS + 1).toISOString();

    expect(validateDeviceScanTime(occurredAt, now)).toEqual({
      ok: false,
      reason: "TOO_FAR_IN_FUTURE",
    });
  });

  it("rejects malformed timestamps", () => {
    expect(validateDeviceScanTime("not-a-date", now)).toEqual({
      ok: false,
      reason: "INVALID_TIMESTAMP",
    });
  });
});
