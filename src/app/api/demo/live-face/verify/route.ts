import { NextResponse } from "next/server";
import { z } from "zod";
import { processResolvedAttendanceAttempt } from "@/application/attendance/process-resolved-attempt";
import { readLiveFaceDemoToken } from "@/demo/live-face-token";
import type { FaceVerificationResolution, ResolvedAttendanceAttempt } from "@/domain/attendance/types";
import {
  verifyFaceEmbedding,
  FaceServiceRequestError,
  FaceServiceUnavailableError,
} from "@/infrastructure/face/face-service-client";
import { DemoAttendancePersistence } from "@/infrastructure/persistence/demo-attendance-persistence";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  requestId: z.string().min(8).max(128),
  demoFaceToken: z.string().min(32).max(20_000),
  imageBase64: z.string().min(16).max(3_000_000),
});

const persistence = new DemoAttendancePersistence();

function mapFace(status: "MATCH" | "MISMATCH" | "NO_FACE" | "LOW_QUALITY", score?: number | null): FaceVerificationResolution {
  switch (status) {
    case "MATCH":
      return { status: "match", score: score ?? undefined, modelVersion: "opencv-sface" };
    case "MISMATCH":
      return { status: "mismatch", score: score ?? undefined, modelVersion: "opencv-sface" };
    case "NO_FACE":
      return { status: "no_face", modelVersion: "opencv-sface" };
    case "LOW_QUALITY":
      return { status: "low_quality", modelVersion: "opencv-sface" };
  }
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { code: "INVALID_LIVE_FACE_REQUEST", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const token = readLiveFaceDemoToken(parsed.data.demoFaceToken);
    const verification = await verifyFaceEmbedding({
      referenceEmbedding: token.embedding,
      imageBase64: parsed.data.imageBase64,
    });

    if (verification.modelName !== token.modelName || verification.modelVersion !== token.modelVersion) {
      throw new FaceServiceUnavailableError("FACE_MODEL_VERSION_MISMATCH");
    }

    if (verification.status === "MULTIPLE_FACES") {
      return NextResponse.json(
        {
          code: "MULTIPLE_FACES",
          accepted: false,
          reason: verification.reason ?? "Exactly one face is required",
          qualityScore: verification.qualityScore ?? undefined,
          detectionScore: verification.detectionScore ?? undefined,
          livenessChecked: verification.livenessChecked,
        },
        { status: 422 },
      );
    }

    const now = new Date();
    const occurredAt = now.toISOString();
    const opensAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const closesAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    const attempt: ResolvedAttendanceAttempt = {
      requestId: parsed.data.requestId,
      institutionId: "institution-live-recruiter-demo",
      deviceId: "browser-camera-terminal-demo",
      occurredAt,
      card: {
        uid: "LIVE:DEMO:CARD",
        registered: true,
        student: {
          id: "live-recruiter-demo",
          name: token.displayName,
          className: "Recruiter Live Demo",
        },
      },
      face: mapFace(verification.status, verification.score),
      session: {
        id: "live-recruiter-session",
        name: "Live Identity Verification",
        type: "custom",
        opensAt,
        closesAt,
        eligible: true,
      },
      duplicate: false,
    };

    const result = await processResolvedAttendanceAttempt(attempt, persistence);

    return NextResponse.json({
      source: "live-browser-camera",
      resolution: {
        rfidUid: attempt.card.uid,
        student: attempt.card.student,
        faceStatus: attempt.face.status,
        verificationScore: verification.score ?? null,
        threshold: verification.threshold,
        qualityScore: verification.qualityScore ?? null,
        detectionScore: verification.detectionScore ?? null,
        modelName: verification.modelName,
        modelVersion: verification.modelVersion,
        livenessChecked: verification.livenessChecked,
      },
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "LIVE_FACE_DEMO_TOKEN_EXPIRED") {
      return NextResponse.json(
        { code: "LIVE_FACE_DEMO_EXPIRED" },
        { status: 410 },
      );
    }

    if (message === "LIVE_FACE_DEMO_TOKEN_INVALID") {
      return NextResponse.json(
        { code: "LIVE_FACE_DEMO_INVALID" },
        { status: 400 },
      );
    }

    if (message === "LIVE_FACE_DEMO_NOT_CONFIGURED") {
      return NextResponse.json(
        { code: "FACE_SERVICE_UNAVAILABLE" },
        { status: 503 },
      );
    }

    if (error instanceof FaceServiceRequestError) {
      return NextResponse.json(
        { code: "INVALID_FACE_SAMPLE", reason: error.message },
        { status: 400 },
      );
    }

    if (error instanceof FaceServiceUnavailableError) {
      return NextResponse.json(
        { code: "FACE_SERVICE_UNAVAILABLE", reason: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { code: "LIVE_FACE_DEMO_ERROR" },
      { status: 500 },
    );
  }
}
