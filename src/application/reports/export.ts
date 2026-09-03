import type { ClassAttendanceReport } from "./types";

const CSV_DELIMITER = ";";
const FORMULA_PREFIX = /^[=+\-@]/;

function protectSpreadsheetFormula(value: string): string {
  const leadingWhitespace = value.match(/^\s*/)?.[0] ?? "";
  const remainder = value.slice(leadingWhitespace.length);

  if (!FORMULA_PREFIX.test(remainder)) {
    return value;
  }

  return `${leadingWhitespace}'${remainder}`;
}

export function escapeCsvCell(value: string | number): string {
  const raw = typeof value === "number" ? String(value) : protectSpreadsheetFormula(value);
  const escaped = raw.replaceAll('"', '""');

  return `"${escaped}"`;
}

function row(values: Array<string | number>): string {
  return values.map(escapeCsvCell).join(CSV_DELIMITER);
}

function sessionLabel(type: string): string {
  const labels: Record<string, string> = {
    SCHOOL_ARRIVAL: "Masuk sekolah",
    SCHOOL_DEPARTURE: "Pulang sekolah",
    DHUHA: "Sholat Dhuha",
    DZUHUR: "Sholat Dzuhur",
    ASHAR: "Sholat Ashar",
    CEREMONY: "Upacara",
    SCHOOL_ACTIVITY: "Kegiatan sekolah",
    CUSTOM: "Kegiatan lain",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

export function classAttendanceReportToCsv(report: ClassAttendanceReport): string {
  const lines: string[] = [
    "sep=;",
    row(["Rekap Absensi Kelas"]),
    row(["Kelas", report.class.name]),
    row(["Periode", `${report.period.startDate} s.d. ${report.period.endDate}`]),
    "",
    row(["Ringkasan"]),
    row(["Siswa", report.totals.students]),
    row(["Hari wajib (student-days)", report.totals.requiredStudentDays]),
    row(["Hadir", report.totals.present]),
    row(["Terlambat", report.totals.late]),
    row(["Sakit", report.totals.sakit]),
    row(["Izin", report.totals.izin]),
    row(["Alpa", report.totals.alpa]),
    row(["Pending", report.totals.pending]),
    "",
    row(["Rekap per siswa"]),
    row([
      "No",
      "NIS",
      "Nama",
      "Hari Wajib",
      "Hadir",
      "Terlambat",
      "Sakit",
      "Izin",
      "Alpa",
      "Pending",
    ]),
  ];

  report.students.forEach((student, index) => {
    lines.push(
      row([
        index + 1,
        student.nis,
        student.fullName,
        student.requiredDays,
        student.present,
        student.late,
        student.sakit,
        student.izin,
        student.alpa,
        student.pending,
      ]),
    );
  });

  lines.push("", row(["Partisipasi sesi"]), row(["Sesi", "Terjadwal", "Hadir"]));

  report.sessionTypes.forEach((session) => {
    lines.push(
      row([
        sessionLabel(session.sessionType),
        session.scheduledParticipations,
        session.attendedParticipations,
      ]),
    );
  });

  if (report.policyNotes.length > 0) {
    lines.push("", row(["Catatan kebijakan"]));
    report.policyNotes.forEach((note) => lines.push(row([note])));
  }

  return lines.join("\r\n");
}

export function classReportExportFilename(report: ClassAttendanceReport): string {
  const safeClass = report.class.code
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "kelas";

  return `rekap-absensi-${safeClass}-${report.period.startDate}-${report.period.endDate}.csv`;
}
