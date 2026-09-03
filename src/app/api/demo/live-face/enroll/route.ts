import { NextResponse } from "next/server";
import { z } from "zod";
import { createLiveFaceDemoToken } from "@/demo/live-face-token";
import {
  extractFaceEmbedding,
  FaceServiceRequestError,
  FaceServiceUnavailableError,
} from "@/infrastructure/face/face-service-client";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  displayName: z.string().trim().min(1).max(80).default("Pengunjung"),
  imageBase64: z.string().min(16).max(3_000_000),
});

function rejectionCode(status: "NO_FACE" | "MULTIPLE_FACES" | "LOW_QUALITY") {
  switch (status) {
    case "NO_FACE":
      return "FACE_NOT_DETECTED";
    case "MULTIPLE_FACES":
      return "MULTIPLE_FACES";
    case "LOW_QUALITY":
      return "FACE_LOW_QUALITY";
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
    const extraction = await extractFaceEmbedding(parsed.data.imageBase64);

    if (extraction.status !== "OK") {
      return NextResponse.json(
        {
          code: rejectionCode(extraction.status),
          reason: extraction.reason ?? undefined,
          qualityScore: extraction.qualityScore ?? undefined,
          detectionScore: extraction.detectionScore ?? undefined,
          livenessChecked: extraction.livenessChecked,
        },
        { status: 422 },
      );
    }

    if (!extraction.embedding) {
      return NextResponse.json(
        {
          code: "INVALID_FACE_SAMPLE",
          reason: "Data pengenal wajah tidak berhasil dibentuk dari gambar kamera.",
          qualityScore: extraction.qualityScore ?? undefined,
          detectionScore: extraction.detectionScore ?? undefined,
          livenessChecked: extraction.livenessChecked,
        },
        { status: 422 },
      );
    }

    const issued = createLiveFaceDemoToken({
      displayName: parsed.data.displayName,
      embedding: extraction.embedding,
      modelName: extraction.modelName,
      modelVersion: extraction.modelVersion,
    });

    return NextResponse.json({
      code: "LIVE_FACE_ENROLLED",
      displayName: parsed.data.displayName,
      demoFaceToken: issued.token,
      expiresAt: issued.expiresAt,
      qualityScore: extraction.qualityScore ?? undefined,
      detectionScore: extraction.detectionScore ?? undefined,
      modelName: extraction.modelName,
      modelVersion: extraction.modelVersion,
      livenessChecked: extraction.livenessChecked,
      privacy: {
        rawImageStored: false,
        databasePersistence: false,
        tokenStorage: "browser-memory-only",
      },
    });
  } catch (error) {
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
