import { describe, expect, it } from "vitest";
import { parseAdminStaffDirectory } from "./supabase-staff";

describe("parseAdminStaffDirectory", () => {
  it("parses staff roles and homeroom assignments", () => {
    const rows = parseAdminStaffDirectory([
      {
        userId: "11111111-1111-4111-8111-111111111111",
        fullName: "Wali Kelas Demo",
        role: "HOMEROOM_TEACHER",
        active: true,
        createdAt: "2026-09-03T00:00:00+00:00",
        homeroomAssignments: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            classId: "33333333-3333-4333-8333-333333333333",
            classCode: "X-RPL-1",
            className: "X RPL 1",
            academicYearId: "44444444-4444-4444-8444-444444444444",
            academicYearLabel: "2026/2027",
          },
        ],
      },
    ]);

    expect(rows[0].role).toBe("HOMEROOM_TEACHER");
    expect(rows[0].homeroomAssignments[0].className).toBe("X RPL 1");
  });
});
