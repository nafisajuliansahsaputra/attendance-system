import { NextResponse } from "next/server";
import { z } from "zod";
import {
  claimSupabaseDevicePairing,
} from "@/infrastructure/device/supabase-device";
import { isSupabaseServerConfigured } from "@/infrastructure/supabase/server-config";
import {
  generateDeviceSecret,
  hashPairingCode,
} from "@/lib/device/pairing";
import { hashDeviceSecret } from "@/lib/device/authenticate-device-request";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  pairingCode: z.string().trim().min(8).max(64),
  protocolVersion: z.string().trim().min(1).max(32),
  client: z
    .object({
      firmwareVersion: z.string().trim().max(64).optional(),
      hardwareModel: z.string().trim().max(100).optional(),
      bridgeVersion: z.string().trim().max(64).optional(),
      serialNumber: z.string().trim().max(120).optional(),
    })
    .optional(),
});

function pairingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("DEVICE_PROTOCOL_MISMATCH")) {
    return NextResponse.json(
      {
        ok: false,
        code: "DEVICE_PROTOCOL_MISMATCH",
        message: "Versi protokol perangkat tidak sesuai dengan konfigurasi terminal.",
      },
      { status: 409 },
    );
  }

  if (
    message.includes("PAIRING_CODE_INVALID") ||
    message.includes("DEVICE_NOT_AVAILABLE_FOR_PAIRING")
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: "PAIRING_CODE_INVALID",
        message: "Kode pairing tidak valid, sudah digunakan, atau sudah kedaluwarsa.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      code: "PAIRING_FAILED",
      message: "Perangkat belum dapat dipasangkan.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { ok: false, code: "DEVICE_API_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "INVALID_PAIRING_REQUEST" },
      { status: 400 },
    );
  }

  const secret = generateDeviceSecret();

  try {
    const device = await claimSupabaseDevicePairing({
      codeHash: hashPairingCode(parsed.data.pairingCode),
      secretHash: hashDeviceSecret(secret),
      protocolVersion: parsed.data.protocolVersion,
      clientMetadata: {
        ...parsed.data.client,
        pairedFrom: "device-api-v1",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        code: device.credentialRotated ? "DEVICE_CREDENTIAL_ROTATED" : "DEVICE_PAIRED",
        device: {
          id: device.deviceId,
          code: device.code,
          name: device.name,
          deviceType: device.deviceType,
          protocolVersion: device.protocolVersion,
          location: device.location ?? null,
          pairedAt: device.pairedAt,
        },
        credentials: {
          deviceId: device.deviceId,
          secret,
          protocolVersion: device.protocolVersion,
        },
        endpoints: {
          heartbeat: "/api/device/v1/heartbeat",
          cardScan: "/api/device/v1/card-scan",
          faceVerify: "/api/device/v1/face-verify",
        },
        security: {
          secretReturnedOnce: true,
          rotateByPairingAgain: true,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      },
    );
  } catch (error) {
    return pairingError(error);
  }
}
