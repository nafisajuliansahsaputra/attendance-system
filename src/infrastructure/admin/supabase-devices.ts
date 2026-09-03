import { z } from "zod";
import type {
  AdminDeviceDirectoryRow,
  CreateAdminDeviceResult,
  SetAdminDeviceStatusResult,
} from "../../application/admin/device-types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const deviceStatusSchema = z.enum(["ACTIVE", "DISABLED", "REVOKED"]);
const deviceTypeSchema = z.enum(["SIMULATOR", "ARDUINO_BRIDGE", "ESP32", "OTHER"]);

const deviceDirectoryRowSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  deviceType: deviceTypeSchema,
  status: deviceStatusSchema,
  protocolVersion: z.string(),
  lastSeenAt: z.string().optional(),
  secretConfigured: z.boolean(),
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
  secretConfigured: z.boolean(),
});

const setStatusResultSchema = z.object({
  id: z.string().uuid(),
  status: deviceStatusSchema,
  secretConfigured: z.boolean(),
});

export function parseAdminDeviceDirectory(raw: unknown): AdminDeviceDirectoryRow[] {
  return z.array(deviceDirectoryRowSchema).parse(raw);
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
  note?: string;
}): Promise<CreateAdminDeviceResult> {
  const raw = await callSupabaseAdminRpc<unknown>("create_admin_device", {
    p_actor_user_id: input.actorUserId,
    p_code: input.code,
    p_name: input.name,
    p_device_type: input.deviceType,
    p_protocol_version: input.protocolVersion,
    p_note: input.note?.trim() || null,
  });

  return createResultSchema.parse(raw);
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
