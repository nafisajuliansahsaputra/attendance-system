import type {
  CardResolution,
  FaceVerificationResolution,
  ResolvedAttendanceAttempt,
  SessionResolution,
} from "../../domain/attendance/types";

export interface AttendanceContextInput {
  institutionId: string;
  deviceId: string;
  rfidUid: string;
  occurredAt: string;
}

export interface FaceProfileReference {
  id: string;
  modelName: string;
  modelVersion: string;
  templateReference?: string;
}

export interface SessionCandidate extends SessionResolution {
  duplicate: boolean;
  faceVerificationRequired: boolean;
  scheduleRelationship: "NORMAL" | "ADDITIVE" | "REPLACE_NORMAL" | "CANCEL_NORMAL";
}

export interface AttendanceResolvedContext {
  institutionId: string;
  deviceId: string;
  schoolDate: string;
  timezone: string;
  card: CardResolution;
  faceProfile?: FaceProfileReference;
  sessions: SessionCandidate[];
}

export interface AttendanceContextResolver {
  resolve(input: AttendanceContextInput): Promise<AttendanceResolvedContext>;
}

export class AmbiguousAttendanceSessionError extends Error {
  constructor(public readonly sessions: SessionCandidate[]) {
    super(`Multiple attendance sessions match the scan time (${sessions.length}).`);
    this.name = "AmbiguousAttendanceSessionError";
  }
}

export function selectSingleSessionCandidate(
  sessions: SessionCandidate[],
): SessionCandidate | undefined {
  if (sessions.length === 0) {
    return undefined;
  }

  if (sessions.length > 1) {
    throw new AmbiguousAttendanceSessionError(sessions);
  }

  return sessions[0];
}

export function buildResolvedAttemptFromContext(input: {
  requestId: string;
  occurredAt: string;
  context: AttendanceResolvedContext;
  face: FaceVerificationResolution;
}): ResolvedAttendanceAttempt {
  const candidate = selectSingleSessionCandidate(input.context.sessions);

  return {
    requestId: input.requestId,
    institutionId: input.context.institutionId,
    deviceId: input.context.deviceId,
    occurredAt: input.occurredAt,
    card: input.context.card,
    face: input.face,
    session: candidate
      ? {
          id: candidate.id,
          name: candidate.name,
          type: candidate.type,
          opensAt: candidate.opensAt,
          lateAfter: candidate.lateAfter,
          closesAt: candidate.closesAt,
          eligible: candidate.eligible,
        }
      : undefined,
    duplicate: candidate?.duplicate ?? false,
  };
}
