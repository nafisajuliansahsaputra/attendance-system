import { NextResponse } from "next/server";
import {
  DeviceAuthenticationError,
  authenticateDeviceRequest,
} from "@/lib/device/authenticate-device-request";
import { isSupabaseServerConfigured } from "@/infrastructure/supabase/server-config";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, code: "DEVICE_API_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  try {
    const device = await authenticateDeviceRequest(request);

    return NextResponse.json({
      ok: true,
      deviceId: device.deviceId,
      protocolVersion: device.protocolVersion,
      serverTime: new Date().toISOString(),
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
