import { z } from "zod";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const materializationResultSchema = z.object({
  institutionId: z.string().uuid(),
  startDate: z.string(),
  endDate: z.string(),
  createdOccurrences: z.number().int().nonnegative(),
  existingOccurrences: z.number().int().nonnegative(),
  createdParticipants: z.number().int().nonnegative(),
  cancelledNormalParticipantRows: z.number().int().nonnegative(),
});

export type ScheduleMaterializationResult = z.infer<
  typeof materializationResultSchema
>;

export async function materializeSupabaseScheduleRange(input: {
  institutionId: string;
  startDate: string;
  endDate: string;
}): Promise<ScheduleMaterializationResult> {
  const raw = await callSupabaseAdminRpc<unknown>(
    "materialize_attendance_schedule_range",
    {
      p_institution_id: input.institutionId,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
    },
  );

  return materializationResultSchema.parse(raw);
}
