import { describe, expect, it } from "vitest";
import {
  AmbiguousAttendanceSessionError,
  type AttendanceResolvedContext,
} from "../attendance/context-resolver";
import { resolveDeviceCardStage } from "./card-stage";

const baseContext: AttendanceResolvedContext = {
  institutionId: "11111111-1111-4111-8111-111111111111",
  deviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
  schoolDate: "2026-09-03",
  timezone: "Asia/Jakarta",
  card: {
    uid: "DE:MO:10:01",
    registered: true,
    student: {
      id: "22222222-2222-4222-8222-222222222001",
      name: "Alya Pratama",
      className: "X RPL 1",
    },
  },
  faceProfile: {
    id: "55555555-5555-4555-8555-555555555001",
    modelName: "demo-face-adapter",
    modelVersion: "v1",
    templateReference: "demo://face/alya-pratama",
  },
  sessions: [
    {
      id: "88888888-8888-4888-8888-888888888001",
      name: "Masuk Sekolah",
      type: "arrival",
      opensAt: "2026-09-02T23:00:00.000Z",
      lateAfter: "2026-09-03T00:00:00.000Z",
      closesAt: "2026-09-03T00:30:00.000Z",
      eligible: true,
      duplicate: false,
      faceVerificationRequired: true,
      scheduleRelationship: "NORMAL",
    },
  ],
};

describe("resolveDeviceCardStage", () => {
  it("requests face capture for an eligible face-required session", () => {
    expect(resolveDeviceCardStage(baseContext).code).toBe("CAPTURE_FACE");
  });

  it("allows the canonical no-face path only when the session disables face verification", () => {
    const result = resolveDeviceCardStage({
      ...baseContext,
      sessions: [
        {
          ...baseContext.sessions[0],
          faceVerificationRequired: false,
        },
      ],
    });

    expect(result.code).toBe("ACCEPT_WITHOUT_FACE");
    expect(result.eventType).toBe("RFID_SCANNED");
  });

  it("rejects an unknown RFID card before session work", () => {
    const result = resolveDeviceCardStage({
      ...baseContext,
      card: { uid: "FF:FF:FF:FF", registered: false },
    });

    expect(result.code).toBe("UNKNOWN_CARD");
    expect(result.eventType).toBe("UNKNOWN_CARD");
  });

  it("returns no-active-session when no occurrence matches", () => {
    expect(resolveDeviceCardStage({ ...baseContext, sessions: [] }).code).toBe(
      "NO_ACTIVE_SESSION",
    );
  });

  it("rejects a non-target student", () => {
    const result = resolveDeviceCardStage({
      ...baseContext,
      sessions: [{ ...baseContext.sessions[0], eligible: false }],
    });

    expect(result.code).toBe("NOT_ELIGIBLE");
  });

  it("rejects duplicate canonical attendance", () => {
    const result = resolveDeviceCardStage({
      ...baseContext,
      sessions: [{ ...baseContext.sessions[0], duplicate: true }],
    });

    expect(result.code).toBe("DUPLICATE_ATTENDANCE");
  });

  it("fails closed if a face-required student has no active face profile", () => {
    const result = resolveDeviceCardStage({
      ...baseContext,
      faceProfile: undefined,
    });

    expect(result.code).toBe("FACE_PROFILE_MISSING");
    expect(result.eventType).toBe("DEVICE_ERROR");
  });

  it("inherits the existing fail-closed rule for ambiguous sessions", () => {
    expect(() =>
      resolveDeviceCardStage({
        ...baseContext,
        sessions: [baseContext.sessions[0], { ...baseContext.sessions[0], id: "88888888-8888-4888-8888-888888888002" }],
      }),
    ).toThrow(AmbiguousAttendanceSessionError);
  });
});
