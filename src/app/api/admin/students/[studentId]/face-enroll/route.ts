import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { enrollAdminFaceProfile } from "@/infrastructure/admin/supabase-faces";
import {
  FaceServiceRequestError,
  FaceServiceUnavailableError,
  extractFaceEmbedding,
} from "@/infrastructure/face/face-service-client";
import { requireAuthorizedUser } from "@/lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  imageBase64: z.string().min(16).max(3_000_000),
  note: z.string().trim().max(300).optional(),
});

interface RouteContext {
  params: Promise<{ studentId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const { studentId } = await context.params;
  const parsedStudentId = z.string().uuid().safeParse(studentId);
  if (!parsedStudentId.success) {
    return NextResponse.json({ code: "INVALID_STUDENT_ID" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "INVALID_FACE_ENROLLMENT_REQUEST" }, { status: 400 });
  }

  try {
    const extraction = await extractFaceEmbedding(parsed.data.imageBase64);

    if (extraction.status !== "OK") {
      return NextResponse.json(
        {
          code: extraction.status,
          reason: extraction.reason ?? undefined,
          qualityScore: extraction.qualityScore ?? undefined,
          detectionScore: extraction.detectionScore ?? undefined,
          livenessChecked: extraction.livenessChecked,
        },
        { status: 422 },
      );
    }

    if (
      !extraction.embedding ||
      !extraction.templateFingerprint ||
      extraction.embedding.length !== extraction.embeddingDimensions
    ) {
      return NextResponse.json({ code: "FACE_SERVICE_INVALID_TEMPLATE" }, { status: 502 });
    }

    const saved = await enrollAdminFaceProfile({
      actorUserId: userId,
      studentId: parsedStudentId.data,
      modelName: extraction.modelName,
      modelVersion: extraction.modelVersion,
      embedding: extraction.embedding,
      qualityScore: extraction.qualityScore ?? undefined,
      templateFingerprint: extraction.templateFingerprint,
      note: parsed.data.note,
    });

    revalidatePath("/dashboard/students");
    revalidatePath(`/dashboard/students/${parsedStudentId.data}/face`);

    return NextResponse.json({
      code: "FACE_ENROLLED",
      faceProfileId: saved.faceProfileId,
      modelName: saved.modelName,
      modelVersion: saved.modelVersion,
      qualityScore: saved.qualityScore ?? undefined,
      enrolledAt: saved.enrolledAt,
      livenessChecked: false,
    });
  } catch (error) {
    if (error instanceof FaceServiceRequestError) {
      return NextResponse.json({ code: "INVALID_FACE_SAMPLE" }, { status: 400 });
    }
    if (error instanceof FaceServiceUnavailableError) {
      return NextResponse.json({ code: "FACE_SERVICE_UNAVAILABLE" }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("STUDENT_NOT_FOUND")) {
      return NextResponse.json({ code: "STUDENT_NOT_FOUND" }, { status: 404 });
    }
    if (message.includes("FORBIDDEN_ADMIN_ONLY")) {
      return NextResponse.json({ code: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ code: "SYSTEM_ERROR" }, { status: 500 });
  }
}
