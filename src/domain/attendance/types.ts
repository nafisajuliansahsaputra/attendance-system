export type FaceVerificationStatus = "match" | "mismatch" | "error" | "not_required";

export type AttendanceOutcomeCode =
  | "ACCEPTED_ON_TIME"
  | "ACCEPTED_LATE"
  | "UNKNOWN_CARD"
  | "FACE_MISMATCH"
  | "FACE_SERVICE_ERROR"
  | "NO_ACTIVE_SESSION"
  | "NOT_ELIGIBLE"
  | "DUPLICATE"
  | "OUTSIDE_SESSION_WINDOW";

export type LedState = "green" | "red" | "amber" | "off";

export interface FeedbackPattern {
  led: LedState;
  tone: "success" | "danger" | "neutral" | "error";
  beep: {
    count: number;
    durationMs: number;
    intervalMs: number;
  };
}

export interface StudentIdentity {
  id: string;
  name: string;
  className: string;
}

export interface CardResolution {
  uid: string;
  registered: boolean;
  student?: StudentIdentity;
}

export interface FaceVerificationResolution {
  status: FaceVerificationStatus;
  score?: number;
  modelVersion?: string;
}

export interface SessionResolution {
  id: string;
  name: string;
  type: "arrival" | "departure" | "dhuha" | "dzuhur" | "ashar" | "ceremony" | "activity" | "custom";
  opensAt: string;
  lateAfter?: string;
  closesAt: string;
  eligible: boolean;
}

export interface ResolvedAttendanceAttempt {
  requestId: string;
  institutionId: string;
  deviceId: string;
  occurredAt: string;
  card: CardResolution;
  face: FaceVerificationResolution;
  session?: SessionResolution;
  duplicate: boolean;
}

export interface AttendanceOutcome {
  requestId: string;
  code: AttendanceOutcomeCode;
  accepted: boolean;
  recordAttendance: boolean;
  message: string;
  student?: StudentIdentity;
  session?: Pick<SessionResolution, "id" | "name" | "type">;
  occurredAt: string;
  verificationScore?: number;
  feedback: FeedbackPattern;
}
