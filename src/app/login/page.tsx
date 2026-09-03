import Link from "next/link";
import { SCHOOL } from "@/config/school";
import { login } from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "invalid-input": "Periksa kembali email dan kata sandi.",
  credentials: "Email atau kata sandi tidak sesuai.",
  session: "Sesi masuk tidak dapat diverifikasi. Silakan coba lagi.",
  "not-authorized": "Akun ini belum memiliki hak akses ke sistem absensi sekolah.",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
      <section className="grid w-full overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-emerald-950/5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden min-h-[36rem] flex-col justify-between bg-[var(--surface-soft)] p-10 lg:flex">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--success)] text-sm font-bold text-white">
              A12
            </span>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
              {SCHOOL.name}
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight">
              {SCHOOL.systemName}
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-[var(--muted)]">
              Pengelolaan absensi siswa menggunakan RFID, verifikasi wajah, jadwal kehadiran,
              konfirmasi wali kelas, dan rekap laporan sekolah.
            </p>
          </div>

          <p className="text-sm text-[var(--muted)]">
            Halaman ini khusus untuk administrator, operator, dan wali kelas yang telah diberi akses oleh sekolah.
          </p>
        </div>

        <div className="flex min-h-[36rem] flex-col justify-center p-7 sm:p-10">
          <div className="mx-auto w-full max-w-sm">
            <Link
              href="/"
              className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              ← Kembali ke halaman utama
            </Link>

            <h2 className="mt-8 text-3xl font-semibold">Masuk ke sistem</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Gunakan akun petugas {SCHOOL.shortName} yang sudah dibuat oleh administrator.
            </p>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-[color:rgba(220,38,38,0.22)] bg-[color:rgba(220,38,38,0.06)] px-4 py-3 text-sm text-[var(--danger)]">
                {errorMessage}
              </div>
            ) : null}

            <form action={login} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--success)]"
                  placeholder="nama@sekolah.sch.id"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Kata sandi</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--success)]"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[var(--success)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--success-strong)]"
              >
                Masuk
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
