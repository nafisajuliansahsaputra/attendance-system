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

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 sm:px-6 lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-2 lg:overflow-hidden lg:px-8 lg:py-5">
      <section className="relative hidden h-full overflow-hidden bg-[var(--brand-deep)] text-white lg:grid lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:rounded-l-2xl lg:px-14 lg:py-[34px] xl:px-16 2xl:px-20">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/5 bg-white/[0.025]" />
        <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full border border-white/5 bg-white/[0.02]" />

        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-sm font-bold text-white">
            A12
          </span>
          <div>
            <p className="text-sm font-semibold">{SCHOOL.name}</p>
            <p className="mt-0.5 text-xs text-emerald-100/55">{SCHOOL.systemName}</p>
          </div>
        </div>

        <div className="relative z-10 flex min-h-0 items-center">
          <div className="w-full max-w-[760px] pb-3 pt-5 lg:pb-0 lg:pt-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200/60">
              Portal Internal Sekolah
            </p>

            <h1 className="mt-5 text-[clamp(2.9rem,4vw,4.3rem)] font-bold leading-[1.05] tracking-[-0.05em]">
              Pengelolaan kehadiran siswa dalam satu sistem terintegrasi.
            </h1>

            <p className="mt-6 max-w-[680px] text-[15px] leading-7 text-emerald-50/68">
              Sistem menghubungkan identitas RFID, verifikasi wajah, jadwal sekolah,
              terminal absensi, konfirmasi wali kelas, dan rekap laporan.
            </p>

            <div className="mt-8 grid max-w-[680px] gap-3">
              {[
                "Identifikasi siswa melalui kartu RFID",
                "Verifikasi wajah 1:1 sebelum kehadiran dicatat",
                "Rekap kehadiran dan konfirmasi wali kelas",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-emerald-50/82">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-emerald-200">
                    <CheckIcon />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between gap-6 border-t border-white/10 pt-5">
          <p className="max-w-md text-xs leading-5 text-emerald-100/50">
            Akun petugas tetap terbatas. Rekruter dan reviewer dapat mencoba mode demo tanpa memperoleh akses administratif.
          </p>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/35">
            Sistem Absensi Siswa
          </span>
        </div>
      </section>

      <section className="min-h-[calc(100vh-2rem)] bg-white lg:grid lg:h-full lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:overflow-hidden lg:rounded-r-2xl lg:px-14 lg:py-[34px] xl:px-16 2xl:px-20">
        <div className="mx-auto hidden w-full max-w-[760px] lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--brand)]"
          >
            <span aria-hidden="true">←</span> Kembali ke halaman utama
          </Link>
        </div>

        <div className="flex min-h-0 items-center px-5 py-6 sm:px-8 lg:px-0 lg:py-4">
          <div className="mx-auto w-full max-w-[760px] rounded-[22px] border border-[var(--border)] bg-white p-6 shadow-[0_18px_50px_rgba(15,43,32,0.08)] sm:p-8 lg:border-0 lg:p-0 lg:shadow-none">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand)] text-sm font-bold text-white">
                A12
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">{SCHOOL.name}</p>
                <p className="text-xs text-[var(--muted)]">{SCHOOL.systemName}</p>
              </div>
            </div>

            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--brand)] lg:hidden"
            >
              <span aria-hidden="true">←</span> Kembali ke halaman utama
            </Link>

            <div className="mt-6 lg:mt-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#56806d]">
                Akses Petugas Sekolah
              </p>
              <h2 className="mt-2.5 text-[2rem] font-bold tracking-[-0.04em] text-[var(--text)] lg:text-[2.15rem]">
                Masuk ke sistem
              </h2>
              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                Gunakan akun yang telah diberikan oleh Administrator Sistem {SCHOOL.shortName}.
              </p>
            </div>

            {errorMessage ? (
              <div className="mt-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-100 text-[11px] font-bold">
                  !
                </span>
                <span>{errorMessage}</span>
              </div>
            ) : null}

            <form action={login} className="mt-6 grid gap-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#355548]">Alamat email</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-14 w-full rounded-xl border border-[#d7e2dc] bg-white px-4 text-sm outline-none transition placeholder:text-slate-300 focus:border-[#6f9f88] focus:shadow-[0_0_0_3px_rgba(24,115,78,0.08)]"
                  placeholder="nama@sekolah.sch.id"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold text-[#355548]">Kata sandi</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={8}
                  required
                  className="h-14 w-full rounded-xl border border-[#d7e2dc] bg-white px-4 text-sm outline-none transition placeholder:text-slate-300 focus:border-[#6f9f88] focus:shadow-[0_0_0_3px_rgba(24,115,78,0.08)]"
                  placeholder="Masukkan kata sandi"
                />
              </label>

              <button
                type="submit"
                className="h-14 w-full rounded-xl bg-[var(--brand)] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(23,107,72,0.14)] transition hover:bg-[var(--brand-strong)] focus-visible:outline-[var(--brand)]"
              >
                Masuk ke portal sekolah
              </button>
            </form>

            <div className="my-6 flex items-center gap-4" aria-hidden="true">
              <span className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                atau coba demo
              </span>
              <span className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <section
              className="rounded-2xl border border-[var(--border-strong)] bg-[var(--brand-soft)]/70 p-5"
              aria-labelledby="recruiter-demo-title"
            >
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-sm font-bold text-[var(--brand)] shadow-sm">
                    R
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
                      Untuk Rekruter / Reviewer
                    </p>
                    <h3 id="recruiter-demo-title" className="mt-1 text-[17px] font-bold text-[var(--text)]">
                      Coba sistem tanpa akun
                    </h3>
                    <p className="mt-1.5 max-w-md text-xs leading-5 text-[var(--muted)]">
                      Daftarkan wajah sendiri, verifikasi wajah yang sama, lalu minta orang lain mencoba untuk membuktikan wajah berbeda ditolak.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  <Link
                    href="/terminal"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-bold text-white transition hover:bg-[var(--brand-strong)]"
                  >
                    Mulai demo rekruter →
                  </Link>
                  <Link
                    href="/terminal/lab"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white px-4 py-2 text-xs font-bold text-[var(--text)] transition hover:bg-[var(--surface-soft)]"
                  >
                    Simulator perangkat
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-[760px] border-t border-[#e3ebe6] pt-4 lg:block">
          <p className="text-[11px] leading-5 text-slate-400">
            Jika akun belum memiliki akses atau terjadi kendala masuk, hubungi Administrator Sistem sekolah. Sistem tidak menyediakan pendaftaran akun secara publik.
          </p>
        </div>

        <div className="px-5 pb-6 sm:px-8 lg:hidden">
          <div className="mx-auto w-full max-w-[760px] border-t border-[#e3ebe6] pt-4">
            <p className="text-[11px] leading-5 text-slate-400">
              Jika akun belum memiliki akses atau terjadi kendala masuk, hubungi Administrator Sistem sekolah. Sistem tidak menyediakan pendaftaran akun secara publik.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
