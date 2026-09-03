import { z } from "zod";
import type { ReportingPeriodPresets } from "../../application/reports/types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const reportingPeriodSchema = z.object({
  academicYear: z
    .object({
      id: z.string().uuid(),
      label: z.string().min(1),
      startsOn: z.string().date(),
      endsOn: z.string().date(),
    })
    .nullable(),
  terms: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      sequence: z.number().int().positive(),
      startsOn: z.string().date(),
      endsOn: z.string().date(),
    }),
  ),
});

export function parseReportingPeriodPresets(raw: unknown): ReportingPeriodPresets {
  const parsed = reportingPeriodSchema.parse(raw);

  return {
    academicYear: parsed.academicYear ?? undefined,
    terms: parsed.terms,
  };
}

export async function getReportingPeriodPresets(
  actorUserId: string,
): Promise<ReportingPeriodPresets> {
  const raw = await callSupabaseAdminRpc<unknown>("get_reporting_period_presets", {
    p_actor_user_id: actorUserId,
  });

  return parseReportingPeriodPresets(raw);
}
