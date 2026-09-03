import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AmbiguousAttendanceSessionError,
  buildResolvedAttemptFromContext,
} from "@/application/attendance/context-resolver";
import { processResolvedAttendanceAttempt } from "@/application/attendance/process-resolved-attempt";
import { resolveDeviceCardStage } from "@/application/device/card-stage";
import { validateDeviceScanTime } from "@/application/device/request-time";
import {
  createSupabaseDeviceVerificationTransaction,
  materializeSupabaseScheduleAt,
  persistSupabaseDeviceStageEvent,
} from "@/infrastructure/device/supabase-device";
import { SupabaseAttendanceContextResolver } from "@/infrastructure/persistence/supabase-attendance-context-resolver";
import { SupabaseAttendancePersistence } from "@/infrastructure/persistence/supabase-attendance-persistence";
import { isSupabaseServerConfigured } from "@/infrastructure/supabase/server-config";
import {
  DeviceAuthenticationError,
  authenticateDeviceRequest,
} from "@/lib/device/authenticate-device-request";

export const dynamic = "force-dynamic";

const timestampWithTimezonePattern = /(Z|[+-]\d{2}:\d{2})$/;

const requestSchema = z.object({
  requestId: z.string().min(8).max(128),
  rfidUid: z.string().min(1).max(128),
  occurredAt: z
    .string()
    .min(1)
    .max(64)
    .refine(
      (value) =>
        timestampWithTimezonePattern.test(value) && !Number.isNaN(Date.parse(value)),
      "occurredAt must be an ISO timestamp with timezone",
    ),
});

const contextResolver = new SupabaseAttendanceContextResolver();
const attendancePersistence = new SupabaseAttendancePersistence();

function domainResponse(code: string, requestId: string) {
  return NextResponse.json({
    requestId,
    code,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json(
      { code: "DEVICE_API_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let device;

  try {
    device = await authenticateDeviceRequest(request);
  } catch (error) {
    if (error instanceof DeviceAuthenticationError) {
      return NextResponse.json(
        { code: "DEVICE_NOT_AUTHORIZED" },
        { status: 401 },
      );
    }

    return NextResponse.json({ code: "SYSTEM_ERROR" }, { status: 500 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_DEVICE_REQUEST" }, { status: 400 });
  }

  const occurredAt = new Date(parsed.data.occurredAt).toISOString();
  const rfidUid = parsed.data.rfidUid.trim().toUpperCase();
  const timeValidation = validateDeviceScanTime(occurredAt);

  if (!timeValidation.ok) {
    return NextResponse.json(
      {
        requestId: parsed.data.requestId,
        code: "INVALID_DEVICE_TIME",
        reason: timeValidation.reason,
        serverTime: new Date().toISOString(),
      },
      { status: 422 },
    );
  }

  try {
    await materializeSupabaseScheduleAt({
      institutionId: device.institutionId,
      occurredAt,
    });

    const context = await contextResolver.resolve({
      institutionId: device.institutionId,
      deviceId: device.deviceId,
      rfidUid,
      occurredAt,
    });

    const stage = resolveDeviceCardStage(context);
    const student = context.card.student;
    const session = stage.session;

    await persistSupabaseDeviceStageEvent({
      institutionId: device.institutionId,
      deviceId: device.deviceId,
      requestId: parsed.data.requestId,
      eventType: stage.eventType,
      occurredAt,
      studentId: student?.id,
      occurrenceId: session?.id,
      payload: {
        stageCode: stage.code,
        rfidUid,
      },
    });

    if (stage.code === "CAPTURE_FACE") {
      if (!student || !session || !context.faceProfile) {
        return NextResponse.json({ code: "SYSTEM_ERROR" }, { status: 500 });
      }

      const transaction = await createSupabaseDeviceVerificationTransaction({
        institutionId: device.institutionId,
        deviceId: device.deviceId,
        requestId: parsed.data.requestId,
        studentId: student.id,
        occurrenceId: session.id,
        faceProfileId: context.faceProfile.id,
        rfidUid,
        occurredAt,
      });

      return NextResponse.json(
        {
          requestId: parsed.data.requestId,
          code: "CAPTURE_FACE",
          verificationTransactionId: transaction.transactionId,
          expiresAt: transaction.expiresAt,
        },
        { status: 202 },
      );
    }

    if (stage.code === "ACCEPT_WITHOUT_FACE") {
      const attempt = buildResolvedAttemptFromContext({
        requestId: parsed.data.requestId,
        occurredAt,
        context,
        face: { status: "not_required" },
      });

      const result = await processResolvedAttendanceAttempt(
        attempt,
        attendancePersistence,
      );

      return NextResponse.json({
        requestId: parsed.data.requestId,
        code: result.outcome.code,
        accepted: result.outcome.accepted,
        feedback: result.outcome.feedback,
      });
    }

    return domainResponse(stage.code, parsed.data.requestId);
  } catch (error) {
    if (error instanceof AmbiguousAttendanceSessionError) {
      await persistSupabaseDeviceStageEvent({
        institutionId: device.institutionId,
        deviceId: device.deviceId,
        requestId: parsed.data.requestId,
        eventType: "DEVICE_ERROR",
        occurredAt,
        payload: {
          reason: "AMBIGUOUS_SESSION",
          candidateCount: error.sessions.length,
        },
      }).catch(() => undefined);

      return NextResponse.json(
        {
          requestId: parsed.data.requestId,
          code: "SYSTEM_ERROR",
          reason: "AMBIGUOUS_SESSION",
        },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message.includes("ATTENDANCE_ALREADY_RECORDED")) {
      return domainResponse("DUPLICATE_ATTENDANCE", parsed.data.requestId);
    }

    return NextResponse.json(
      {
        requestId: parsed.data.requestId,
        code: "SYSTEM_ERROR",
      },
      { status: 500 },
    );
  }
}
