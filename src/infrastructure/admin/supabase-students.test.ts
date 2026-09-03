import { describe, expect, it } from "vitest";
import {
  parseAdminStudentDirectory,
  parseTransferStudentEnrollmentResult,
} from "./supabase-students";

describe("admin student persistence contracts", () => {
  it("accepts a student with active class, RFID, and face status", () => {
    expect(
      parseAdminStudentDirectory([
        {
          studentId: "22222222-2222-4222-8222-222222222001",
          nis: "1001",
          fullName: "Alya Pratama",
          active: true,
          enrollmentId: "33333333-3333-4333-8333-333333333001",
          classId: "44444444-4444-4444-8444-444444444001",
          classCode: "X-RPL-1",
          className: "X RPL 1",
          rfidCredentialId: "55555555-5555-4555-8555-555555555001",
          rfidUid: "DE:MO:10:01",
          rfidRegisteredAt: "2026-07-01T00:00:00+00:00",
          faceProfileId: "66666666-6666-4666-8666-666666666001",
          faceStatus: "ACTIVE",
          faceModelName: "demo-face-adapter",
          faceModelVersion: "v1",
          faceEnrolledAt: "2026-07-01T00:00:00+00:00",
        },
      ]),
    ).toHaveLength(1);
  });

  it("allows a student without RFID or face enrollment", () => {
    expect(
      parseAdminStudentDirectory([
        {
          studentId: "22222222-2222-4222-8222-222222222002",
          nis: "1002",
          fullName: "Bima Mahendra",
          active: true,
        },
      ])[0],
    ).toEqual({
      studentId: "22222222-2222-4222-8222-222222222002",
      nis: "1002",
      fullName: "Bima Mahendra",
      active: true,
    });
  });

  it("maps a class transfer result and removes a null previous enrollment id", () => {
    expect(
      parseTransferStudentEnrollmentResult({
        studentId: "22222222-2222-4222-8222-222222222002",
        enrollmentId: "33333333-3333-4333-8333-333333333099",
        classId: "44444444-4444-4444-8444-444444444002",
        effectiveOn: "2026-09-04",
        unchanged: false,
        previousEnrollmentId: null,
      }),
    ).toEqual({
      studentId: "22222222-2222-4222-8222-222222222002",
      enrollmentId: "33333333-3333-4333-8333-333333333099",
      classId: "44444444-4444-4444-8444-444444444002",
      effectiveOn: "2026-09-04",
      unchanged: false,
      previousEnrollmentId: undefined,
    });
  });
});
