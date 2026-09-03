import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildFaceTransactionAttempt,
  mapFaceServiceStatus,
} from "@/application/device/face-stage";
import { evaluateAttendanceAttempt } from "@/domain/attendance/engine";
import { feedbackFor } from "@/domain/attendance/feedback";
import {
  finalizeDeviceVerification,
  getDeviceVerificationPayload,
  getDeviceVerificationState,
} from "@/infrastructure/device/supabase-face-stage";
import {
  FaceServiceRequestError,
  FaceServiceUnavailableError,
  verifyFaceEmbedding,
} from "@/infrastructure/face/face-service-client";
import { persistSupabaseDeviceStageEvent } from "@/infrastructure/device/supabase-device";
import { isSupabaseServerConfigured } from "@/infrastructure/supabase/server-config";
import {
  DeviceAuthenticationError,
  authenticateDeviceRequest,
} from "@/lib/device/authenticate-device-request";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  requestId: z.string().min(8).max(128),
  verificationTransactionId: z.string().uuid(),
  imageBase64: z.string().min(16).max(3_000_000),
});

function replayResponse(state: Awaited<ReturnType<typeof getDeviceVerificationState>>) {
  if (state.status !== "CONSUMED" || !state.outcomeCode) {
    return null;
  }

  return NextResponse.json({
    requestId: undefined,
    code: state.outcomeCode,
    accepted: state.accepted ?? false,
    feedback: feedbackFor(state.outcomeCode),
    attendanceRecordId: state.attendanceRecordId ?? undefined,
    replayed: true,
  });
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) {
    return NextResponse.json({ code: "DEVICE_API_NOT_CONFIGURED" }, { status: 503 });
  }

  let device;
  try {
    device = await authenticateDeviceRequest(request);
  } catch (error) {
    if (error instanceof DeviceAuthenticationError) {
      return NextResponse.json({ code: "DEVICE_NOT_AUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ code: "SYSTEM_ERROR" }, { status: 500 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_DEVICE_REQUEST" }, { status: 400 });
  }

  const identity = {
    deviceId: device.deviceId,
    transactionId: parsed.data.verificationTransactionId,
    requestId: parsed.data.requestId,
  };

  try {
    const state = await getDeviceVerificationState(identity);
    const replay = replayResponse(state);
    if (replay) {
      const body = await replay.json();
      return NextResponse.json({ ...body, requestId: parsed.data.requestId });
    }

    if (state.status === "EXPIRED") {
      return NextResponse.json(
        { requestId: parsed.data.requestId, code: "FACE_TRANSACTION_EXPIRED" },
        { status: 410 },
      );
    }
    if (state.status === "CANCELLED") {
      return NextResponse.json(
        { requestId: parsed.data.requestId, code: "FACE_TRANSACTION_CANCELLED" },
        { status: 409 },
      );
    }

    const payload = await getDeviceVerificationPayload(identity);
    const verification = await verifyFaceEmbedding({
      referenceEmbedding: payload.faceProfile.embedding,
      imageBase64: parsed.data.imageBase64,
    });

    if (
      verification.modelName !== payload.faceProfile.modelName ||
      verification.modelVersion !== payload.faceProfile.modelVersion
    ) {
      throw new FaceServiceUnavailableError("FACE_MODEL_VERSION_MISMATCH");
    }

    const face = mapFaceServiceStatus({
      status: verification.status,
      score: verification.score,
      modelVersion: verification.modelVersion,
    });

    const attempt = buildFaceTransactionAttempt({
      context: {
        requestId: payload.requestId,
        institutionId: payload.institutionId,
        deviceId: payload.deviceId,
        occurredAt: payload.occurredAt,
        rfidUid: payload.rfidUid,
        student: payload.student,
        session: payload.session,
      },
      face,
    });
    const outcome = evaluateAttendanceAttempt(attempt);

    if (face.status === "no_face" || face.status === "low_quality") {
      await persistSupabaseDeviceStageEvent({
        institutionId: payload.institutionId,
        deviceId: payload.deviceId,
        requestId: payload.requestId,
        eventType: "DEVICE_ERROR",
        occurredAt: payload.occurredAt,
        studentId: payload.student.id,
        occurrenceId: payload.session.id,
        payload: {
          reason: outcome.code,
          qualityReason: verification.reason ?? null,
          verificationStatus: verification.status,
          qualityScore: verification.qualityScore ?? null,
          detectionScore: verification.detectionScore ?? null,
          livenessChecked: verification.livenessChecked,
        },
      }).catch(() => undefined);

      return NextResponse.json(
        {
          requestId: payload.requestId,
          code: outcome.code,
          accepted: false,
          feedback: outcome.feedback,
          retryable: true,
          verificationTransactionId: payload.transactionId,
          expiresAt: payload.expiresAt,
          reason: verification.reason ?? undefined,
          qualityScore: verification.qualityScore ?? undefined,
          detectionScore: verification.detectionScore ?? undefined,
          livenessChecked: false,
        },
        { status: 422 },
      );
    }

    const verificationResult = face.status === "match" ? "MATCH" : "MISMATCH";
    const finalized = await finalizeDeviceVerification({
      deviceId: payload.deviceId,
      transactionId: payload.transactionId,
      requestId: payload.requestId,
      verificationResult,
      verificationScore: verification.score ?? undefined,
      threshold: verification.threshold,
      modelName: verification.modelName,
      modelVersion: verification.modelVersion,
      outcomeCode: outcome.code,
      accepted: outcome.accepted,
    });

    return NextResponse.json({
      requestId: payload.requestId,
      code: outcome.code,
      accepted: outcome.accepted,
      feedback: outcome.feedback,
      attendanceRecordId: finalized.attendanceRecordId ?? undefined,
      replayed: finalized.replayed,
      verificationScore: verification.score ?? undefined,
      threshold: verification.threshold,
      livenessChecked: false,
    });
  } catch (error) {
    if (error instanceof FaceServiceRequestError) {
      return NextResponse.json(
        {
          requestId: parsed.data.requestId,
          code: "INVALID_FACE_SAMPLE",
          retryable: true,
        },
        { status: 400 },
      );
    }

    if (error instanceof FaceServiceUnavailableError) {
      return NextResponse.json(
        {
          requestId: parsed.data.requestId,
          code: "FACE_SERVICE_UNAVAILABLE",
          retryable: true,
        },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("VERIFICATION_TRANSACTION_NOT_FOUND")) {
      return NextResponse.json(
        { requestId: parsed.data.requestId, code: "FACE_TRANSACTION_NOT_FOUND" },
        { status: 404 },
      );
    }
    if (message.includes("VERIFICATION_TRANSACTION_NOT_ACTIVE")) {
      return NextResponse.json(
        { requestId: parsed.data.requestId, code: "FACE_TRANSACTION_NOT_ACTIVE" },
        { status: 409 },
      );
    }
    if (message.includes("FACE_TEMPLATE_NOT_AVAILABLE")) {
      return NextResponse.json(
        { requestId: parsed.data.requestId, code: "FACE_PROFILE_NOT_READY" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { requestId: parsed.data.requestId, code: "SYSTEM_ERROR" },
      { status: 500 },
    );
  }
}
