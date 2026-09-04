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

function SchoolIcon() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 10 12 4l9 6" />
      <path d="M5 9v10h14V9M3 20h18" />
      <path d="M9 19v-6h6v6" />
      <path d="M12 4V2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <main className="min-h-screen bg-[#f3f6f4] px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[minmax(420px,0.92fr)_1.08fr] lg:p-0">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#12382b] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/5 bg-white/[0.025]" />
        <div className="absolute -bottom-36 -left-24 h-96 w-96 rounded-full border border-white/5 bg-white/[0.02]" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-white/10 text-emerald-50">
              <SchoolIcon />
            </span>
            <div>
              <p className="text-sm font-bold">{SCHOOL.shortName}</p>
              <p className="mt-0.5 text-xs text-emerald-100/55">Ciawi, Bogor</p>
            </div>
          </div>

          <div className="mt-16 max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200/60">Portal Internal Sekolah</p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.12] tracking-[-0.045em] xl:text-5xl">
              Pengelolaan kehadiran siswa dalam satu sistem terintegrasi.
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-emerald-50/65">
              Sistem menghubungkan identitas RFID, verifikasi wajah, jadwal sekolah, terminal absensi, konfirmasi wali kelas, dan rekap laporan.
            </p>
          </div>

          <div className="mt-10 grid max-w-lg gap-3">
            {[
              "Identifikasi siswa melalui kartu RFID",
              "Verifikasi wajah 1:1 sebelum kehadiran dicatat",
              "Rekap kehadiran dan konfirmasi wali kelas",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-emerald-50/80">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/8 text-emerald-200">
                  <CheckIcon />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-end justify-between gap-6 border-t border-white/10 pt-6">
          <p className="max-w-md text-xs leading-5 text-emerald-100/45">
            Akses terbatas untuk administrator sistem, petugas operator, dan wali kelas yang telah terdaftar.
          </p>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/35">Sistem Absensi Siswa</span>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-3rem)] items-center justify-center lg:min-h-screen lg:bg-white lg:px-10 xl:px-16">
        <div className="w-full max-w-md rounded-[22px] border border-[#dbe5df] bg-white p-6 shadow-[0_18px_50px_rgba(15,43,32,0.08)] sm:p-8 lg:border-0 lg:p-0 lg:shadow-none">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#12382b] text-white">
              <SchoolIcon />
            </span>
            <div>
              <p className="text-sm font-bold text-[#17352a]">{SCHOOL.shortName}</p>
              <p className="text-xs text-slate-500">{SCHOOL.systemName}</p>
            </div>
          </div>

          <Link href="/" className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-[#176b48] lg:mt-0">
            <span aria-hidden="true">←</span> Kembali ke halaman utama
          </Link>

          <div className="mt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#56806d]">Akses Petugas Sekolah</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.035em] text-[#17352a]">Masuk ke sistem</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Gunakan akun yang telah diberikan oleh Administrator Sistem {SCHOOL.shortName}.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-6 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-700" role="alert">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-100 text-[11px] font-bold">!</span>
              <span>{errorMessage}</span>
            </div>
          ) : null}

          <form action={login} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-[#355548]">Alamat email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-[#d7e2dc] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-[#6f9f88] focus:shadow-[0_0_0_3px_rgba(24,115,78,0.08)]"
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
                className="w-full rounded-xl border border-[#d7e2dc] bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-slate-300 focus:border-[#6f9f88] focus:shadow-[0_0_0_3px_rgba(24,115,78,0.08)]"
                placeholder="Masukkan kata sandi"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#176b48] px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(23,107,72,0.16)] transition hover:bg-[#115b3d] focus-visible:outline-[#176b48]"
            >
              Masuk ke portal sekolah
            </button>
          </form>

          <div className="mt-7 border-t border-[#e3ebe6] pt-5">
            <p className="text-xs leading-5 text-slate-400">
              Jika akun belum memiliki akses atau terjadi kendala masuk, hubungi Administrator Sistem sekolah. Sistem tidak menyediakan pendaftaran akun secara publik.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
