import { z } from "zod";
import type { ClassAttendanceReport } from "../../application/reports/types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const reportSchema = z.object({
  class: z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string(),
  }),
  period: z.object({
    startDate: z.string().date(),
    endDate: z.string().date(),
  }),
  totals: z.object({
    students: z.number().int().nonnegative(),
    requiredStudentDays: z.number().int().nonnegative(),
    present: z.number().int().nonnegative(),
    late: z.number().int().nonnegative(),
    sakit: z.number().int().nonnegative(),
    izin: z.number().int().nonnegative(),
    alpa: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
  }),
  students: z.array(
    z.object({
      studentId: z.string().uuid(),
      nis: z.string(),
      fullName: z.string(),
      requiredDays: z.number().int().nonnegative(),
      present: z.number().int().nonnegative(),
      late: z.number().int().nonnegative(),
      sakit: z.number().int().nonnegative(),
      izin: z.number().int().nonnegative(),
      alpa: z.number().int().nonnegative(),
      pending: z.number().int().nonnegative(),
    }),
  ),
  sessionTypes: z.array(
    z.object({
      sessionType: z.string(),
      scheduledParticipations: z.number().int().nonnegative(),
      attendedParticipations: z.number().int().nonnegative(),
    }),
  ),
  policyNotes: z.array(z.string()),
});

export function parseClassAttendanceReport(raw: unknown): ClassAttendanceReport {
  return reportSchema.parse(raw);
}

export async function getClassAttendanceReport(input: {
  actorUserId: string;
  classId: string;
  startDate: string;
  endDate: string;
}): Promise<ClassAttendanceReport> {
  const raw = await callSupabaseAdminRpc<unknown>("get_class_attendance_report", {
    p_actor_user_id: input.actorUserId,
    p_class_id: input.classId,
    p_start_date: input.startDate,
    p_end_date: input.endDate,
  });

  return parseClassAttendanceReport(raw);
}
