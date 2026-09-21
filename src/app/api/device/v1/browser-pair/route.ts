import { NextResponse } from "next/server";
import { z } from "zod";
import { claimSupabaseBrowserTerminalPairing } from "@/infrastructure/device/supabase-device";
import { isSupabaseServerConfigured } from "@/infrastructure/supabase/server-config";
import { generateDeviceSecret, hashPairingCode } from "@/lib/device/pairing";
import { hashDeviceSecret } from "@/lib/device/authenticate-device-request";
import {
  generateTerminalSessionToken,
  hashTerminalSessionToken,
  TERMINAL_SESSION_COOKIE,
  TERMINAL_SESSION_MAX_AGE_SECONDS,
} from "@/lib/device/terminal-session";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  pairingCode: z.string().trim().min(8).max(64),
  protocolVersion: z.string().trim().min(1).max(32).default("v1"),
  client: z
    .object({
      browser: z.string().trim().max(160).optional(),
      platform: z.string().trim().max(100).optional(),
      screen: z.string().trim().max(40).optional(),
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
        message: "Versi protokol terminal tidak sesuai dengan konfigurasi perangkat.",
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
      message: "Terminal belum dapat dipasangkan.",
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

  const sessionToken = generateTerminalSessionToken();
  const discardedDeviceSecret = generateDeviceSecret();

  try {
    const paired = await claimSupabaseBrowserTerminalPairing({
      codeHash: hashPairingCode(parsed.data.pairingCode),
      sessionHash: hashTerminalSessionToken(sessionToken),
      deviceSecretHash: hashDeviceSecret(discardedDeviceSecret),
      protocolVersion: parsed.data.protocolVersion,
      clientMetadata: {
        runtime: "hosted-browser-terminal",
        browser:
          parsed.data.client?.browser ??
          request.headers.get("user-agent")?.slice(0, 160) ??
          undefined,
        platform:
          parsed.data.client?.platform ??
          request.headers.get("sec-ch-ua-platform")?.slice(0, 100) ??
          undefined,
        screen: parsed.data.client?.screen,
      },
    });

    const response = NextResponse.json(
      {
        ok: true,
        code: paired.credentialRotated
          ? "TERMINAL_SESSION_ROTATED"
          : "TERMINAL_PAIRED",
        device: {
          id: paired.deviceId,
          code: paired.code,
          name: paired.name,
          deviceType: paired.deviceType,
          protocolVersion: paired.protocolVersion,
          location: paired.location ?? null,
          pairedAt: paired.pairedAt,
        },
        sessionExpiresAt: paired.sessionExpiresAt,
      },
      { status: 201 },
    );

    response.cookies.set({
      name: TERMINAL_SESSION_COOKIE,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: TERMINAL_SESSION_MAX_AGE_SECONDS,
    });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Pragma", "no-cache");

    return response;
  } catch (error) {
    return pairingError(error);
  }
}
