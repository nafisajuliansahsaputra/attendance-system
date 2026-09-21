import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DeviceAuthenticationError,
  authenticateDeviceRequest,
} from "@/lib/device/authenticate-device-request";
import { recordSupabaseDeviceHeartbeat } from "@/infrastructure/device/supabase-device";
import { isSupabaseServerConfigured } from "@/infrastructure/supabase/server-config";

export const dynamic = "force-dynamic";

const heartbeatSchema = z.object({
  firmwareVersion: z.string().trim().max(64).optional(),
  hardwareModel: z.string().trim().max(100).optional(),
  bridgeVersion: z.string().trim().max(64).optional(),
  runtimeVersion: z.string().trim().max(64).optional(),
  readerMode: z.enum(["KEYBOARD_WEDGE", "WEB_SERIAL", "HEADLESS"]).optional(),
  cameraReady: z.boolean().optional(),
  queueDepth: z.number().int().min(0).max(100000).optional(),
  uptimeSeconds: z.number().int().min(0).max(315360000).optional(),
  localTime: z.string().trim().max(64).optional(),
});

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, code: "DEVICE_API_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    const device = await authenticateDeviceRequest(request);
    const body = await request.json().catch(() => ({}));
    const parsed = heartbeatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, code: "INVALID_HEARTBEAT_REQUEST" },
        { status: 400 },
      );
    }

    const heartbeat = await recordSupabaseDeviceHeartbeat({
      deviceId: device.deviceId,
      metadata: parsed.data,
    });

    return NextResponse.json({
      ok: true,
      deviceId: device.deviceId,
      protocolVersion: device.protocolVersion,
      lastHeartbeatAt: heartbeat.lastHeartbeatAt,
      serverTime: new Date().toISOString(),
      device: {
        id: device.deviceId,
        code: device.code,
        name: device.name,
        deviceType: device.deviceType,
        protocolVersion: device.protocolVersion,
      },
    });
  } catch (error) {
    if (error instanceof DeviceAuthenticationError) {
      return NextResponse.json(
        { ok: false, code: "DEVICE_NOT_AUTHORIZED" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { ok: false, code: "SYSTEM_ERROR" },
      { status: 500 },
    );
  }
}
