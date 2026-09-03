import { describe, expect, it } from "vitest";
import { parseAdminScheduleConfiguration } from "./supabase-schedules";

describe("parseAdminScheduleConfiguration", () => {
  it("maps nullable schedule fields to optional application fields", () => {
    const parsed = parseAdminScheduleConfiguration({
      templates: [
        {
          id: "11111111-1111-4111-8111-111111111001",
          code: "ARRIVAL",
          name: "Masuk Sekolah",
          sessionType: "SCHOOL_ARRIVAL",
          attendanceMode: "CHECK_IN",
          faceVerificationRequired: true,
          lateEnabled: true,
          active: true,
        },
      ],
      rules: [
        {
          id: "22222222-2222-4222-8222-222222222001",
          templateId: "11111111-1111-4111-8111-111111111001",
          name: "Hari Sekolah",
          recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
          startsOn: "2026-07-01",
          endsOn: null,
          opensAt: "06:00:00",
          lateAfterAt: "07:00:00",
          closesAt: "07:30:00",
          targetType: "ALL_STUDENTS",
          targetSelector: {},
          scheduleRelationship: "NORMAL",
          active: true,
          materializedOccurrences: 5,
          lastMaterializedDate: "2026-09-03",
        },
      ],
      classes: [],
      gradeLevels: [],
      departments: [],
    });

    expect(parsed.rules[0].endsOn).toBeUndefined();
    expect(parsed.rules[0].recurrenceRule).toBe(
      "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    );
    expect(parsed.rules[0].materializedOccurrences).toBe(5);
  });
});
