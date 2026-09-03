import { createHash } from "node:crypto";
import { z } from "zod";
import {
  authenticateSupabaseDevice,
  type AuthenticatedDevice,
} from "../../infrastructure/device/supabase-device";

const credentialSchema = z.object({
  deviceId: z.string().uuid(),
  protocolVersion: z.string().min(1).max(32),
  secret: z.string().min(24).max(512),
});

export interface DeviceRequestCredentials {
  deviceId: string;
  protocolVersion: string;
  secret: string;
}

export class DeviceAuthenticationError extends Error {
  constructor() {
    super("Device authentication failed.");
    this.name = "DeviceAuthenticationError";
  }
}

export function hashDeviceSecret(secret: string): string {
  return `sha256:${createHash("sha256").update(secret, "utf8").digest("hex")}`;
}

export function parseDeviceCredentialHeaders(
  headers: Headers,
): DeviceRequestCredentials {
  const authorization = headers.get("authorization") ?? "";
  const deviceId = headers.get("x-device-id") ?? "";
  const protocolVersion = headers.get("x-protocol-version") ?? "";
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);

  const parsed = credentialSchema.safeParse({
    deviceId,
    protocolVersion,
    secret: bearerMatch?.[1]?.trim() ?? "",
  });

  if (!parsed.success) {
    throw new DeviceAuthenticationError();
  }

  return parsed.data;
}

export async function authenticateDeviceRequest(
  request: Request,
): Promise<AuthenticatedDevice> {
  let credentials: DeviceRequestCredentials;

  try {
    credentials = parseDeviceCredentialHeaders(request.headers);
  } catch {
    throw new DeviceAuthenticationError();
  }

  try {
    return await authenticateSupabaseDevice({
      deviceId: credentials.deviceId,
      secretHash: hashDeviceSecret(credentials.secret),
      protocolVersion: credentials.protocolVersion,
    });
  } catch {
    throw new DeviceAuthenticationError();
  }
}
