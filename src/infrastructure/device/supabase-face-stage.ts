import { z } from "zod";
import type { AttendanceOutcomeCode, SessionResolution } from "../../domain/attendance/types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const outcomeCodeSchema = z.enum([
  "ACCEPTED_ON_TIME",
  "ACCEPTED_LATE",
  "UNKNOWN_CARD",
  "FACE_MISMATCH",
  "FACE_NOT_DETECTED",
  "FACE_LOW_QUALITY",
  "FACE_SERVICE_ERROR",
  "NO_ACTIVE_SESSION",
  "NOT_ELIGIBLE",
  "DUPLICATE",
  "OUTSIDE_SESSION_WINDOW",
]);

const transactionStateSchema = z.object({
  transactionId: z.string().uuid(),
  status: z.enum(["PENDING", "CONSUMED", "EXPIRED", "CANCELLED"]),
  expiresAt: z.string(),
  consumedAt: z.string().nullable().optional(),
  outcomeCode: outcomeCodeSchema.nullable().optional(),
  accepted: z.boolean().nullable().optional(),
  verificationResult: z
    .enum(["MATCH", "MISMATCH", "NO_FACE", "LOW_QUALITY", "SERVICE_ERROR", "NOT_REQUIRED"])
    .nullable()
    .optional(),
  verificationScore: z.number().nullable().optional(),
  attendanceRecordId: z.string().uuid().nullable().optional(),
});

const verificationPayloadSchema = z.object({
  transactionId: z.string().uuid(),
  institutionId: z.string().uuid(),
  deviceId: z.string().uuid(),
  requestId: z.string().min(1),
  rfidUid: z.string().min(1),
  occurredAt: z.string().min(1),
  expiresAt: z.string().min(1),
  student: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    className: z.string().min(1),
  }),
  session: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    type: z.string().min(1),
    opensAt: z.string().min(1),
    lateAfter: z.string().nullable().optional(),
    closesAt: z.string().min(1),
    eligible: z.boolean(),
  }),
  faceProfile: z.object({
    id: z.string().uuid(),
    modelName: z.string().min(1),
    modelVersion: z.string().min(1),
    embedding: z.array(z.number()).min(32).max(2048),
    embeddingDimensions: z.number().int().min(32).max(2048),
    templateFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  }),
});

const finalizationSchema = z.object({
  transactionId: z.string().uuid(),
  status: z.literal("CONSUMED"),
  deviceEventId: z.string().uuid().nullable().optional(),
  verificationAttemptId: z.string().uuid().nullable().optional(),
  attendanceRecordId: z.string().uuid().nullable().optional(),
  replayed: z.boolean(),
});

export type DeviceVerificationState = z.infer<typeof transactionStateSchema>;
type RawVerificationPayload = z.infer<typeof verificationPayloadSchema>;
export type DeviceFaceFinalization = z.infer<typeof finalizationSchema>;

function mapSessionType(value: string): SessionResolution["type"] {
  switch (value) {
    case "SCHOOL_ARRIVAL":
      return "arrival";
    case "SCHOOL_DEPARTURE":
      return "departure";
    case "DHUHA":
      return "dhuha";
    case "DZUHUR":
      return "dzuhur";
    case "ASHAR":
      return "ashar";
    case "CEREMONY":
      return "ceremony";
    case "SCHOOL_ACTIVITY":
      return "activity";
    case "CUSTOM":
      return "custom";
    default:
      throw new Error(`Unsupported attendance session type: ${value}`);
  }
}

export interface DeviceVerificationPayload {
  transactionId: string;
  institutionId: string;
  deviceId: string;
  requestId: string;
  rfidUid: string;
  occurredAt: string;
  expiresAt: string;
  student: RawVerificationPayload["student"];
  session: SessionResolution;
  faceProfile: RawVerificationPayload["faceProfile"];
}

export function parseDeviceVerificationPayload(raw: unknown): DeviceVerificationPayload {
  const parsed = verificationPayloadSchema.parse(raw);
  if (parsed.faceProfile.embedding.length !== parsed.faceProfile.embeddingDimensions) {
    throw new Error("FACE_TEMPLATE_DIMENSION_MISMATCH");
  }

  return {
    ...parsed,
    session: {
      id: parsed.session.id,
      name: parsed.session.name,
      type: mapSessionType(parsed.session.type),
      opensAt: parsed.session.opensAt,
      lateAfter: parsed.session.lateAfter ?? undefined,
      closesAt: parsed.session.closesAt,
      eligible: parsed.session.eligible,
    },
  };
}

export async function getDeviceVerificationState(input: {
  deviceId: string;
  transactionId: string;
  requestId: string;
}): Promise<DeviceVerificationState> {
  const raw = await callSupabaseAdminRpc<unknown>(
    "get_device_verification_transaction_state",
    {
      p_device_id: input.deviceId,
      p_transaction_id: input.transactionId,
      p_request_id: input.requestId,
    },
  );
  return transactionStateSchema.parse(raw);
}

export async function getDeviceVerificationPayload(input: {
  deviceId: string;
  transactionId: string;
  requestId: string;
}): Promise<DeviceVerificationPayload> {
  const raw = await callSupabaseAdminRpc<unknown>("get_device_verification_payload", {
    p_device_id: input.deviceId,
    p_transaction_id: input.transactionId,
    p_request_id: input.requestId,
  });
  return parseDeviceVerificationPayload(raw);
}

export async function finalizeDeviceVerification(input: {
  deviceId: string;
  transactionId: string;
  requestId: string;
  verificationResult: "MATCH" | "MISMATCH" | "NO_FACE" | "LOW_QUALITY" | "SERVICE_ERROR";
  verificationScore?: number;
  threshold?: number;
  modelName: string;
  modelVersion: string;
  outcomeCode: AttendanceOutcomeCode;
  accepted: boolean;
}): Promise<DeviceFaceFinalization> {
  const raw = await callSupabaseAdminRpc<unknown>(
    "finalize_device_verification_transaction",
    {
      p_device_id: input.deviceId,
      p_transaction_id: input.transactionId,
      p_request_id: input.requestId,
      p_verification_result: input.verificationResult,
      p_verification_score: input.verificationScore ?? null,
      p_threshold: input.threshold ?? null,
      p_model_name: input.modelName,
      p_model_version: input.modelVersion,
      p_outcome_code: input.outcomeCode,
      p_accepted: input.accepted,
    },
  );
  return finalizationSchema.parse(raw);
}
