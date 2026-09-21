import { z } from "zod";
import type { ClaimDevicePairingResult } from "../../application/admin/device-types";
import type { DeviceStageEventType } from "../../application/device/card-stage";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const authenticatedDeviceSchema = z.object({
  deviceId: z.string().uuid(),
  institutionId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  deviceType: z.enum(["SIMULATOR", "ARDUINO_BRIDGE", "ESP32", "OTHER"]),
  protocolVersion: z.string().min(1),
});

const verificationTransactionSchema = z.object({
  transactionId: z.string().uuid(),
  expiresAt: z.string().min(1),
  occurrenceId: z.string().uuid(),
});

const claimPairingSchema = z.object({
  deviceId: z.string().uuid(),
  institutionId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(1),
  deviceType: z.enum(["SIMULATOR", "ARDUINO_BRIDGE", "ESP32", "OTHER"]),
  protocolVersion: z.string().min(1),
  location: z.string().nullable().optional(),
  pairedAt: z.string().min(1),
  credentialRotated: z.boolean(),
});

const heartbeatSchema = z.object({
  deviceId: z.string().uuid(),
  lastHeartbeatAt: z.string().min(1),
});

export type AuthenticatedDevice = z.infer<typeof authenticatedDeviceSchema>;
export type DeviceVerificationTransaction = z.infer<
  typeof verificationTransactionSchema
>;

export async function authenticateSupabaseDevice(input: {
  deviceId: string;
  secretHash: string;
  protocolVersion: string;
}): Promise<AuthenticatedDevice> {
  const raw = await callSupabaseAdminRpc<unknown>("authenticate_device", {
    p_device_id: input.deviceId,
    p_secret_hash: input.secretHash,
    p_protocol_version: input.protocolVersion,
  });

  return authenticatedDeviceSchema.parse(raw);
}

export async function claimSupabaseDevicePairing(input: {
  codeHash: string;
  secretHash: string;
  protocolVersion: string;
  clientMetadata?: Record<string, unknown>;
}): Promise<ClaimDevicePairingResult> {
  const raw = await callSupabaseAdminRpc<unknown>("claim_device_pairing", {
    p_code_hash: input.codeHash,
    p_secret_hash: input.secretHash,
    p_protocol_version: input.protocolVersion,
    p_client_metadata: input.clientMetadata ?? {},
  });

  const parsed = claimPairingSchema.parse(raw);

  return {
    ...parsed,
    location: parsed.location ?? undefined,
  };
}

export async function recordSupabaseDeviceHeartbeat(input: {
  deviceId: string;
  metadata?: Record<string, unknown>;
}): Promise<{ deviceId: string; lastHeartbeatAt: string }> {
  const raw = await callSupabaseAdminRpc<unknown>("record_device_heartbeat", {
    p_device_id: input.deviceId,
    p_metadata: input.metadata ?? {},
  });

  return heartbeatSchema.parse(raw);
}

export async function materializeSupabaseScheduleAt(input: {
  institutionId: string;
  occurredAt: string;
}): Promise<void> {
  await callSupabaseAdminRpc<unknown>("materialize_attendance_schedule_at", {
    p_institution_id: input.institutionId,
    p_occurred_at: input.occurredAt,
  });
}

export async function persistSupabaseDeviceStageEvent(input: {
  institutionId: string;
  deviceId: string;
  requestId: string;
  eventType: DeviceStageEventType;
  occurredAt: string;
  studentId?: string;
  occurrenceId?: string;
  payload?: Record<string, unknown>;
}): Promise<string> {
  const raw = await callSupabaseAdminRpc<unknown>("persist_device_stage_event", {
    p_institution_id: input.institutionId,
    p_device_id: input.deviceId,
    p_request_id: input.requestId,
    p_event_type: input.eventType,
    p_occurred_at: input.occurredAt,
    p_student_id: input.studentId ?? null,
    p_occurrence_id: input.occurrenceId ?? null,
    p_payload: input.payload ?? {},
  });

  return z.string().uuid().parse(raw);
}

export async function createSupabaseDeviceVerificationTransaction(input: {
  institutionId: string;
  deviceId: string;
  requestId: string;
  studentId: string;
  occurrenceId: string;
  faceProfileId: string;
  rfidUid: string;
  occurredAt: string;
}): Promise<DeviceVerificationTransaction> {
  const raw = await callSupabaseAdminRpc<unknown>(
    "create_device_verification_transaction",
    {
      p_institution_id: input.institutionId,
      p_device_id: input.deviceId,
      p_request_id: input.requestId,
      p_student_id: input.studentId,
      p_occurrence_id: input.occurrenceId,
      p_face_profile_id: input.faceProfileId,
      p_rfid_uid: input.rfidUid,
      p_occurred_at: input.occurredAt,
    },
  );

  return verificationTransactionSchema.parse(raw);
}
