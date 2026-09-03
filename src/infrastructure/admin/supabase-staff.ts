import { z } from "zod";
import type {
  AdminStaffDirectoryRow,
  ProvisionStaffAccountInput,
} from "../../application/admin/staff-types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";
import { createSupabaseAdminClient } from "../supabase/admin-client";

const roleSchema = z.enum(["SYSTEM_ADMIN", "HOMEROOM_TEACHER", "OPERATOR"]);

const assignmentSchema = z.object({
  id: z.string().uuid(),
  classId: z.string().uuid(),
  classCode: z.string(),
  className: z.string(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  startsOn: z.string().date().optional(),
  endsOn: z.string().date().optional(),
});

const staffRowSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1),
  role: roleSchema,
  active: z.boolean(),
  createdAt: z.string(),
  homeroomAssignments: z.array(assignmentSchema),
});

export function parseAdminStaffDirectory(raw: unknown): AdminStaffDirectoryRow[] {
  return z.array(staffRowSchema).parse(raw);
}

export async function getAdminStaffDirectory(
  actorUserId: string,
): Promise<AdminStaffDirectoryRow[]> {
  const raw = await callSupabaseAdminRpc<unknown>("get_admin_staff_directory", {
    p_actor_user_id: actorUserId,
  });
  return parseAdminStaffDirectory(raw);
}

export async function provisionStaffAccount(input: ProvisionStaffAccountInput) {
  const supabase = createSupabaseAdminClient();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    throw new Error(`AUTH_USER_CREATE_FAILED: ${createError?.message ?? "unknown error"}`);
  }

  const userId = created.user.id;

  try {
    await callSupabaseAdminRpc<unknown>("provision_staff_profile", {
      p_actor_user_id: input.actorUserId,
      p_target_user_id: userId,
      p_full_name: input.fullName,
      p_role: input.role,
      p_institution_id: input.institutionId,
      p_class_id: input.role === "HOMEROOM_TEACHER" ? input.classId ?? null : null,
      p_academic_year_id:
        input.role === "HOMEROOM_TEACHER" ? input.academicYearId ?? null : null,
    });
  } catch (error) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(userId);
    const cause = error instanceof Error ? error.message : String(error);

    if (cleanupError) {
      throw new Error(
        `STAFF_PROFILE_PROVISION_FAILED_AND_AUTH_CLEANUP_FAILED: ${cause}; cleanup=${cleanupError.message}`,
      );
    }

    throw new Error(`STAFF_PROFILE_PROVISION_FAILED: ${cause}`);
  }

  return {
    userId,
    email: input.email,
    role: input.role,
  };
}

export async function setAdminStaffActiveStatus(input: {
  actorUserId: string;
  targetUserId: string;
  active: boolean;
  note?: string;
}) {
  return callSupabaseAdminRpc<unknown>("set_admin_staff_active_status", {
    p_actor_user_id: input.actorUserId,
    p_target_user_id: input.targetUserId,
    p_active: input.active,
    p_note: input.note?.trim() || null,
  });
}
