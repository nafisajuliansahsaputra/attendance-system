"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createAdminDevice,
  setAdminDeviceStatus,
} from "../../../infrastructure/admin/supabase-devices";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";

const createSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100),
  deviceType: z.enum(["SIMULATOR", "ARDUINO_BRIDGE", "ESP32", "OTHER"]),
  protocolVersion: z.string().trim().regex(/^v[0-9]+([.][0-9]+)?$/),
  note: z.string().trim().max(300).optional(),
});

const statusSchema = z.object({
  deviceId: z.string().uuid(),
  status: z.enum(["ACTIVE", "DISABLED", "REVOKED"]),
  note: z.string().trim().max(300).optional(),
});

function deviceUrl(input?: { saved?: string; error?: string }) {
  const query = new URLSearchParams();
  if (input?.saved) query.set("saved", input.saved);
  if (input?.error) query.set("error", input.error);
  const suffix = query.toString();
  return suffix ? `/dashboard/devices?${suffix}` : "/dashboard/devices";
}

function mapDeviceError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("DEVICE_CODE_IN_USE")) return "code-in-use";
  if (message.includes("INVALID_DEVICE_CODE")) return "invalid-code";
  if (message.includes("INVALID_DEVICE_NAME")) return "invalid-name";
  if (message.includes("INVALID_DEVICE_TYPE")) return "invalid-type";
  if (message.includes("INVALID_PROTOCOL_VERSION")) return "invalid-protocol";
  if (message.includes("REVOKED_DEVICE_CANNOT_REACTIVATE")) return "revoked";
  if (message.includes("DEVICE_NOT_FOUND")) return "not-found";
  if (message.includes("FORBIDDEN_ADMIN_ONLY")) return "forbidden";
  return "save-failed";
}

export async function createDeviceAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = createSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    deviceType: formData.get("deviceType"),
    protocolVersion: formData.get("protocolVersion"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    redirect(deviceUrl({ error: "invalid-input" }));
  }

  let errorCode: string | undefined;

  try {
    await createAdminDevice({
      actorUserId: userId,
      ...parsed.data,
    });
  } catch (error) {
    errorCode = mapDeviceError(error);
  }

  if (errorCode) {
    redirect(deviceUrl({ error: errorCode }));
  }

  revalidatePath("/dashboard/devices");
  redirect(deviceUrl({ saved: "created" }));
}

export async function setDeviceStatusAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = statusSchema.safeParse({
    deviceId: formData.get("deviceId"),
    status: formData.get("status"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    redirect(deviceUrl({ error: "invalid-input" }));
  }

  let errorCode: string | undefined;

  try {
    await setAdminDeviceStatus({
      actorUserId: userId,
      ...parsed.data,
    });
  } catch (error) {
    errorCode = mapDeviceError(error);
  }

  if (errorCode) {
    redirect(deviceUrl({ error: errorCode }));
  }

  revalidatePath("/dashboard/devices");
  redirect(deviceUrl({ saved: "status" }));
}
