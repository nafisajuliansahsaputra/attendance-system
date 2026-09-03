import { z } from "zod";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const enrollmentResultSchema = z.object({
  faceProfileId: z.string().uuid(),
  studentId: z.string().uuid(),
  modelName: z.string().min(1),
  modelVersion: z.string().min(1),
  embeddingDimensions: z.number().int().min(32).max(2048),
  qualityScore: z.number().min(0).max(1).nullable().optional(),
  templateFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  enrolledAt: z.string().min(1),
});

export type FaceEnrollmentResult = z.infer<typeof enrollmentResultSchema>;

export async function enrollAdminFaceProfile(input: {
  actorUserId: string;
  studentId: string;
  modelName: string;
  modelVersion: string;
  embedding: number[];
  qualityScore?: number;
  templateFingerprint: string;
  note?: string;
}): Promise<FaceEnrollmentResult> {
  const raw = await callSupabaseAdminRpc<unknown>("enroll_admin_face_profile", {
    p_actor_user_id: input.actorUserId,
    p_student_id: input.studentId,
    p_model_name: input.modelName,
    p_model_version: input.modelVersion,
    p_embedding: input.embedding,
    p_quality_score: input.qualityScore ?? null,
    p_template_fingerprint: input.templateFingerprint,
    p_note: input.note?.trim() || null,
  });

  return enrollmentResultSchema.parse(raw);
}
