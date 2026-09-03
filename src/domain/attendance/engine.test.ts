import { describe, expect, it } from "vitest";
import { buildDemoAttempt } from "../../demo/scenarios";
import { evaluateAttendanceAttempt } from "./engine";

const id = "test-request";

describe("evaluateAttendanceAttempt", () => {
  it("accepts a verified on-time attendance", () => {
    const result = evaluateAttendanceAttempt(buildDemoAttempt("verified", id));
    expect(result.code).toBe("ACCEPTED_ON_TIME");
    expect(result.recordAttendance).toBe(true);
    expect(result.feedback.led).toBe("green");
    expect(result.feedback.beep.count).toBe(1);
  });

  it("marks a verified late attendance as late", () => {
    const result = evaluateAttendanceAttempt(buildDemoAttempt("late", id));
    expect(result.code).toBe("ACCEPTED_LATE");
    expect(result.recordAttendance).toBe(true);
  });

  it("rejects face mismatch with the original rapid red alarm", () => {
    const result = evaluateAttendanceAttempt(buildDemoAttempt("face-mismatch", id));
    expect(result.code).toBe("FACE_MISMATCH");
    expect(result.recordAttendance).toBe(false);
    expect(result.feedback.led).toBe("red");
    expect(result.feedback.beep.count).toBeGreaterThan(1);
    expect(result.feedback.beep.intervalMs).toBeLessThan(100);
  });

  it("rejects a missing face without using the buddy-punching alarm pattern", () => {
    const attempt = buildDemoAttempt("verified", id);
    attempt.face = { status: "no_face", modelVersion: "test-model" };
    const result = evaluateAttendanceAttempt(attempt);

    expect(result.code).toBe("FACE_NOT_DETECTED");
    expect(result.recordAttendance).toBe(false);
    expect(result.feedback.led).toBe("red");
    expect(result.feedback.beep.intervalMs).toBeGreaterThanOrEqual(100);
  });

  it("rejects low-quality face capture without recording attendance", () => {
    const attempt = buildDemoAttempt("verified", id);
    attempt.face = { status: "low_quality", modelVersion: "test-model" };
    const result = evaluateAttendanceAttempt(attempt);

    expect(result.code).toBe("FACE_LOW_QUALITY");
    expect(result.recordAttendance).toBe(false);
  });

  it("does not create attendance for an unknown card", () => {
    const result = evaluateAttendanceAttempt(buildDemoAttempt("unknown-card", id));
    expect(result.code).toBe("UNKNOWN_CARD");
    expect(result.recordAttendance).toBe(false);
  });

  it("does not mark a non-target student absent or present", () => {
    const result = evaluateAttendanceAttempt(buildDemoAttempt("not-eligible", id));
    expect(result.code).toBe("NOT_ELIGIBLE");
    expect(result.recordAttendance).toBe(false);
  });

  it("keeps duplicate scans out of canonical attendance creation", () => {
    const result = evaluateAttendanceAttempt(buildDemoAttempt("duplicate", id));
    expect(result.code).toBe("DUPLICATE");
    expect(result.recordAttendance).toBe(false);
  });

  it("does not create attendance when no session is active", () => {
    const result = evaluateAttendanceAttempt(buildDemoAttempt("outside-session", id));
    expect(result.code).toBe("NO_ACTIVE_SESSION");
    expect(result.recordAttendance).toBe(false);
  });
});
