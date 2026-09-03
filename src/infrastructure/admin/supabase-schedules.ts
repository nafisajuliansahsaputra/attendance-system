import { z } from "zod";
import type {
  AdminScheduleConfiguration,
  CreateScheduleRuleResult,
  RetireScheduleRuleResult,
  ScheduleRelationship,
  ScheduleTargetType,
} from "../../application/admin/schedule-types";
import { callSupabaseAdminRpc } from "../supabase/admin-rest";

const optionSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  active: z.boolean().optional(),
});

const configurationSchema = z.object({
  templates: z.array(
    z.object({
      id: z.string().uuid(),
      code: z.string(),
      name: z.string(),
      sessionType: z.string(),
      attendanceMode: z.string(),
      faceVerificationRequired: z.boolean(),
      lateEnabled: z.boolean(),
      active: z.boolean(),
    }),
  ),
  rules: z.array(
    z.object({
      id: z.string().uuid(),
      templateId: z.string().uuid(),
      name: z.string(),
      recurrenceRule: z.string().nullable(),
      startsOn: z.string().date(),
      endsOn: z.string().date().nullable(),
      opensAt: z.string(),
      lateAfterAt: z.string().nullable(),
      closesAt: z.string(),
      targetType: z.enum([
        "ALL_STUDENTS",
        "GRADE_LEVELS",
        "CLASSES",
        "DEPARTMENTS",
        "SELECTED_STUDENTS",
      ]),
      targetSelector: z.record(z.string(), z.unknown()),
      scheduleRelationship: z.enum([
        "NORMAL",
        "ADDITIVE",
        "REPLACE_NORMAL",
        "CANCEL_NORMAL",
      ]),
      active: z.boolean(),
      materializedOccurrences: z.number().int().nonnegative(),
      lastMaterializedDate: z.string().date().nullable(),
    }),
  ),
  classes: z.array(optionSchema),
  gradeLevels: z.array(optionSchema),
  departments: z.array(optionSchema),
});

const createResultSchema = z.object({
  ruleId: z.string().uuid(),
  created: z.boolean(),
});

const retireResultSchema = z.object({
  ruleId: z.string().uuid(),
  endsOn: z.string().date(),
  unchanged: z.boolean(),
  cancelledOccurrences: z.number().int().nonnegative(),
});

export function parseAdminScheduleConfiguration(raw: unknown): AdminScheduleConfiguration {
  const parsed = configurationSchema.parse(raw);

  return {
    ...parsed,
    rules: parsed.rules.map((rule) => ({
      ...rule,
      recurrenceRule: rule.recurrenceRule ?? undefined,
      endsOn: rule.endsOn ?? undefined,
      lateAfterAt: rule.lateAfterAt ?? undefined,
      lastMaterializedDate: rule.lastMaterializedDate ?? undefined,
    })),
  };
}

export async function getAdminScheduleConfiguration(
  actorUserId: string,
): Promise<AdminScheduleConfiguration> {
  const raw = await callSupabaseAdminRpc<unknown>("get_admin_schedule_configuration", {
    p_actor_user_id: actorUserId,
  });

  return parseAdminScheduleConfiguration(raw);
}

export async function createAttendanceScheduleRule(input: {
  actorUserId: string;
  templateId: string;
  name: string;
  recurrenceRule?: string;
  startsOn: string;
  endsOn?: string;
  opensAt: string;
  lateAfterAt?: string;
  closesAt: string;
  targetType: ScheduleTargetType;
  targetSelector: Record<string, unknown>;
  scheduleRelationship: ScheduleRelationship;
  note?: string;
}): Promise<CreateScheduleRuleResult> {
  const raw = await callSupabaseAdminRpc<unknown>("create_attendance_schedule_rule", {
    p_actor_user_id: input.actorUserId,
    p_session_template_id: input.templateId,
    p_name: input.name,
    p_recurrence_rule: input.recurrenceRule ?? null,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn ?? null,
    p_opens_at: input.opensAt,
    p_late_after_at: input.lateAfterAt ?? null,
    p_closes_at: input.closesAt,
    p_target_type: input.targetType,
    p_target_selector: input.targetSelector,
    p_schedule_relationship: input.scheduleRelationship,
    p_note: input.note?.trim() || null,
  });

  return createResultSchema.parse(raw);
}

export async function retireAttendanceScheduleRule(input: {
  actorUserId: string;
  ruleId: string;
  effectiveOn: string;
  note?: string;
}): Promise<RetireScheduleRuleResult> {
  const raw = await callSupabaseAdminRpc<unknown>("retire_attendance_schedule_rule", {
    p_actor_user_id: input.actorUserId,
    p_rule_id: input.ruleId,
    p_effective_on: input.effectiveOn,
    p_note: input.note?.trim() || null,
  });

  return retireResultSchema.parse(raw);
}
