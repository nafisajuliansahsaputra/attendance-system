import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getClassAttendanceReport } from "@/infrastructure/reports/supabase-class-report";
import { requireAuthorizedUser } from "@/lib/auth/require-authorized-user";
import { PrintReportButton } from "./print-button";

export const dynamic = "force-dynamic";

interface PrintReportPageProps {
  searchParams: Promise<{
    class?: string;
    from?: string;
    to?: string;
  }>;
}

const querySchema = z
  .object({
    classId: z.string().uuid(),
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((value) => value.from <= value.to, {
    path: ["from"],
    message: "from must be before or equal to to",
  });

function sessionLabel(type: string) {
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

export default async function PrintReportPage({
  searchParams,
}: PrintReportPageProps) {
  const { userId } = await requireAuthorizedUser([
    "HOMEROOM_TEACHER",
    "SYSTEM_ADMIN",
  ]);
  const params = await searchParams;
  const parsed = querySchema.safeParse({
    classId: params.class,
    from: params.from,
    to: params.to,
  });

  if (!parsed.success) {
    redirect("/teacher/reports");
  }

  const report = await getClassAttendanceReport({
    actorUserId: userId,
    classId: parsed.data.classId,
    startDate: parsed.data.from,
    endDate: parsed.data.to,
  });
  const backQuery = new URLSearchParams({
    class: report.class.id,
    from: report.period.startDate,
    to: report.period.endDate,
  });

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] bg-white px-6 py-8 text-black sm:px-10">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          html, body {
            background: #fff !important;
            color: #000 !important;
          }
          .report-print-controls {
            display: none !important;
          }
          .report-print-section {
            break-inside: avoid;
          }
          .report-print-table {
            font-size: 10px;
          }
          .report-print-table th,
          .report-print-table td {
            padding: 5px 7px !important;
          }
        }
      `}</style>

      <div className="report-print-controls mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-black/15 pb-5">
        <Link
          href={`/teacher/reports?${backQuery.toString()}`}
          className="rounded-xl border border-black/20 px-4 py-3 text-sm font-medium"
        >
          ← Kembali ke rekap
        </Link>
        <PrintReportButton />
      </div>

      <header className="border-b-2 border-black pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-black/55">
          Sistem Absensi
        </p>
        <h1 className="mt-2 text-3xl font-bold">Rekap Absensi Kelas</h1>
        <div className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <span className="font-semibold">Kelas:</span> {report.class.name}
          </p>
          <p>
            <span className="font-semibold">Periode:</span> {report.period.startDate} — {report.period.endDate}
          </p>
        </div>
      </header>

      <section className="report-print-section mt-6 grid grid-cols-4 gap-3 lg:grid-cols-8">
        {[
          ["Siswa", report.totals.students],
          ["Hari wajib", report.totals.requiredStudentDays],
          ["Hadir", report.totals.present],
          ["Terlambat", report.totals.late],
          ["Sakit", report.totals.sakit],
          ["Izin", report.totals.izin],
          ["Alpa", report.totals.alpa],
          ["Pending", report.totals.pending],
        ].map(([label, value]) => (
          <article key={label} className="border border-black/20 p-3">
            <p className="text-[11px] uppercase tracking-wide text-black/55">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-7">
        <h2 className="text-lg font-bold">Rekap per siswa</h2>
        <div className="mt-3 overflow-hidden border border-black/30">
          <table className="report-print-table w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-black/[0.04]">
                <th className="border-b border-black/25 px-3 py-2">No</th>
                <th className="border-b border-black/25 px-3 py-2">NIS</th>
                <th className="border-b border-black/25 px-3 py-2">Nama</th>
                <th className="border-b border-black/25 px-3 py-2">Wajib</th>
                <th className="border-b border-black/25 px-3 py-2">Hadir</th>
                <th className="border-b border-black/25 px-3 py-2">Terlambat</th>
                <th className="border-b border-black/25 px-3 py-2">Sakit</th>
                <th className="border-b border-black/25 px-3 py-2">Izin</th>
                <th className="border-b border-black/25 px-3 py-2">Alpa</th>
                <th className="border-b border-black/25 px-3 py-2">Pending</th>
              </tr>
            </thead>
            <tbody>
              {report.students.map((student, index) => (
                <tr key={student.studentId} className="border-t border-black/15">
                  <td className="px-3 py-2">{index + 1}</td>
                  <td className="px-3 py-2">{student.nis}</td>
                  <td className="px-3 py-2 font-medium">{student.fullName}</td>
                  <td className="px-3 py-2">{student.requiredDays}</td>
                  <td className="px-3 py-2">{student.present}</td>
                  <td className="px-3 py-2">{student.late}</td>
                  <td className="px-3 py-2">{student.sakit}</td>
                  <td className="px-3 py-2">{student.izin}</td>
                  <td className="px-3 py-2">{student.alpa}</td>
                  <td className="px-3 py-2">{student.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="report-print-section mt-7 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold">Partisipasi sesi</h2>
          <table className="mt-3 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-black/[0.04]">
                <th className="border border-black/20 px-3 py-2 text-left">Sesi</th>
                <th className="border border-black/20 px-3 py-2 text-left">Terjadwal</th>
                <th className="border border-black/20 px-3 py-2 text-left">Hadir</th>
              </tr>
            </thead>
            <tbody>
              {report.sessionTypes.map((session) => (
                <tr key={session.sessionType}>
                  <td className="border border-black/20 px-3 py-2">
                    {sessionLabel(session.sessionType)}
                  </td>
                  <td className="border border-black/20 px-3 py-2">
                    {session.scheduledParticipations}
                  </td>
                  <td className="border border-black/20 px-3 py-2">
                    {session.attendedParticipations}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-bold">Catatan sistem</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-5 text-black/70">
            {report.policyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="mt-10 border-t border-black/20 pt-4 text-[10px] leading-4 text-black/55">
        Dokumen ini dibuat dari attendance canonical, participant schedule snapshot, dan konfirmasi wali kelas yang tersimpan di sistem.
      </footer>
    </main>
  );
}
