import type {
  FaceVerificationResolution,
  ResolvedAttendanceAttempt,
} from "../../domain/attendance/types";

export type FaceServiceStageStatus =
  | "MATCH"
  | "MISMATCH"
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "LOW_QUALITY";

export function mapFaceServiceStatus(input: {
  status: FaceServiceStageStatus;
  score?: number | null;
  modelVersion: string;
}): FaceVerificationResolution {
  switch (input.status) {
    case "MATCH":
      return {
        status: "match",
        score: input.score ?? undefined,
        modelVersion: input.modelVersion,
      };
    case "MISMATCH":
      return {
        status: "mismatch",
        score: input.score ?? undefined,
        modelVersion: input.modelVersion,
      };
    case "NO_FACE":
      return { status: "no_face", modelVersion: input.modelVersion };
    case "MULTIPLE_FACES":
    case "LOW_QUALITY":
      return { status: "low_quality", modelVersion: input.modelVersion };
  }
}

export interface FaceTransactionAttemptContext {
  requestId: string;
  institutionId: string;
  deviceId: string;
  occurredAt: string;
  rfidUid: string;
  student: {
    id: string;
    name: string;
    className: string;
  };
  session: ResolvedAttendanceAttempt["session"];
}

export function buildFaceTransactionAttempt(input: {
  context: FaceTransactionAttemptContext;
  face: FaceVerificationResolution;
}): ResolvedAttendanceAttempt {
  return {
    requestId: input.context.requestId,
    institutionId: input.context.institutionId,
    deviceId: input.context.deviceId,
    occurredAt: input.context.occurredAt,
    card: {
      uid: input.context.rfidUid,
      registered: true,
      student: input.context.student,
    },
    face: input.face,
    session: input.context.session,
    duplicate: false,
  };
}
