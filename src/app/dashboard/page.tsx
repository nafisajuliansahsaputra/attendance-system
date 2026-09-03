import Link from "next/link";
import { SCHOOL, roleLabel } from "@/config/school";
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
            {SCHOOL.name}
          </p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Pusat Pengelolaan Absensi</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {context.fullName} · {roleLabel(context.role)}{email ? ` · ${email}` : ""}
          </p>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm transition hover:bg-[var(--surface-soft)]">
            Keluar
          </button>
        </form>
      </header>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Hak akses</p>
          <p className="mt-2 text-xl font-semibold">{roleLabel(context.role)}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Tanggal sekolah</p>
          <p className="mt-2 text-xl font-semibold">{context.schoolDate}</p>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Kelas dalam tanggung jawab</p>
          <p className="mt-2 text-xl font-semibold">{context.classes.length}</p>
        </article>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Link href="/terminal" className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">Terminal Absensi</p>
          <h2 className="mt-3 text-xl font-semibold">Uji pemindaian RFID dan wajah</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Jalankan terminal uji untuk melihat proses kartu RFID, verifikasi wajah, lampu indikator, dan bunyi buzzer.
          </p>
        </Link>

        <Link href="/dashboard/devices" className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">Perangkat Absensi</p>
          <h2 className="mt-3 text-xl font-semibold">Pantau terminal sekolah</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Periksa status koneksi, versi protokol, waktu terakhir aktif, dan kesiapan perangkat absensi.
          </p>
        </Link>

        {isAdmin ? (
          <>
            <Link href="/dashboard/students" className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">Data Siswa</p>
              <h2 className="mt-3 text-xl font-semibold">Kelola siswa, kelas, RFID, dan wajah</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Cari siswa, periksa profil wajah, pasangkan atau ganti kartu RFID, serta kelola perpindahan kelas tanpa menghapus riwayat.
              </p>
            </Link>

            <Link href="/dashboard/schedules" className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">Jadwal Absensi</p>
              <h2 className="mt-3 text-xl font-semibold">Atur waktu dan sasaran absensi</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Kelola jadwal Masuk, Dhuha, Dzuhur, Ashar, Pulang, upacara, dan kegiatan sekolah lainnya.
              </p>
            </Link>

            <Link href="/dashboard/staff" className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">Petugas & Hak Akses</p>
              <h2 className="mt-3 text-xl font-semibold">Kelola administrator, operator, dan wali kelas</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Buat akun petugas sekolah, tentukan hak akses, tetapkan wali kelas, atau nonaktifkan akun yang sudah tidak digunakan.
              </p>
            </Link>

            <Link href="/teacher" className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--success)]">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--success)]">Wali Kelas</p>
              <h2 className="mt-3 text-xl font-semibold">Buka halaman pemeriksaan kehadiran</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Tinjau kehadiran siswa, konfirmasi Sakit/Izin/Alpa, lihat rekap periode, dan cetak laporan kelas.
              </p>
            </Link>
          </>
        ) : (
          <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-6 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Petugas Operator</p>
            <h2 className="mt-3 text-xl font-semibold">Pemantauan perangkat absensi</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Petugas operator hanya dapat memantau kondisi terminal. Pengelolaan siswa, petugas, jadwal, dan konfigurasi tetap dilakukan oleh administrator sistem.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
