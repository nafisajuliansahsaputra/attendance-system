import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  DeviceAuthenticationError,
  hashDeviceSecret,
  parseDeviceCredentialHeaders,
} from "./authenticate-device-request";

describe("device request credentials", () => {
  it("hashes the plaintext device secret without storing the plaintext form", () => {
    const secret = "ats_dev_this-is-a-synthetic-test-secret-123456";
    const expected = createHash("sha256").update(secret, "utf8").digest("hex");

    expect(hashDeviceSecret(secret)).toBe(`sha256:${expected}`);
    expect(hashDeviceSecret(secret)).not.toContain(secret);
  });

  it("parses the required v1 authentication headers", () => {
    const headers = new Headers({
      Authorization: "Bearer ats_dev_this-is-a-synthetic-test-secret-123456",
      "X-Device-Id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
      "X-Protocol-Version": "v1",
    });

    expect(parseDeviceCredentialHeaders(headers)).toEqual({
      deviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
      protocolVersion: "v1",
      secret: "ats_dev_this-is-a-synthetic-test-secret-123456",
    });
  });

  it("fails generically when credentials are incomplete", () => {
    expect(() => parseDeviceCredentialHeaders(new Headers())).toThrow(
      DeviceAuthenticationError,
    );
  });

  it("fails generically for malformed device ids", () => {
    const headers = new Headers({
      Authorization: "Bearer ats_dev_this-is-a-synthetic-test-secret-123456",
      "X-Device-Id": "terminal-01",
      "X-Protocol-Version": "v1",
    });

    expect(() => parseDeviceCredentialHeaders(headers)).toThrow(
      DeviceAuthenticationError,
    );
  });
});
