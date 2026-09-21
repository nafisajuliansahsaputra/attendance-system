import { z } from "zod";
import type {
  AdminDeviceDirectoryRow,
  CreateAdminDeviceResult,
  CreateDevicePairingResult,
  SetAdminDeviceStatusResult,
} from "../../application/admin/device-types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const deviceStatusSchema = z.enum(["ACTIVE", "DISABLED", "REVOKED"]);
const deviceTypeSchema = z.enum(["SIMULATOR", "ARDUINO_BRIDGE", "ESP32", "OTHER"]);
const pairingStatusSchema = z.enum(["UNPAIRED", "WAITING", "PAIRED", "REVOKED"]);
const connectionStatusSchema = z.enum(["NEVER", "ONLINE", "OFFLINE", "INACTIVE"]);

const nullableString = z.string().nullable().optional();

const deviceDirectoryRowSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  deviceType: deviceTypeSchema,
  status: deviceStatusSchema,
  protocolVersion: z.string(),
  location: nullableString,
  lastSeenAt: nullableString,
  lastHeartbeatAt: nullableString,
  pairedAt: nullableString,
  credentialRotatedAt: nullableString,
  secretConfigured: z.boolean(),
  pairingStatus: pairingStatusSchema,
  connectionStatus: connectionStatusSchema,
  pairingExpiresAt: nullableString,
  lastEventAt: nullableString,
  lastAttendanceAt: nullableString,
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  pendingTransactions: z.number().int().nonnegative(),
  recentErrors24h: z.number().int().nonnegative(),
});

const createResultSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  deviceType: deviceTypeSchema,
  status: deviceStatusSchema,
  protocolVersion: z.string(),
  location: nullableString,
  secretConfigured: z.boolean(),
});

const pairingResultSchema = z.object({
  pairingSessionId: z.string().uuid(),
  deviceId: z.string().uuid(),
  mode: z.enum(["PAIR", "ROTATE"]),
  expiresAt: z.string(),
});

const setStatusResultSchema = z.object({
  id: z.string().uuid(),
  status: deviceStatusSchema,
  secretConfigured: z.boolean(),
});

function compactRow(
  row: z.infer<typeof deviceDirectoryRowSchema>,
): AdminDeviceDirectoryRow {
  return {
    ...row,
    location: row.location ?? undefined,
    lastSeenAt: row.lastSeenAt ?? undefined,
    lastHeartbeatAt: row.lastHeartbeatAt ?? undefined,
    pairedAt: row.pairedAt ?? undefined,
    credentialRotatedAt: row.credentialRotatedAt ?? undefined,
    pairingExpiresAt: row.pairingExpiresAt ?? undefined,
    lastEventAt: row.lastEventAt ?? undefined,
    lastAttendanceAt: row.lastAttendanceAt ?? undefined,
  };
}

export function parseAdminDeviceDirectory(raw: unknown): AdminDeviceDirectoryRow[] {
  return z.array(deviceDirectoryRowSchema).parse(raw).map(compactRow);
}

export async function getAdminDeviceDirectory(
  actorUserId: string,
): Promise<AdminDeviceDirectoryRow[]> {
  const raw = await callSupabaseAdminRpc<unknown>("get_admin_device_directory", {
    p_actor_user_id: actorUserId,
  });

  return parseAdminDeviceDirectory(raw);
}

export async function createAdminDevice(input: {
  actorUserId: string;
  code: string;
  name: string;
  deviceType: "SIMULATOR" | "ARDUINO_BRIDGE" | "ESP32" | "OTHER";
  protocolVersion: string;
  location?: string;
  note?: string;
}): Promise<CreateAdminDeviceResult> {
  const raw = await callSupabaseAdminRpc<unknown>("create_admin_device_v2", {
    p_actor_user_id: input.actorUserId,
    p_code: input.code,
    p_name: input.name,
    p_device_type: input.deviceType,
    p_protocol_version: input.protocolVersion,
    p_location: input.location?.trim() || null,
    p_note: input.note?.trim() || null,
  });

  const parsed = createResultSchema.parse(raw);
  return {
    ...parsed,
    location: parsed.location ?? undefined,
  };
}

export async function createAdminDevicePairing(input: {
  actorUserId: string;
  deviceId: string;
  codeHash: string;
  expiresAt: string;
  note?: string;
}): Promise<CreateDevicePairingResult> {
  const raw = await callSupabaseAdminRpc<unknown>("create_admin_device_pairing", {
    p_actor_user_id: input.actorUserId,
    p_device_id: input.deviceId,
    p_code_hash: input.codeHash,
    p_expires_at: input.expiresAt,
    p_note: input.note?.trim() || null,
  });

  return pairingResultSchema.parse(raw);
}

export async function cancelAdminDevicePairing(input: {
  actorUserId: string;
  deviceId: string;
  note?: string;
}): Promise<boolean> {
  const raw = await callSupabaseAdminRpc<unknown>("cancel_admin_device_pairing", {
    p_actor_user_id: input.actorUserId,
    p_device_id: input.deviceId,
    p_note: input.note?.trim() || null,
  });

  return z
    .object({
      deviceId: z.string().uuid(),
      cancelled: z.boolean(),
    })
    .parse(raw).cancelled;
}

export async function setAdminDeviceStatus(input: {
  actorUserId: string;
  deviceId: string;
  status: "ACTIVE" | "DISABLED" | "REVOKED";
  note?: string;
}): Promise<SetAdminDeviceStatusResult> {
  const raw = await callSupabaseAdminRpc<unknown>("set_admin_device_status", {
    p_actor_user_id: input.actorUserId,
    p_device_id: input.deviceId,
    p_status: input.status,
    p_note: input.note?.trim() || null,
  });

  return setStatusResultSchema.parse(raw);
}
