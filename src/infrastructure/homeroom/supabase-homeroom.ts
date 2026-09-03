import { z } from "zod";
import type {
  ConfirmableAbsenceStatus,
  HomeroomAttendanceRow,
  SchoolDayConfirmationResult,
} from "../../application/homeroom/types";
import { getAuthorizationContext } from "../auth/supabase-authorization";
import { materializeSupabaseScheduleRange } from "../scheduling/supabase-schedule";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const snapshotRowSchema = z.object({
  student_id: z.string().uuid(),
  nis: z.string(),
  full_name: z.string(),
  class_id: z.string().uuid(),
  class_name: z.string(),
  arrival_record_id: z.string().uuid().nullable(),
  arrival_time: z.string().nullable(),
  attendance_status: z.enum(["ON_TIME", "LATE", "COMPLETED"]).nullable(),
  system_state: z.enum([
    "NOT_SCHEDULED",
    "PRESENT_ON_TIME",
    "PRESENT_LATE",
    "NO_VALID_ARRIVAL",
    "PENDING_CONFIRMATION",
  ]),
  final_status: z
    .enum(["PRESENT", "LATE", "SAKIT", "IZIN", "ALPA"])
    .nullable(),
  needs_confirmation: z.boolean(),
});

const confirmationResultSchema = z.object({
  schoolDayAttendanceId: z.string().uuid(),
  studentId: z.string().uuid(),
  schoolDate: z.string().date(),
  previousStatus: z.string().nullable(),
  finalStatus: z.enum(["SAKIT", "IZIN", "ALPA"]),
});

export function parseHomeroomAttendanceSnapshot(raw: unknown): HomeroomAttendanceRow[] {
  const rows = z.array(snapshotRowSchema).parse(raw);

  return rows.map((row) => ({
    studentId: row.student_id,
    nis: row.nis,
    fullName: row.full_name,
    classId: row.class_id,
    className: row.class_name,
    arrivalRecordId: row.arrival_record_id ?? undefined,
    arrivalTime: row.arrival_time ?? undefined,
    attendanceStatus: row.attendance_status ?? undefined,
    systemState: row.system_state,
    finalStatus: row.final_status ?? undefined,
    needsConfirmation: row.needs_confirmation,
  }));
}

export async function getHomeroomAttendanceSnapshot(
  actorUserId: string,
  classId: string,
  schoolDate: string,
): Promise<HomeroomAttendanceRow[]> {
  const authorization = await getAuthorizationContext(actorUserId, schoolDate);

  if (!authorization) {
    throw new Error("AUTH_PROFILE_NOT_FOUND");
  }

  await materializeSupabaseScheduleRange({
    institutionId: authorization.institutionId,
    startDate: schoolDate,
    endDate: schoolDate,
  });

  const raw = await callSupabaseAdminRpc<unknown>(
    "get_homeroom_attendance_snapshot",
    {
      p_actor_user_id: actorUserId,
      p_class_id: classId,
      p_school_date: schoolDate,
    },
  );

  return parseHomeroomAttendanceSnapshot(raw);
}

export async function confirmSchoolDayStatus(input: {
  actorUserId: string;
  studentId: string;
  schoolDate: string;
  status: ConfirmableAbsenceStatus;
  note?: string;
}): Promise<SchoolDayConfirmationResult> {
  const raw = await callSupabaseAdminRpc<unknown>("confirm_school_day_status", {
    p_actor_user_id: input.actorUserId,
    p_student_id: input.studentId,
    p_school_date: input.schoolDate,
    p_new_status: input.status,
    p_note: input.note?.trim() || null,
  });

  const parsed = confirmationResultSchema.parse(raw);

  return {
    schoolDayAttendanceId: parsed.schoolDayAttendanceId,
    studentId: parsed.studentId,
    schoolDate: parsed.schoolDate,
    previousStatus: parsed.previousStatus ?? undefined,
    finalStatus: parsed.finalStatus,
  };
}
