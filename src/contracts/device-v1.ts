import type { AttendanceOutcomeCode, FeedbackPattern } from "@/domain/attendance/types";

export const DEVICE_API_VERSION = "v1" as const;

/** First message a physical RFID terminal or local serial bridge will submit. */
export interface DeviceCardScanRequestV1 {
  apiVersion: typeof DEVICE_API_VERSION;
  requestId: string;
  deviceId: string;
  uid: string;
  capturedAt: string;
}

/**
 * The gateway may ask the terminal to capture a face after card/student/session
 * resolution. The exact image transport is intentionally left behind an adapter
 * until biometric retention and face-service choices are finalized.
 */
export type DeviceNextActionV1 =
  | { action: "capture_face"; transactionId: string }
  | { action: "finish"; code: AttendanceOutcomeCode; feedback: FeedbackPattern };

export interface DeviceFinalOutcomeV1 {
  apiVersion: typeof DEVICE_API_VERSION;
  requestId: string;
  transactionId: string;
  code: AttendanceOutcomeCode;
  accepted: boolean;
  feedback: FeedbackPattern;
}
