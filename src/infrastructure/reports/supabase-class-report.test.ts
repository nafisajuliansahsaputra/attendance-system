import { describe, expect, it } from "vitest";
import { parseClassAttendanceReport } from "./supabase-class-report";

describe("parseClassAttendanceReport", () => {
  it("keeps school-day reasons separate from raw session participation", () => {
    const report = parseClassAttendanceReport({
      class: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        code: "X-RPL-1",
        name: "X RPL 1",
      },
      period: {
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      },
      totals: {
        students: 2,
        requiredStudentDays: 4,
        present: 1,
        late: 1,
        sakit: 1,
        izin: 0,
        alpa: 0,
        pending: 1,
      },
      students: [
        {
          studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          nis: "10001",
          fullName: "Siswa Demo",
          requiredDays: 2,
          present: 1,
          late: 0,
          sakit: 1,
          izin: 0,
          alpa: 0,
          pending: 0,
        },
      ],
      sessionTypes: [
        {
          sessionType: "DHUHA",
          scheduledParticipations: 2,
          attendedParticipations: 1,
        },
      ],
      policyNotes: ["Raw session participation does not imply a finalized denominator policy."],
    });

    expect(report.totals.sakit).toBe(1);
    expect(report.sessionTypes[0]).toEqual({
      sessionType: "DHUHA",
      scheduledParticipations: 2,
      attendedParticipations: 1,
    });
  });

  it("rejects negative report counters", () => {
    expect(() =>
      parseClassAttendanceReport({
        class: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          code: "X-RPL-1",
          name: "X RPL 1",
        },
        period: { startDate: "2026-09-01", endDate: "2026-09-30" },
        totals: {
          students: 1,
          requiredStudentDays: -1,
          present: 0,
          late: 0,
          sakit: 0,
          izin: 0,
          alpa: 0,
          pending: 0,
        },
        students: [],
        sessionTypes: [],
        policyNotes: [],
      }),
    ).toThrow();
  });
});
