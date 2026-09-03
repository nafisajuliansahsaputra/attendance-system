import { z } from "zod";
import type {
  AdminStudentDirectoryRow,
  AssignStudentRfidResult,
  TransferStudentEnrollmentResult,
} from "../../application/admin/student-types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const directoryRowSchema = z.object({
  studentId: z.string().uuid(),
  nis: z.string(),
  fullName: z.string().min(1),
  active: z.boolean(),
  enrollmentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  classCode: z.string().optional(),
  className: z.string().optional(),
  rfidCredentialId: z.string().uuid().optional(),
  rfidUid: z.string().optional(),
  rfidRegisteredAt: z.string().optional(),
  faceProfileId: z.string().uuid().optional(),
  faceStatus: z.enum(["ACTIVE", "REVOKED", "PENDING_REENROLLMENT"]).optional(),
  faceModelName: z.string().optional(),
  faceModelVersion: z.string().optional(),
  faceEnrolledAt: z.string().optional(),
});

const assignResultSchema = z.object({
  credentialId: z.string().uuid(),
  studentId: z.string().uuid(),
  uid: z.string().min(1),
  replacedCount: z.number().int().nonnegative(),
  unchanged: z.boolean(),
});

const transferResultSchema = z.object({
  studentId: z.string().uuid(),
  enrollmentId: z.string().uuid(),
  classId: z.string().uuid(),
  effectiveOn: z.string().date(),
  unchanged: z.boolean(),
  previousEnrollmentId: z.string().uuid().nullable(),
});

export function parseAdminStudentDirectory(raw: unknown): AdminStudentDirectoryRow[] {
  return z.array(directoryRowSchema).parse(raw);
}

export async function getAdminStudentDirectory(input: {
  actorUserId: string;
  search?: string;
  classId?: string;
}): Promise<AdminStudentDirectoryRow[]> {
  const raw = await callSupabaseAdminRpc<unknown>("get_admin_student_directory", {
    p_actor_user_id: input.actorUserId,
    p_search: input.search?.trim() || null,
    p_class_id: input.classId || null,
  });

  return parseAdminStudentDirectory(raw);
}

export async function assignStudentRfid(input: {
  actorUserId: string;
  studentId: string;
  uid: string;
  note?: string;
}): Promise<AssignStudentRfidResult> {
  const raw = await callSupabaseAdminRpc<unknown>("assign_student_rfid", {
    p_actor_user_id: input.actorUserId,
    p_student_id: input.studentId,
    p_uid: input.uid,
    p_note: input.note?.trim() || null,
  });

  return assignResultSchema.parse(raw);
}

export async function transferStudentEnrollment(input: {
  actorUserId: string;
  studentId: string;
  targetClassId: string;
  effectiveOn: string;
  note?: string;
}): Promise<TransferStudentEnrollmentResult> {
  const raw = await callSupabaseAdminRpc<unknown>("transfer_student_enrollment", {
    p_actor_user_id: input.actorUserId,
    p_student_id: input.studentId,
    p_target_class_id: input.targetClassId,
    p_effective_on: input.effectiveOn,
    p_note: input.note?.trim() || null,
  });
  const parsed = transferResultSchema.parse(raw);

  return {
    ...parsed,
    previousEnrollmentId: parsed.previousEnrollmentId ?? undefined,
  };
}
