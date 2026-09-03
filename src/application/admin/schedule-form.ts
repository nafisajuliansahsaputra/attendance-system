import type { ScheduleTargetType } from "./schedule-types";

export const scheduleDayCodes = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type ScheduleDayCode = (typeof scheduleDayCodes)[number];
export type ScheduleRecurrenceType = "ONCE" | "DAILY" | "WEEKLY";

export function buildScheduleRecurrenceRule(input: {
  type: ScheduleRecurrenceType;
  days?: string[];
}): string | undefined {
  if (input.type === "ONCE") {
    return undefined;
  }

  if (input.type === "DAILY") {
    return "FREQ=DAILY";
  }

  const selected = scheduleDayCodes.filter((day) => input.days?.includes(day));
  if (selected.length === 0) {
    throw new Error("WEEKLY_DAYS_REQUIRED");
  }

  return `FREQ=WEEKLY;BYDAY=${selected.join(",")}`;
}

export function buildScheduleTargetSelector(input: {
  targetType: Exclude<ScheduleTargetType, "SELECTED_STUDENTS">;
  targetId?: string;
}): Record<string, unknown> {
  if (input.targetType === "ALL_STUDENTS") {
    return {};
  }

  if (!input.targetId) {
    throw new Error("TARGET_ID_REQUIRED");
  }

  switch (input.targetType) {
    case "CLASSES":
      return { class_ids: [input.targetId] };
    case "GRADE_LEVELS":
      return { grade_ids: [input.targetId] };
    case "DEPARTMENTS":
      return { department_ids: [input.targetId] };
  }
}
