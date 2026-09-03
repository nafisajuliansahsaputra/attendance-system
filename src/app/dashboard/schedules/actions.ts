"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  buildScheduleRecurrenceRule,
  buildScheduleTargetSelector,
  scheduleDayCodes,
} from "../../../application/admin/schedule-form";
import {
  createAttendanceScheduleRule,
  retireAttendanceScheduleRule,
} from "../../../infrastructure/admin/supabase-schedules";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const createSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
  recurrenceType: z.enum(["ONCE", "DAILY", "WEEKLY"]),
  startsOn: z.string().date(),
  endsOn: z.string().date().optional().or(z.literal("")),
  opensAt: timeSchema,
  lateAfterAt: timeSchema.optional().or(z.literal("")),
  closesAt: timeSchema,
  targetType: z.enum([
    "ALL_STUDENTS",
    "GRADE_LEVELS",
    "CLASSES",
    "DEPARTMENTS",
  ]),
  targetId: z.string().uuid().optional().or(z.literal("")),
  scheduleRelationship: z.enum([
    "NORMAL",
    "ADDITIVE",
    "REPLACE_NORMAL",
    "CANCEL_NORMAL",
  ]),
  note: z.string().trim().max(300).optional(),
});

const retireSchema = z.object({
  ruleId: z.string().uuid(),
  effectiveOn: z.string().date(),
  note: z.string().trim().max(300).optional(),
});

function scheduleUrl(input?: { saved?: string; error?: string }) {
  const query = new URLSearchParams();
  if (input?.saved) query.set("saved", input.saved);
  if (input?.error) query.set("error", input.error);
  const suffix = query.toString();
  return suffix ? `/dashboard/schedules?${suffix}` : "/dashboard/schedules";
}

function mapScheduleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("WEEKLY_DAYS_REQUIRED")) return "weekly-days";
  if (message.includes("TARGET_ID_REQUIRED") || message.includes("TARGET_")) {
    return "target";
  }
  if (message.includes("UNSUPPORTED_RECURRENCE_RULE")) return "recurrence";
  if (message.includes("LATE_NOT_SUPPORTED_BY_TEMPLATE")) return "late-template";
  if (message.includes("INVALID_LATE_THRESHOLD")) return "late-window";
  if (message.includes("INVALID_SCHEDULE_TIME_RANGE")) return "time-window";
  if (message.includes("INVALID_SCHEDULE_DATE_RANGE")) return "date-window";
  if (message.includes("SESSION_TEMPLATE_NOT_FOUND")) return "template";
  if (message.includes("SCHEDULE_RETIREMENT_CONFLICT_WITH_ATTENDANCE")) {
    return "retire-attendance";
  }
  if (message.includes("INVALID_RETIREMENT_DATE")) return "retire-date";
  if (message.includes("SCHEDULE_RULE_NOT_FOUND")) return "rule-not-found";
  if (message.includes("FORBIDDEN_ADMIN_ONLY")) return "forbidden";
  return "save-failed";
}

export async function createScheduleRuleAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = createSchema.safeParse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    recurrenceType: formData.get("recurrenceType"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn") || "",
    opensAt: formData.get("opensAt"),
    lateAfterAt: formData.get("lateAfterAt") || "",
    closesAt: formData.get("closesAt"),
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId") || "",
    scheduleRelationship: formData.get("scheduleRelationship"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    redirect(scheduleUrl({ error: "invalid-input" }));
  }

  const days = formData
    .getAll("days")
    .filter((value): value is string => typeof value === "string")
    .filter((value) => scheduleDayCodes.includes(value as (typeof scheduleDayCodes)[number]));

  let errorCode: string | undefined;

  try {
    const recurrenceRule = buildScheduleRecurrenceRule({
      type: parsed.data.recurrenceType,
      days,
    });
    const targetSelector = buildScheduleTargetSelector({
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId || undefined,
    });

    await createAttendanceScheduleRule({
      actorUserId: userId,
      templateId: parsed.data.templateId,
      name: parsed.data.name,
      recurrenceRule,
      startsOn: parsed.data.startsOn,
      endsOn: parsed.data.endsOn || undefined,
      opensAt: parsed.data.opensAt,
      lateAfterAt: parsed.data.lateAfterAt || undefined,
      closesAt: parsed.data.closesAt,
      targetType: parsed.data.targetType,
      targetSelector,
      scheduleRelationship: parsed.data.scheduleRelationship,
      note: parsed.data.note,
    });
  } catch (error) {
    errorCode = mapScheduleError(error);
  }

  if (errorCode) {
    redirect(scheduleUrl({ error: errorCode }));
  }

  revalidatePath("/dashboard/schedules");
  revalidatePath("/teacher");
  revalidatePath("/teacher/reports");
  redirect(scheduleUrl({ saved: "created" }));
}

export async function retireScheduleRuleAction(formData: FormData) {
  const { userId } = await requireAuthorizedUser(["SYSTEM_ADMIN"]);
  const parsed = retireSchema.safeParse({
    ruleId: formData.get("ruleId"),
    effectiveOn: formData.get("effectiveOn"),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    redirect(scheduleUrl({ error: "invalid-retire" }));
  }

  let errorCode: string | undefined;

  try {
    await retireAttendanceScheduleRule({
      actorUserId: userId,
      ruleId: parsed.data.ruleId,
      effectiveOn: parsed.data.effectiveOn,
      note: parsed.data.note,
    });
  } catch (error) {
    errorCode = mapScheduleError(error);
  }

  if (errorCode) {
    redirect(scheduleUrl({ error: errorCode }));
  }

  revalidatePath("/dashboard/schedules");
  revalidatePath("/teacher");
  revalidatePath("/teacher/reports");
  redirect(scheduleUrl({ saved: "retired" }));
}
