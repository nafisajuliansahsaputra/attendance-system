import { describe, expect, it } from "vitest";
import { buildDemoAttempt } from "../../demo/scenarios";
import { evaluateAttendanceAttempt } from "../../domain/attendance/engine";
import { buildSupabasePersistencePayload } from "./supabase-attendance-persistence";

describe("buildSupabasePersistencePayload", () => {
  it("maps accepted attendance to the database RPC contract", () => {
    const attempt = buildDemoAttempt("verified", "request-db-success");
    const outcome = evaluateAttendanceAttempt(attempt);

    expect(buildSupabasePersistencePayload(attempt, outcome)).toEqual({
      p_institution_id: "institution-demo-001",
      p_device_id: "simulator-terminal-01",
      p_request_id: "request-db-success",
      p_occurred_at: attempt.occurredAt,
      p_student_id: "student-demo-001",
      p_occurrence_id: "session-arrival-demo",
      p_rfid_uid: "A4:B8:32:F1",
      p_verification_result: "MATCH",
      p_verification_score: 0.972,
      p_model_version: "demo-adapter-v1",
      p_outcome_code: "ACCEPTED_ON_TIME",
      p_accepted: true,
    });
  });

  it("does not invent a student verification row for an unknown RFID card", () => {
    const attempt = buildDemoAttempt("unknown-card", "request-db-unknown");
    const outcome = evaluateAttendanceAttempt(attempt);
    const payload = buildSupabasePersistencePayload(attempt, outcome);

    expect(payload.p_student_id).toBeNull();
    expect(payload.p_verification_result).toBeNull();
    expect(payload.p_outcome_code).toBe("UNKNOWN_CARD");
    expect(payload.p_accepted).toBe(false);
  });
});
