import Link from "next/link";
import { requireAuthorizedUser } from "../../lib/auth/require-authorized-user";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { context, email } = await requireAuthorizedUser([
    "SYSTEM_ADMIN",
    "OPERATOR",
  ]);
  const isAdmin = context.role === "SYSTEM_ADMIN";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
            Operations
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Dashboard sistem</h1>
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

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Role aktif</p>
          <p className="mt-2 text-xl font-semibold">{context.role}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Tanggal sistem</p>
          <p className="mt-2 text-xl font-semibold">{context.schoolDate}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Kelas dalam scope</p>
          <p className="mt-2 text-xl font-semibold">{context.classes.length}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/terminal"
          className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
            Terminal
          </p>
          <h2 className="mt-3 text-xl font-semibold">Buka simulator absensi</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Jalankan recruiter demo yang memakai canonical attendance engine dan feedback LED/buzzer yang sama.
          </p>
        </Link>

        <Link
          href="/dashboard/devices"
          className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
            Devices
          </p>
          <h2 className="mt-3 text-xl font-semibold">Pantau terminal & heartbeat</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Monitor protocol, heartbeat, error, secret readiness, dan status terminal. Operator memiliki akses monitoring-only.
          </p>
        </Link>

        {isAdmin ? (
          <>
            <Link
              href="/dashboard/students"
              className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
                Student identity
              </p>
              <h2 className="mt-3 text-xl font-semibold">Kelola siswa, kelas & RFID</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Cari siswa, cek face profile, assign atau replace RFID, dan lakukan mutasi kelas tanpa merusak histori.
              </p>
            </Link>

            <Link
              href="/dashboard/schedules"
              className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
                Schedule engine
              </p>
              <h2 className="mt-3 text-xl font-semibold">Kelola jadwal absensi</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Atur Masuk, Dhuha, Dzuhur, Ashar, Pulang, upacara, dan kegiatan khusus sebagai rule versioned.
              </p>
            </Link>

            <Link
              href="/teacher"
              className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">
                Homeroom
              </p>
              <h2 className="mt-3 text-xl font-semibold">Tinjau workspace wali kelas</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Audit kehadiran, konfirmasi Sakit/Izin/Alpa, rekap periode, dan export laporan.
              </p>
            </Link>
          </>
        ) : (
          <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Operator
            </p>
            <h2 className="mt-3 text-xl font-semibold">Monitoring terminal</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Scope operator dibatasi pada status operasional device; perubahan konfigurasi, siswa, dan jadwal tetap milik System Admin.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
