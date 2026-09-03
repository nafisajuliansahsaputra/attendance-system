import type {
  AttendanceAttemptPersistence,
  PersistAttendanceResult,
} from "../../application/attendance/persistence";
import type {
  AttendanceOutcome,
  FaceVerificationStatus,
  ResolvedAttendanceAttempt,
} from "../../domain/attendance/types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

interface PersistResolvedAttemptRpcRow {
  device_event_id: string | null;
  verification_attempt_id: string | null;
  attendance_record_id: string | null;
}

export function toDatabaseVerificationResult(status: FaceVerificationStatus): string {
  switch (status) {
    case "match":
      return "MATCH";
    case "mismatch":
      return "MISMATCH";
    case "no_face":
      return "NO_FACE";
    case "low_quality":
      return "LOW_QUALITY";
    case "error":
      return "SERVICE_ERROR";
    case "not_required":
      return "NOT_REQUIRED";
  }
}

export function buildSupabasePersistencePayload(
  attempt: ResolvedAttendanceAttempt,
  outcome: AttendanceOutcome,
): Record<string, unknown> {
  return {
    p_institution_id: attempt.institutionId,
    p_device_id: attempt.deviceId,
    p_request_id: attempt.requestId,
    p_occurred_at: attempt.occurredAt,
    p_student_id: attempt.card.student?.id ?? null,
    p_occurrence_id: attempt.session?.id ?? null,
    p_rfid_uid: attempt.card.uid,
    p_verification_result: attempt.card.student
      ? toDatabaseVerificationResult(attempt.face.status)
      : null,
    p_verification_score: attempt.face.score ?? null,
    p_model_version: attempt.face.modelVersion ?? null,
    p_outcome_code: outcome.code,
    p_accepted: outcome.accepted,
  };
}

/**
 * Production/server adapter. Real secrets are provided only through server
 * environment variables and are never stored in this repository.
 */
export class SupabaseAttendancePersistence implements AttendanceAttemptPersistence {
  async persist(
    attempt: ResolvedAttendanceAttempt,
    outcome: AttendanceOutcome,
  ): Promise<PersistAttendanceResult> {
    const rows = await callSupabaseAdminRpc<PersistResolvedAttemptRpcRow[]>(
      "persist_resolved_attendance_attempt",
      buildSupabasePersistencePayload(attempt, outcome),
    );

    const row = rows[0];
    if (!row?.device_event_id) {
      throw new Error("Supabase attendance persistence returned no device event id.");
    }

    return {
      mode: "database",
      deviceEventId: row.device_event_id,
      verificationAttemptId: row.verification_attempt_id ?? undefined,
      attendanceRecordId: row.attendance_record_id ?? undefined,
    };
  }
}
