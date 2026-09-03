import { feedbackFor } from "./feedback";
import type {
  AttendanceOutcome,
  AttendanceOutcomeCode,
  ResolvedAttendanceAttempt,
} from "./types";

function toMillis(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ISO timestamp: ${value}`);
  }
  return parsed;
}

function outcome(
  input: ResolvedAttendanceAttempt,
  code: AttendanceOutcomeCode,
  message: string,
  accepted = false,
): AttendanceOutcome {
  return {
    requestId: input.requestId,
    code,
    accepted,
    recordAttendance: accepted,
    message,
    student: input.card.student,
    session: input.session
      ? { id: input.session.id, name: input.session.name, type: input.session.type }
      : undefined,
    occurredAt: input.occurredAt,
    verificationScore: input.face.score,
    feedback: feedbackFor(code),
  };
}

/**
 * Canonical pure attendance decision function.
 *
 * Adapters (web simulator, Device API, Arduino bridge, ESP32) may resolve
 * card/session/face context differently, but they must pass through this rule
 * boundary before a canonical attendance record can be created.
 */
export function evaluateAttendanceAttempt(input: ResolvedAttendanceAttempt): AttendanceOutcome {
  if (!input.card.registered || !input.card.student) {
    return outcome(input, "UNKNOWN_CARD", "Kartu RFID tidak terdaftar.");
  }

  if (input.face.status === "mismatch") {
    return outcome(input, "FACE_MISMATCH", "Wajah tidak cocok dengan pemilik kartu.");
  }

  if (input.face.status === "no_face") {
    return outcome(input, "FACE_NOT_DETECTED", "Wajah tidak terdeteksi dengan jelas.");
  }

  if (input.face.status === "low_quality") {
    return outcome(
      input,
      "FACE_LOW_QUALITY",
      "Kualitas tangkapan wajah belum cukup untuk verifikasi.",
    );
  }

  if (input.face.status === "error") {
    return outcome(input, "FACE_SERVICE_ERROR", "Verifikasi wajah tidak dapat diselesaikan.");
  }

  if (!input.session) {
    return outcome(input, "NO_ACTIVE_SESSION", "Tidak ada sesi absensi aktif untuk waktu ini.");
  }

  if (!input.session.eligible) {
    return outcome(input, "NOT_ELIGIBLE", "Siswa tidak termasuk peserta sesi absensi ini.");
  }

  if (input.duplicate) {
    return outcome(input, "DUPLICATE", "Absensi untuk sesi ini sudah tercatat.");
  }

  const occurredAt = toMillis(input.occurredAt);
  const opensAt = toMillis(input.session.opensAt);
  const closesAt = toMillis(input.session.closesAt);

  if (occurredAt < opensAt || occurredAt > closesAt) {
    return outcome(input, "OUTSIDE_SESSION_WINDOW", "Pemindaian berada di luar waktu sesi.");
  }

  if (input.session.lateAfter && occurredAt > toMillis(input.session.lateAfter)) {
    return outcome(
      input,
      "ACCEPTED_LATE",
      "Identitas terverifikasi. Absensi tercatat sebagai terlambat.",
      true,
    );
  }

  return outcome(
    input,
    "ACCEPTED_ON_TIME",
    "Identitas terverifikasi. Absensi berhasil dicatat.",
    true,
  );
}
