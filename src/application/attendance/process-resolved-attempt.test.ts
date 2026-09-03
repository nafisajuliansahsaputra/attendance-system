import { describe, expect, it, vi } from "vitest";
import { buildDemoAttempt } from "../../demo/scenarios";
import type { AttendanceAttemptPersistence } from "./persistence";
import { processResolvedAttendanceAttempt } from "./process-resolved-attempt";

describe("processResolvedAttendanceAttempt", () => {
  it("persists the canonical accepted outcome exactly once", async () => {
    const persist = vi.fn<AttendanceAttemptPersistence["persist"]>().mockResolvedValue({
      mode: "database",
      attendanceRecordId: "attendance-1",
      deviceEventId: "event-1",
      verificationAttemptId: "verification-1",
    });

    const attempt = buildDemoAttempt("verified", "request-success");
    const result = await processResolvedAttendanceAttempt(attempt, { persist });

    expect(result.outcome.code).toBe("ACCEPTED_ON_TIME");
    expect(result.outcome.accepted).toBe(true);
    expect(result.persistence.attendanceRecordId).toBe("attendance-1");
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith(attempt, result.outcome);
  });

  it("also persists rejected attempts for audit without creating attendance", async () => {
    const persist = vi.fn<AttendanceAttemptPersistence["persist"]>().mockResolvedValue({
      mode: "database",
      deviceEventId: "event-rejected",
      verificationAttemptId: "verification-rejected",
    });

    const attempt = buildDemoAttempt("face-mismatch", "request-rejected");
    const result = await processResolvedAttendanceAttempt(attempt, { persist });

    expect(result.outcome.code).toBe("FACE_MISMATCH");
    expect(result.outcome.accepted).toBe(false);
    expect(result.outcome.recordAttendance).toBe(false);
    expect(result.persistence.attendanceRecordId).toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
