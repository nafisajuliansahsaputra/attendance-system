import { describe, expect, it, vi } from "vitest";
import type { AttendanceResolvedContext } from "./context-resolver";
import type { AttendanceAttemptPersistence } from "./persistence";
import { processAttendanceScan } from "./process-scan";

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

function databasePersistenceMock() {
  const persist = vi.fn<AttendanceAttemptPersistence["persist"]>().mockResolvedValue({
    mode: "database",
    deviceEventId: "event-1",
    verificationAttemptId: "verification-1",
    attendanceRecordId: "attendance-1",
  });

  return { persist };
}

describe("processAttendanceScan", () => {
  it("resolves, verifies, evaluates, then persists a successful scan", async () => {
    const resolve = vi.fn().mockResolvedValue(baseContext);
    const verify = vi.fn().mockResolvedValue({
      status: "match",
      score: 0.972,
      modelVersion: "demo-face-adapter:v1",
    });
    const persistence = databasePersistenceMock();

    const result = await processAttendanceScan(
      {
        requestId: "scan-001",
        institutionId: baseContext.institutionId,
        deviceId: baseContext.deviceId,
        rfidUid: "de:mo:10:01",
        occurredAt: "2026-09-02T23:45:00.000Z",
      },
      {
        contextResolver: { resolve },
        faceVerifier: { verify },
        persistence,
      },
    );

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledTimes(1);
    expect(result.outcome.code).toBe("ACCEPTED_ON_TIME");
    expect(result.outcome.accepted).toBe(true);
    expect(persistence.persist).toHaveBeenCalledTimes(1);
  });

  it("does not invoke face verification for an unknown RFID card", async () => {
    const resolve = vi.fn().mockResolvedValue({
      ...baseContext,
      card: { uid: "FF:FF:FF:FF", registered: false },
    });
    const verify = vi.fn();
    const persistence = databasePersistenceMock();

    const result = await processAttendanceScan(
      {
        requestId: "scan-unknown",
        institutionId: baseContext.institutionId,
        deviceId: baseContext.deviceId,
        rfidUid: "FF:FF:FF:FF",
        occurredAt: "2026-09-02T23:45:00.000Z",
      },
      {
        contextResolver: { resolve },
        faceVerifier: { verify },
        persistence,
      },
    );

    expect(verify).not.toHaveBeenCalled();
    expect(result.outcome.code).toBe("UNKNOWN_CARD");
    expect(result.outcome.accepted).toBe(false);
    expect(persistence.persist).toHaveBeenCalledTimes(1);
  });

  it("rejects a face mismatch and still persists the rejected audit attempt", async () => {
    const resolve = vi.fn().mockResolvedValue(baseContext);
    const verify = vi.fn().mockResolvedValue({
      status: "mismatch",
      score: 0.214,
      modelVersion: "demo-face-adapter:v1",
    });
    const persistence = databasePersistenceMock();

    const result = await processAttendanceScan(
      {
        requestId: "scan-mismatch",
        institutionId: baseContext.institutionId,
        deviceId: baseContext.deviceId,
        rfidUid: "DE:MO:10:01",
        occurredAt: "2026-09-02T23:45:00.000Z",
      },
      {
        contextResolver: { resolve },
        faceVerifier: { verify },
        persistence,
      },
    );

    expect(result.outcome.code).toBe("FACE_MISMATCH");
    expect(result.outcome.recordAttendance).toBe(false);
    expect(persistence.persist).toHaveBeenCalledTimes(1);
  });

  it("records NOT_REQUIRED instead of faking a face match for no-face sessions", async () => {
    const context: AttendanceResolvedContext = {
      ...baseContext,
      faceProfile: undefined,
      sessions: [
        {
          ...baseContext.sessions[0],
          faceVerificationRequired: false,
        },
      ],
    };
    const resolve = vi.fn().mockResolvedValue(context);
    const verify = vi.fn();
    const persistence = databasePersistenceMock();

    const result = await processAttendanceScan(
      {
        requestId: "scan-no-face-required",
        institutionId: context.institutionId,
        deviceId: context.deviceId,
        rfidUid: context.card.uid,
        occurredAt: "2026-09-02T23:45:00.000Z",
      },
      {
        contextResolver: { resolve },
        faceVerifier: { verify },
        persistence,
      },
    );

    expect(verify).not.toHaveBeenCalled();
    expect(result.outcome.accepted).toBe(true);
    expect(persistence.persist).toHaveBeenCalledWith(
      expect.objectContaining({ face: { status: "not_required" } }),
      expect.objectContaining({ code: "ACCEPTED_ON_TIME" }),
    );
  });
});
