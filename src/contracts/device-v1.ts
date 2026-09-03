import type { AttendanceOutcomeCode, FeedbackPattern } from "@/domain/attendance/types";

export const DEVICE_API_VERSION = "v1" as const;

/**
 * Every protected device request authenticates through headers:
 * - X-Device-Id: device UUID
 * - X-Protocol-Version: v1
 * - Authorization: Bearer <device secret>
 */
export interface DeviceAuthenticationHeadersV1 {
  deviceId: string;
  protocolVersion: typeof DEVICE_API_VERSION | string;
  bearerSecret: string;
}

export interface DeviceCardScanRequestV1 {
  requestId: string;
  rfidUid: string;
  occurredAt: string;
}

export type DeviceCardScanResponseV1 =
  | {
      requestId: string;
      code: "CAPTURE_FACE";
      verificationTransactionId: string;
      expiresAt: string;
    }
  | {
      requestId: string;
      code: AttendanceOutcomeCode | string;
      accepted?: boolean;
      feedback?: FeedbackPattern;
    };

/**
 * JPEG data URL/base64 is transported only for the short-lived verification
 * call. The Attendance System and face service do not persist the raw sample.
 */
export interface DeviceFaceVerifyRequestV1 {
  requestId: string;
  verificationTransactionId: string;
  imageBase64: string;
}

export interface DeviceFaceVerifyResponseV1 {
  requestId: string;
  code: AttendanceOutcomeCode | "FACE_TRANSACTION_EXPIRED" | "FACE_TRANSACTION_CANCELLED" | "FACE_SERVICE_UNAVAILABLE" | "INVALID_FACE_SAMPLE" | string;
  accepted?: boolean;
  feedback?: FeedbackPattern;
  verificationScore?: number;
  threshold?: number;
  retryable?: boolean;
  verificationTransactionId?: string;
  expiresAt?: string;
  attendanceRecordId?: string;
  replayed?: boolean;
  livenessChecked?: false;
}

export interface DeviceHeartbeatResponseV1 {
  ok: boolean;
  deviceId?: string;
  protocolVersion?: string;
  serverTime?: string;
  code?: string;
}
