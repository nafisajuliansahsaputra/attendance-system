import { describe, expect, it } from "vitest";
import { parseAdminDeviceDirectory } from "./supabase-devices";

describe("parseAdminDeviceDirectory", () => {
  it("accepts active and revoked device rows", () => {
    const rows = parseAdminDeviceDirectory([
      {
        id: "11111111-1111-4111-8111-111111111111",
        code: "GATE_A_01",
        name: "Terminal Gerbang",
        deviceType: "ARDUINO_BRIDGE",
        status: "ACTIVE",
        protocolVersion: "v1",
        lastSeenAt: "2026-09-03T12:00:00+00:00",
        secretConfigured: true,
        createdAt: "2026-09-01T00:00:00+00:00",
        metadata: {},
        pendingTransactions: 1,
        recentErrors24h: 0,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        code: "OLD_01",
        name: "Terminal Lama",
        deviceType: "OTHER",
        status: "REVOKED",
        protocolVersion: "v1",
        secretConfigured: false,
        createdAt: "2026-08-01T00:00:00+00:00",
        metadata: {},
        pendingTransactions: 0,
        recentErrors24h: 2,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].secretConfigured).toBe(true);
    expect(rows[1].status).toBe("REVOKED");
  });
});
