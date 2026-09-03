import {
  selectSingleSessionCandidate,
  type AttendanceResolvedContext,
  type SessionCandidate,
} from "../attendance/context-resolver";

export type DeviceCardStageCode =
  | "CAPTURE_FACE"
  | "ACCEPT_WITHOUT_FACE"
  | "UNKNOWN_CARD"
  | "NO_ACTIVE_SESSION"
  | "NOT_ELIGIBLE"
  | "DUPLICATE_ATTENDANCE"
  | "FACE_PROFILE_MISSING";

export type DeviceStageEventType =
  | "RFID_SCANNED"
  | "UNKNOWN_CARD"
  | "NOT_ELIGIBLE"
  | "OUTSIDE_SESSION"
  | "ATTENDANCE_DUPLICATE"
  | "DEVICE_ERROR";

export interface DeviceCardStageResolution {
  code: DeviceCardStageCode;
  eventType: DeviceStageEventType;
  session?: SessionCandidate;
}

/**
 * Pure stage-one resolver for a physical device card scan.
 *
 * This function decides only whether stage one can continue. It does not create
 * attendance and never lets a device choose its own student/session outcome.
 */
export function resolveDeviceCardStage(
  context: AttendanceResolvedContext,
): DeviceCardStageResolution {
  if (!context.card.registered || !context.card.student) {
    return {
      code: "UNKNOWN_CARD",
      eventType: "UNKNOWN_CARD",
    };
  }

  const session = selectSingleSessionCandidate(context.sessions);

  if (!session) {
    return {
      code: "NO_ACTIVE_SESSION",
      eventType: "OUTSIDE_SESSION",
    };
  }

  if (!session.eligible) {
    return {
      code: "NOT_ELIGIBLE",
      eventType: "NOT_ELIGIBLE",
      session,
    };
  }

  if (session.duplicate) {
    return {
      code: "DUPLICATE_ATTENDANCE",
      eventType: "ATTENDANCE_DUPLICATE",
      session,
    };
  }

  if (!session.faceVerificationRequired) {
    return {
      code: "ACCEPT_WITHOUT_FACE",
      eventType: "RFID_SCANNED",
      session,
    };
  }

  if (!context.faceProfile) {
    return {
      code: "FACE_PROFILE_MISSING",
      eventType: "DEVICE_ERROR",
      session,
    };
  }

  return {
    code: "CAPTURE_FACE",
    eventType: "RFID_SCANNED",
    session,
  };
}
