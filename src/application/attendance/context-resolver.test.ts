import { describe, expect, it } from "vitest";
import type { AttendanceResolvedContext, SessionCandidate } from "./context-resolver";
import {
  AmbiguousAttendanceSessionError,
  buildResolvedAttemptFromContext,
  selectSingleSessionCandidate,
} from "./context-resolver";

const arrival: SessionCandidate = {
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
};

const context: AttendanceResolvedContext = {
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
  sessions: [arrival],
};

describe("attendance context session selection", () => {
  it("builds the canonical attempt from one resolved session", () => {
    const attempt = buildResolvedAttemptFromContext({
      requestId: "context-test-001",
      occurredAt: "2026-09-02T23:45:00.000Z",
      context,
      face: { status: "match", score: 0.97, modelVersion: "demo-v1" },
    });

    expect(attempt.session?.type).toBe("arrival");
    expect(attempt.session?.eligible).toBe(true);
    expect(attempt.duplicate).toBe(false);
    expect(attempt.institutionId).toBe(context.institutionId);
  });

  it("returns no session when there are no candidates", () => {
    expect(selectSingleSessionCandidate([])).toBeUndefined();
  });

  it("fails closed when multiple sessions overlap until routing policy is defined", () => {
    const ceremony: SessionCandidate = {
      ...arrival,
      id: "88888888-8888-4888-8888-888888888003",
      name: "Upacara",
      type: "ceremony",
      scheduleRelationship: "ADDITIVE",
    };

    expect(() => selectSingleSessionCandidate([arrival, ceremony])).toThrow(
      AmbiguousAttendanceSessionError,
    );
  });
});
