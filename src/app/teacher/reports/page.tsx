import Link from "next/link";
import { getClassAttendanceReport } from "../../../infrastructure/reports/supabase-class-report";
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

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
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
    CUSTOM: "Kegiatan lain",
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
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const startDate = isDate(params.from) ? params.from : monthStart;
  const endDate = isDate(params.to) ? params.to : today;

  const report = selectedClass
    ? await getClassAttendanceReport({
        actorUserId: userId,
        classId: selectedClass.id,
        startDate,
        endDate,
      })
    : null;

  const presets = selectedClass
    ? [
        ["7 hari", shiftDate(today, -6), today],
        ["Bulan ini", monthStart, today],
        ["Tahun ini", yearStart, today],
      ] as const
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
            ← Kembali ke absensi harian
          </Link>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
            Derived reports
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Rekap absensi kelas</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Rekap dihitung ulang dari attendance canonical dan konfirmasi wali kelas,
            bukan dari counter manual yang disimpan terpisah.
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
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
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
              Dari
            </span>
            <input
              name="from"
              type="date"
              defaultValue={startDate}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
              Sampai
            </span>
            <input
              name="to"
              type="date"
              defaultValue={endDate}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-[#07100d]"
          >
            Buat rekap
          </button>
        </form>

        {selectedClass ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {presets.map(([label, from, to]) => (
              <Link
                key={label}
                href={presetHref(selectedClass.id, from, to)}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition hover:bg-[var(--surface-soft)]"
              >
                {label}
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {report ? (
        <>
          <section className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Export rekap</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                CSV menggunakan format UTF-8 yang ramah Excel. Tampilan print dapat langsung disimpan sebagai PDF dari dialog print browser.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/api/reports/class/csv?${exportQuery}`}
                prefetch={false}
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
              >
                Download CSV
              </Link>
              <Link
                href={`/teacher/reports/print?${exportQuery}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[var(--success)] px-4 py-3 text-sm font-semibold text-[#07100d]"
              >
                Print / Save PDF
              </Link>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Siswa", report.totals.students],
              ["Hadir", report.totals.present],
              ["Terlambat", report.totals.late],
              ["Pending", report.totals.pending],
              ["Sakit", report.totals.sakit],
              ["Izin", report.totals.izin],
              ["Alpa", report.totals.alpa],
              ["Hari wajib (student-days)", report.totals.requiredStudentDays],
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
                    <th className="px-5 py-4 font-medium">Wajib</th>
                    <th className="px-5 py-4 font-medium">Hadir</th>
                    <th className="px-5 py-4 font-medium">Terlambat</th>
                    <th className="px-5 py-4 font-medium">Sakit</th>
                    <th className="px-5 py-4 font-medium">Izin</th>
                    <th className="px-5 py-4 font-medium">Alpa</th>
                    <th className="px-5 py-4 font-medium">Pending</th>
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
            <h2 className="text-lg font-semibold">Partisipasi sesi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              Angka di bawah adalah fakta mentah sesi yang terjadwal vs tercatat hadir.
              Sistem belum menghitung persentase ibadah/kegiatan sampai kebijakan Sakit/Izin
              terhadap denominator diputuskan.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {report.sessionTypes.map((session) => (
                <article
                  key={session.sessionType}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4"
                >
                  <p className="font-medium">{sessionLabel(session.sessionType)}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    Hadir {session.attendedParticipations} dari {session.scheduledParticipations} partisipasi terjadwal
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
