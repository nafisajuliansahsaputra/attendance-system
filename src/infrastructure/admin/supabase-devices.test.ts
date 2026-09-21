import { describe, expect, it } from "vitest";
import { parseAdminDeviceDirectory } from "./supabase-devices";

describe("parseAdminDeviceDirectory", () => {
  it("accepts production lifecycle state for active and revoked devices", () => {
    const rows = parseAdminDeviceDirectory([
      {
        id: "11111111-1111-4111-8111-111111111111",
        code: "GATE_A_01",
        name: "Terminal Gerbang",
        deviceType: "ARDUINO_BRIDGE",
        status: "ACTIVE",
        protocolVersion: "v1",
        location: "Gerbang utama",
        lastSeenAt: "2026-09-03T12:00:00+00:00",
        lastHeartbeatAt: "2026-09-03T12:00:00+00:00",
        pairedAt: "2026-09-01T08:00:00+00:00",
        credentialRotatedAt: null,
        secretConfigured: true,
        pairingStatus: "PAIRED",
        connectionStatus: "ONLINE",
        pairingExpiresAt: null,
        lastEventAt: "2026-09-03T12:00:00+00:00",
        lastAttendanceAt: "2026-09-03T11:58:00+00:00",
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
        location: null,
        lastSeenAt: null,
        lastHeartbeatAt: null,
        pairedAt: null,
        credentialRotatedAt: null,
        secretConfigured: false,
        pairingStatus: "REVOKED",
        connectionStatus: "INACTIVE",
        pairingExpiresAt: null,
        lastEventAt: null,
        lastAttendanceAt: null,
        createdAt: "2026-08-01T00:00:00+00:00",
        metadata: {},
        pendingTransactions: 0,
        recentErrors24h: 2,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].secretConfigured).toBe(true);
    expect(rows[0].connectionStatus).toBe("ONLINE");
    expect(rows[1].status).toBe("REVOKED");
    expect(rows[1].location).toBeUndefined();
  });
});
