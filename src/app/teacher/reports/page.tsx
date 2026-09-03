import Link from "next/link";
import { SCHOOL } from "@/config/school";
import { buildReportDatePresets } from "../../../application/reports/presets";
import { getClassAttendanceReport } from "../../../infrastructure/reports/supabase-class-report";
import { getReportingPeriodPresets } from "../../../infrastructure/reports/supabase-report-periods";
import { requireAuthorizedUser } from "../../../lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

interface ReportsPageProps {
  searchParams: Promise<{
    class?: string;
    from?: string;
    to?: string;
  }>;
}

function isDate(value?: string): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function presetHref(classId: string, from: string, to: string) {
  const query = new URLSearchParams({ class: classId, from, to });
  return `/teacher/reports?${query.toString()}`;
}

function sessionLabel(type: string) {
  const labels: Record<string, string> = {
    SCHOOL_ARRIVAL: "Masuk sekolah",
    SCHOOL_DEPARTURE: "Pulang sekolah",
    DHUHA: "Sholat Dhuha",
    DZUHUR: "Sholat Dzuhur",
    ASHAR: "Sholat Ashar",
    CEREMONY: "Upacara",
    SCHOOL_ACTIVITY: "Kegiatan sekolah",
    CUSTOM: "Kegiatan lainnya",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const { context, userId } = await requireAuthorizedUser([
    "HOMEROOM_TEACHER",
    "SYSTEM_ADMIN",
  ]);
  const params = await searchParams;
  const selectedClass =
    context.classes.find((item) => item.id === params.class) ?? context.classes[0];

  const today = context.schoolDate;
  const monthStart = `${today.slice(0, 7)}-01`;
  const startDate = isDate(params.from) ? params.from : monthStart;
  const endDate = isDate(params.to) ? params.to : today;

  const [report, reportingPeriods] = await Promise.all([
    selectedClass
      ? getClassAttendanceReport({
          actorUserId: userId,
          classId: selectedClass.id,
          startDate,
          endDate,
        })
      : Promise.resolve(null),
    getReportingPeriodPresets(userId),
  ]);

  const presets = selectedClass
    ? buildReportDatePresets({
        today,
        periods: reportingPeriods,
      })
    : [];
  const exportQuery = selectedClass
    ? new URLSearchParams({
        class: selectedClass.id,
        from: startDate,
        to: endDate,
      }).toString()
    : "";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/teacher"
            className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
          >
            ← Kembali ke pemeriksaan kehadiran
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
            {SCHOOL.name} · Wali Kelas
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Rekap Kehadiran Kelas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Rekap dihitung dari data absensi siswa dan konfirmasi Sakit, Izin, atau Alpa yang sudah diberikan wali kelas pada periode yang dipilih.
          </p>
        </div>
      </header>

      <section className="mt-7 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <form method="get" className="grid gap-4 lg:grid-cols-[1fr_12rem_12rem_auto] lg:items-end">
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Kelas
            </span>
            <select
              name="class"
              defaultValue={selectedClass?.id}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            >
              {context.classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Tanggal mulai
            </span>
            <input
              name="from"
              type="date"
              defaultValue={startDate}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Tanggal akhir
            </span>
            <input
              name="to"
              type="date"
              defaultValue={endDate}
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-white"
          >
            Tampilkan rekap
          </button>
        </form>

        {selectedClass ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Link
                key={`${preset.label}-${preset.from}-${preset.to}`}
                href={presetHref(selectedClass.id, preset.from, preset.to)}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--surface-soft)]"
              >
                {preset.label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {report ? (
        <>
          <section className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Unduh atau cetak rekap</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                File CSV dapat dibuka menggunakan Excel. Tampilan cetak dapat langsung dicetak atau disimpan sebagai PDF melalui menu cetak browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/api/reports/class/csv?${exportQuery}`}
                prefetch={false}
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
              >
                Unduh CSV
              </Link>
              <Link
                href={`/teacher/reports/print?${exportQuery}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[var(--success)] px-4 py-3 text-sm font-semibold text-white"
              >
                Cetak / Simpan PDF
              </Link>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Jumlah siswa", report.totals.students],
              ["Hadir", report.totals.present],
              ["Terlambat", report.totals.late],
              ["Belum dikonfirmasi", report.totals.pending],
              ["Sakit", report.totals.sakit],
              ["Izin", report.totals.izin],
              ["Alpa", report.totals.alpa],
              ["Total hari wajib siswa", report.totals.requiredStudentDays],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <p className="text-sm text-[var(--muted)]">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-5 py-5 sm:px-6">
              <h2 className="text-lg font-semibold">Rekap per siswa</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {report.class.name} · {report.period.startDate} — {report.period.endDate}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wider text-[var(--muted)]">
                  <tr>
                    <th className="px-5 py-4 font-medium">Siswa</th>
                    <th className="px-5 py-4 font-medium">Hari wajib</th>
                    <th className="px-5 py-4 font-medium">Hadir</th>
                    <th className="px-5 py-4 font-medium">Terlambat</th>
                    <th className="px-5 py-4 font-medium">Sakit</th>
                    <th className="px-5 py-4 font-medium">Izin</th>
                    <th className="px-5 py-4 font-medium">Alpa</th>
                    <th className="px-5 py-4 font-medium">Belum dikonfirmasi</th>
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((student) => (
                    <tr key={student.studentId} className="border-t border-[var(--border)]">
                      <td className="px-5 py-4">
                        <p className="font-medium">{student.fullName}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">NIS {student.nis}</p>
                      </td>
                      <td className="px-5 py-4">{student.requiredDays}</td>
                      <td className="px-5 py-4">{student.present}</td>
                      <td className="px-5 py-4">{student.late}</td>
                      <td className="px-5 py-4">{student.sakit}</td>
                      <td className="px-5 py-4">{student.izin}</td>
                      <td className="px-5 py-4">{student.alpa}</td>
                      <td className="px-5 py-4">{student.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Kehadiran kegiatan & sesi sekolah</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Bagian ini menampilkan jumlah keikutsertaan siswa pada setiap jenis sesi yang dijadwalkan dan jumlah yang tercatat hadir. Persentase khusus ibadah atau kegiatan belum dihitung sampai aturan sekolah untuk Sakit/Izin pada perhitungan tersebut ditetapkan.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {report.sessionTypes.map((session) => (
                <article
                  key={session.sessionType}
                  className="rounded-2xl border border-[var(--border)] bg-white p-4"
                >
                  <p className="font-medium">{sessionLabel(session.sessionType)}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Hadir {session.attendedParticipations} dari {session.scheduledParticipations} keikutsertaan yang dijadwalkan
                  </p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section className="mt-6 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center text-sm text-[var(--muted)]">
          Belum ada kelas yang tersedia untuk akun ini.
        </section>
      )}
    </main>
  );
}
