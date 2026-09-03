import { describe, expect, it } from "vitest";
import type { ClassAttendanceReport } from "./types";
import {
  classAttendanceReportToCsv,
  classReportExportFilename,
  escapeCsvCell,
} from "./export";

const report: ClassAttendanceReport = {
  class: {
    id: "11111111-1111-4111-8111-111111111111",
    code: "X RPL 1",
    name: "X RPL 1",
  },
  period: {
    startDate: "2026-09-01",
    endDate: "2026-09-30",
  },
  totals: {
    students: 2,
    requiredStudentDays: 40,
    present: 35,
    late: 2,
    sakit: 1,
    izin: 1,
    alpa: 0,
    pending: 1,
  },
  students: [
    {
      studentId: "22222222-2222-4222-8222-222222222001",
      nis: "1001",
      fullName: "Alya Pratama",
      requiredDays: 20,
      present: 18,
      late: 1,
      sakit: 1,
      izin: 0,
      alpa: 0,
      pending: 0,
    },
    {
      studentId: "22222222-2222-4222-8222-222222222002",
      nis: "=HYPERLINK(\"https://invalid.example\",\"click\")",
      fullName: "+Bima Mahendra",
      requiredDays: 20,
      present: 17,
      late: 1,
      sakit: 0,
      izin: 1,
      alpa: 0,
      pending: 1,
    },
  ],
  sessionTypes: [
    {
      sessionType: "DHUHA",
      scheduledParticipations: 8,
      attendedParticipations: 7,
    },
  ],
  policyNotes: ["Partisipasi ibadah masih berupa fakta mentah."],
};

describe("report CSV export", () => {
  it("quotes cells and protects formula-like spreadsheet values", () => {
    expect(escapeCsvCell("Alya \"A\" Pratama")).toBe('"Alya ""A"" Pratama"');
    expect(escapeCsvCell("=1+1")).toBe('"\'=1+1"');
    expect(escapeCsvCell("  @SUM(A1:A2)")).toBe('"  \'@SUM(A1:A2)"');
  });

  it("builds an Excel-friendly semicolon CSV with report sections", () => {
    const csv = classAttendanceReportToCsv(report);

    expect(csv.startsWith("sep=;\r\n")).toBe(true);
    expect(csv).toContain('"Rekap per siswa"');
    expect(csv).toContain('"Sholat Dhuha";"8";"7"');
    expect(csv).toContain('"\'=HYPERLINK(""https://invalid.example"",""click"")"');
    expect(csv).toContain('"\'+Bima Mahendra"');
  });

  it("creates a stable safe filename", () => {
    expect(classReportExportFilename(report)).toBe(
      "rekap-absensi-x-rpl-1-2026-09-01-2026-09-30.csv",
    );
  });
});
