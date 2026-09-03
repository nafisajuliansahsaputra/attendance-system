import { describe, expect, it } from "vitest";
import { parseHomeroomAttendanceSnapshot } from "./supabase-homeroom";

describe("parseHomeroomAttendanceSnapshot", () => {
  it("maps a pending student without inventing a final absence reason", () => {
    const rows = parseHomeroomAttendanceSnapshot([
      {
        student_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        nis: "10001",
        full_name: "Siswa Demo",
        class_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        class_name: "X RPL 1",
        arrival_record_id: null,
        arrival_time: null,
        attendance_status: null,
        system_state: "PENDING_CONFIRMATION",
        final_status: null,
        needs_confirmation: true,
      },
    ]);

    expect(rows[0]).toMatchObject({
      fullName: "Siswa Demo",
      systemState: "PENDING_CONFIRMATION",
      needsConfirmation: true,
    });
    expect(rows[0].finalStatus).toBeUndefined();
  });

  it("preserves a teacher-confirmed absence reason", () => {
    const rows = parseHomeroomAttendanceSnapshot([
      {
        student_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        nis: "10001",
        full_name: "Siswa Demo",
        class_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        class_name: "X RPL 1",
        arrival_record_id: null,
        arrival_time: null,
        attendance_status: null,
        system_state: "NO_VALID_ARRIVAL",
        final_status: "SAKIT",
        needs_confirmation: false,
      },
    ]);

    expect(rows[0].finalStatus).toBe("SAKIT");
    expect(rows[0].needsConfirmation).toBe(false);
  });
});
