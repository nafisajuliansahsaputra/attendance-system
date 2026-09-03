import type { AttendanceAttemptPersistence } from "./persistence";
import type {
  AttendanceContextResolver,
  AttendanceContextInput,
} from "./context-resolver";
import {
  buildResolvedAttemptFromContext,
  selectSingleSessionCandidate,
} from "./context-resolver";
import type { FaceVerifier } from "./face-verifier";
import { processResolvedAttendanceAttempt } from "./process-resolved-attempt";

export interface ProcessAttendanceScanInput extends AttendanceContextInput {
  requestId: string;
  faceSampleReference?: string;
}

export interface ProcessAttendanceScanDependencies {
  contextResolver: AttendanceContextResolver;
  faceVerifier: FaceVerifier;
  persistence: AttendanceAttemptPersistence;
}

/**
 * Canonical application orchestration for a raw device/simulator scan.
 *
 * Resolution gathers identity/session context, the face adapter performs 1:1
 * verification when the resolved session requires it, the domain engine decides
 * attendance truth, and persistence records that decision. Hardware-specific
 * code must not bypass this path.
 */
export async function processAttendanceScan(
  input: ProcessAttendanceScanInput,
  dependencies: ProcessAttendanceScanDependencies,
) {
  const context = await dependencies.contextResolver.resolve({
    institutionId: input.institutionId,
    deviceId: input.deviceId,
    rfidUid: input.rfidUid,
    occurredAt: input.occurredAt,
  });

  const session = selectSingleSessionCandidate(context.sessions);

  const face = !context.card.student
    ? {
        status: "error" as const,
      }
    : session && !session.faceVerificationRequired
      ? {
          status: "not_required" as const,
        }
      : await dependencies.faceVerifier.verify({
          requestId: input.requestId,
          student: context.card.student,
          profile: context.faceProfile,
          sampleReference: input.faceSampleReference,
        });

  const attempt = buildResolvedAttemptFromContext({
    requestId: input.requestId,
    occurredAt: input.occurredAt,
    context,
    face,
  });

  const result = await processResolvedAttendanceAttempt(
    attempt,
    dependencies.persistence,
  );

  return {
    context,
    ...result,
  };
}
