"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  cancelAdminDevicePairing,
  createAdminDevice,
  createAdminDevicePairing,
  setAdminDeviceStatus,
} from "../../../infrastructure/admin/supabase-devices";
import {
  generatePairingCode,
  hashPairingCode,
} from "../../../lib/device/pairing";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";

const createSchema = z.object({
  code: z.string().trim().min(2).max(50),
  name: z.string().trim().min(2).max(100),
  deviceType: z.enum(["SIMULATOR", "ARDUINO_BRIDGE", "ESP32", "OTHER"]),
  protocolVersion: z.string().trim().regex(/^v[0-9]+([.][0-9]+)?$/),
  location: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

const statusSchema = z.object({
  deviceId: z.string().uuid(),
  status: z.enum(["ACTIVE", "DISABLED", "REVOKED"]),
  note: z.string().trim().max(300).optional(),
});

const deviceIdSchema = z.string().uuid();

export type PairingActionResult =
  | {
      ok: true;
      pairingCode: string;
      pairingSessionId: string;
      deviceId: string;
      mode: "PAIR" | "ROTATE";
      expiresAt: string;
    }
  | {
      ok: false;
      error: string;
    };

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
  if (message.includes("INVALID_DEVICE_LOCATION")) return "invalid-location";
  if (message.includes("INVALID_DEVICE_TYPE")) return "invalid-type";
  if (message.includes("INVALID_PROTOCOL_VERSION")) return "invalid-protocol";
  if (message.includes("REVOKED_DEVICE_CANNOT_REACTIVATE")) return "revoked";
  if (message.includes("REVOKED_DEVICE_CANNOT_PAIR")) return "revoked";
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
    location: formData.get("location") || undefined,
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

export async function createDevicePairingAction(
  deviceId: string,
): Promise<PairingActionResult> {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsedDeviceId = deviceIdSchema.safeParse(deviceId);

  if (!parsedDeviceId.success) {
    return { ok: false, error: "Terminal tidak valid." };
  }

  const pairingCode = generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    const pairing = await createAdminDevicePairing({
      actorUserId: userId,
      deviceId: parsedDeviceId.data,
      codeHash: hashPairingCode(pairingCode),
      expiresAt,
      note: "Pairing initiated from device management dashboard",
    });

    revalidatePath("/dashboard/devices");

    return {
      ok: true,
      pairingCode,
      pairingSessionId: pairing.pairingSessionId,
      deviceId: pairing.deviceId,
      mode: pairing.mode,
      expiresAt: pairing.expiresAt,
    };
  } catch (error) {
    const code = mapDeviceError(error);
    const messages: Record<string, string> = {
      revoked: "Akses terminal sudah dicabut permanen dan tidak dapat dipasangkan.",
      "not-found": "Terminal tidak ditemukan.",
      forbidden: "Akun ini tidak memiliki izin administrator.",
      "save-failed": "Kode pairing belum dapat dibuat. Silakan coba lagi.",
    };

    return {
      ok: false,
      error: messages[code] ?? messages["save-failed"],
    };
  }
}

export async function cancelDevicePairingAction(deviceId: string) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsedDeviceId = deviceIdSchema.safeParse(deviceId);

  if (!parsedDeviceId.success) {
    return { ok: false, error: "Terminal tidak valid." };
  }

  try {
    const cancelled = await cancelAdminDevicePairing({
      actorUserId: userId,
      deviceId: parsedDeviceId.data,
      note: "Pairing cancelled from device management dashboard",
    });
    revalidatePath("/dashboard/devices");
    return { ok: true, cancelled };
  } catch {
    return { ok: false, error: "Kode pairing belum dapat dibatalkan." };
  }
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
