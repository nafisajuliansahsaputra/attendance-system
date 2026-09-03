import { getHomeroomAttendanceSnapshot } from "../../infrastructure/homeroom/supabase-homeroom";
import { requireAuthorizedUser } from "../../lib/auth/require-authorized-user";
import { confirmAttendanceStatus } from "./actions";

export const dynamic = "force-dynamic";

interface TeacherPageProps {
  searchParams: Promise<{
    class?: string;
    date?: string;
    saved?: string;
    error?: string;
  }>;
}

function formatArrival(value?: string) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function statusLabel(systemState: string, finalStatus?: string) {
  if (finalStatus === "PRESENT") return "Hadir";
  if (finalStatus === "LATE") return "Terlambat";
  if (finalStatus === "SAKIT") return "Sakit";
  if (finalStatus === "IZIN") return "Izin";
  if (finalStatus === "ALPA") return "Alpa";
  if (systemState === "NOT_SCHEDULED") return "Tidak dijadwalkan";
  if (systemState === "PENDING_CONFIRMATION") return "Perlu konfirmasi";
  return systemState.replaceAll("_", " ");
}

function statusClass(finalStatus?: string, needsConfirmation?: boolean) {
  if (needsConfirmation) {
    return "border-[color:rgba(251,191,36,0.3)] bg-[color:rgba(251,191,36,0.08)] text-[var(--warning)]";
  }

  if (finalStatus === "SAKIT" || finalStatus === "IZIN") {
    return "border-[var(--border)] bg-[var(--surface-soft)] text-[var(--muted)]";
  }

  if (finalStatus === "ALPA") {
    return "border-[color:rgba(251,113,133,0.3)] bg-[color:rgba(251,113,133,0.08)] text-[var(--danger)]";
  }

  return "border-[color:rgba(74,222,128,0.25)] bg-[color:rgba(74,222,128,0.07)] text-[var(--success)]";
}

export default async function TeacherPage({ searchParams }: TeacherPageProps) {
  const { context, email, userId } = await requireAuthorizedUser([
    "HOMEROOM_TEACHER",
    "SYSTEM_ADMIN",
  ]);
  const params = await searchParams;

  const selectedClass =
    context.classes.find((item) => item.id === params.class) ?? context.classes[0];
  const schoolDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? params.date!
    : context.schoolDate;

  const rows = selectedClass
    ? await getHomeroomAttendanceSnapshot(userId, selectedClass.id, schoolDate)
    : [];

  const onTime = rows.filter((row) => row.finalStatus === "PRESENT").length;
  const late = rows.filter((row) => row.finalStatus === "LATE").length;
  const pending = rows.filter((row) => row.needsConfirmation).length;
  const absentConfirmed = rows.filter((row) =>
    ["SAKIT", "IZIN", "ALPA"].includes(row.finalStatus ?? ""),
  ).length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-7 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
            Homeroom workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Absensi wali kelas
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {context.fullName} · {email ?? context.role}
          </p>
        </div>

        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm transition hover:bg-[var(--surface-soft)]"
          >
            Keluar
          </button>
        </form>
      </header>

      <section className="mt-7 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <form method="get" className="grid gap-4 md:grid-cols-[1fr_14rem_auto] md:items-end">
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
              Tanggal
            </span>
            <input
              name="date"
              type="date"
              defaultValue={schoolDate}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-[var(--success)] px-5 py-3 text-sm font-semibold text-[#07100d]"
          >
            Tampilkan
          </button>
        </form>
      </section>

      {params.saved === "1" ? (
        <div className="mt-5 rounded-2xl border border-[color:rgba(74,222,128,0.25)] bg-[color:rgba(74,222,128,0.07)] px-4 py-3 text-sm text-[var(--success)]">
          Status ketidakhadiran berhasil dikonfirmasi dan masuk ke audit trail.
        </div>
      ) : null}

      {params.error ? (
        <div className="mt-5 rounded-2xl border border-[color:rgba(251,113,133,0.3)] bg-[color:rgba(251,113,133,0.08)] px-4 py-3 text-sm text-[var(--danger)]">
          Konfirmasi tidak dapat disimpan. Data mungkin sudah berubah atau Anda tidak memiliki akses ke siswa tersebut.
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Hadir", onTime],
          ["Terlambat", late],
          ["Perlu konfirmasi", pending],
          ["S/I/A terkonfirmasi", absentConfirmed],
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
          <h2 className="text-lg font-semibold">
            {selectedClass?.name ?? "Belum ada kelas yang ditugaskan"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {schoolDate} · {rows.length} siswa
          </p>
        </div>

        {selectedClass && rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-[var(--surface-soft)] text-xs uppercase tracking-wider text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-medium">Siswa</th>
                  <th className="px-5 py-4 font-medium">NIS</th>
                  <th className="px-5 py-4 font-medium">Masuk</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Konfirmasi wali kelas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.studentId} className="border-t border-[var(--border)] align-top">
                    <td className="px-5 py-5 font-medium">{row.fullName}</td>
                    <td className="px-5 py-5 text-[var(--muted)]">{row.nis}</td>
                    <td className="px-5 py-5">{formatArrival(row.arrivalTime)}</td>
                    <td className="px-5 py-5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${statusClass(
                          row.finalStatus,
                          row.needsConfirmation,
                        )}`}
                      >
                        {statusLabel(row.systemState, row.finalStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      {row.needsConfirmation ? (
                        <form action={confirmAttendanceStatus} className="space-y-3">
                          <input type="hidden" name="studentId" value={row.studentId} />
                          <input type="hidden" name="classId" value={row.classId} />
                          <input type="hidden" name="schoolDate" value={schoolDate} />
                          <input
                            name="note"
                            maxLength={500}
                            placeholder="Catatan opsional"
                            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs outline-none"
                          />
                          <div className="flex flex-wrap gap-2">
                            {(["SAKIT", "IZIN", "ALPA"] as const).map((status) => (
                              <button
                                key={status}
                                name="status"
                                value={status}
                                type="submit"
                                className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium transition hover:bg-[var(--surface-soft)]"
                              >
                                {status === "SAKIT"
                                  ? "Sakit"
                                  : status === "IZIN"
                                    ? "Izin"
                                    : "Alpa"}
                              </button>
                            ))}
                          </div>
                        </form>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">
                          {row.finalStatus ? "Tidak perlu tindakan" : "Tidak ada kewajiban absensi masuk"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center text-sm text-[var(--muted)]">
            {selectedClass
              ? "Tidak ada siswa aktif untuk kelas dan tanggal tersebut."
              : "Administrator belum menetapkan kelas wali untuk akun ini."}
          </div>
        )}
      </section>
    </main>
  );
}
