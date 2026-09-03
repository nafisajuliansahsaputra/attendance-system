import { describe, expect, it } from "vitest";
import { mapSupabaseAttendanceContext } from "./supabase-attendance-context-resolver";

describe("mapSupabaseAttendanceContext", () => {
  it("maps an eligible arrival context", () => {
    const context = mapSupabaseAttendanceContext({
      institutionId: "11111111-1111-4111-8111-111111111111",
      deviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
      schoolDate: "2026-09-03",
      timezone: "Asia/Jakarta",
      card: {
        uid: "DE:MO:10:01",
        registered: true,
        credentialId: "44444444-4444-4444-8444-444444444001",
        student: {
          id: "22222222-2222-4222-8222-222222222001",
          name: "Alya Pratama",
          enrollmentId: "33333333-3333-4333-8333-333333333001",
          className: "X RPL 1",
        },
      },
      faceProfile: {
        id: "55555555-5555-4555-8555-555555555001",
        modelName: "demo-face-adapter",
        modelVersion: "v1",
        templateReference: "demo://face/alya-pratama",
      },
      sessions: [
        {
          id: "88888888-8888-4888-8888-888888888001",
          name: "Masuk Sekolah",
          sessionType: "SCHOOL_ARRIVAL",
          attendanceMode: "CHECK_IN",
          opensAt: "2026-09-02T23:00:00+00:00",
          lateAfterAt: "2026-09-03T00:00:00+00:00",
          closesAt: "2026-09-03T00:30:00+00:00",
          eligible: true,
          duplicate: false,
          faceVerificationRequired: true,
          scheduleRelationship: "NORMAL",
        },
      ],
    });

    expect(context.card.student?.className).toBe("X RPL 1");
    expect(context.sessions[0]?.type).toBe("arrival");
    expect(context.sessions[0]?.eligible).toBe(true);
    expect(context.faceProfile?.modelVersion).toBe("v1");
  });

  it("keeps a non-target Dhuha student explicitly not eligible", () => {
    const context = mapSupabaseAttendanceContext({
      institutionId: "11111111-1111-4111-8111-111111111111",
      deviceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001",
      schoolDate: "2026-09-03",
      timezone: "Asia/Jakarta",
      card: {
        uid: "DE:MO:11:01",
        registered: true,
        student: {
          id: "22222222-2222-4222-8222-222222222003",
          name: "Citra Lestari",
          className: "XI RPL 1",
        },
      },
      faceProfile: null,
      sessions: [
        {
          id: "88888888-8888-4888-8888-888888888002",
          name: "Dhuha Kelas X",
          sessionType: "DHUHA",
          attendanceMode: "SINGLE_PRESENCE",
          opensAt: "2026-09-03T00:45:00+00:00",
          lateAfterAt: null,
          closesAt: "2026-09-03T01:30:00+00:00",
          eligible: false,
          duplicate: false,
          faceVerificationRequired: true,
          scheduleRelationship: "ADDITIVE",
        },
      ],
    });

    expect(context.sessions[0]?.type).toBe("dhuha");
    expect(context.sessions[0]?.eligible).toBe(false);
  });
});
