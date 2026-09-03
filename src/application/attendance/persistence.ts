import type {
  AttendanceOutcome,
  ResolvedAttendanceAttempt,
} from "../../domain/attendance/types";

export interface PersistAttendanceResult {
  mode: "ephemeral" | "database";
  attendanceRecordId?: string;
  deviceEventId?: string;
  verificationAttemptId?: string;
}

/**
 * Persistence boundary for one fully resolved attendance attempt.
 *
 * Implementations are responsible for preserving the raw/audit attempt and,
 * only when the canonical outcome is accepted, creating the canonical
 * attendance record idempotently.
 */
export interface AttendanceAttemptPersistence {
  persist(
    attempt: ResolvedAttendanceAttempt,
    outcome: AttendanceOutcome,
  ): Promise<PersistAttendanceResult>;
}
