import { describe, expect, it } from "vitest";
import {
  buildScheduleRecurrenceRule,
  buildScheduleTargetSelector,
} from "./schedule-form";

describe("admin schedule form builders", () => {
  it("builds supported recurrence rules in canonical day order", () => {
    expect(buildScheduleRecurrenceRule({ type: "ONCE" })).toBeUndefined();
    expect(buildScheduleRecurrenceRule({ type: "DAILY" })).toBe("FREQ=DAILY");
    expect(
      buildScheduleRecurrenceRule({
        type: "WEEKLY",
        days: ["FR", "MO", "WE"],
      }),
    ).toBe("FREQ=WEEKLY;BYDAY=MO,WE,FR");
  });

  it("rejects weekly recurrence without a selected day", () => {
    expect(() =>
      buildScheduleRecurrenceRule({ type: "WEEKLY", days: [] }),
    ).toThrow("WEEKLY_DAYS_REQUIRED");
  });

  it("maps UI target selections to canonical selector JSON", () => {
    expect(
      buildScheduleTargetSelector({ targetType: "ALL_STUDENTS" }),
    ).toEqual({});
    expect(
      buildScheduleTargetSelector({
        targetType: "CLASSES",
        targetId: "class-1",
      }),
    ).toEqual({ class_ids: ["class-1"] });
  });
});
