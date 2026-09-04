import Link from "next/link";
import { SCHOOL } from "@/config/school";

const foundations = [
  {
    title: "Identifikasi kartu RFID",
    detail: "UID kartu menentukan siswa yang seharusnya sedang melakukan absensi.",
  },
  {
    title: "Verifikasi wajah 1:1",
    detail: "YuNet + SFace membandingkan wajah di kamera dengan profil wajah pemilik kartu.",
  },
  {
    title: "Pemeriksaan jadwal absensi",
    detail: "Sistem memeriksa jadwal Masuk, Pulang, Dhuha, Dzuhur, Ashar, upacara, dan kegiatan sekolah.",
  },
  {
    title: "Pencatatan kehadiran",
    detail: "Absensi hanya dicatat jika identitas, wajah, jadwal, dan aturan kehadiran sudah sesuai.",
  },
];

const proofPoints = [
  "Rekruter dapat mencoba verifikasi wajah langsung tanpa akun",
  "Kecocokan wajah diputuskan oleh mesin verifikasi",
  "RFID, wajah, jadwal, dan duplikasi diperiksa berurutan",
  "Hasil terminal mengikuti pola LED dan buzzer perangkat sekolah",
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/90 px-5 py-4 shadow-sm backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--success)] text-sm font-bold text-white">
              A12
            </span>
            <div>
              <p className="text-sm font-semibold">{SCHOOL.name}</p>
              <p className="text-xs text-[var(--muted)]">{SCHOOL.systemName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
            >
              Masuk sebagai petugas
            </Link>
            <Link
              href="/terminal"
              className="rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--success-strong)]"
            >
              Coba demo rekruter
            </Link>
          </div>
        </header>

        <section className="grid gap-12 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success-strong)]">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              Sistem absensi siswa · {SCHOOL.location}
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Absensi RFID dengan verifikasi wajah untuk mencegah titip absen.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              Sistem ini dirancang untuk kebutuhan absensi {SCHOOL.name}. Kartu RFID digunakan untuk mengenali siswa,
              lalu kamera memastikan wajah yang melakukan absensi sesuai dengan pemilik kartu sebelum kehadiran dicatat.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/terminal"
                className="rounded-2xl bg-[var(--success)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-[var(--success-strong)]"
              >
                Coba demo rekruter →
              </Link>
              <Link
                href="/terminal/lab"
                className="rounded-2xl border border-[var(--border)] bg-white px-6 py-3.5 text-sm font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
              >
                Buka simulator perangkat
              </Link>
            </div>

            <p className="mt-3 max-w-2xl text-xs leading-5 text-[var(--muted)]">
              Pada demo rekruter, daftarkan wajah Anda sebagai pemilik kartu sementara, uji wajah yang sama hingga diterima, lalu minta orang lain mencoba untuk membuktikan wajah berbeda ditolak. Simulator perangkat tersedia untuk pengujian tanpa kamera.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-2">
              {proofPoints.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[var(--muted)]">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--success-soft)] text-xs font-bold text-[var(--success)]">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-[var(--success-soft)] opacity-70 blur-2xl" />
            <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white shadow-xl shadow-emerald-950/10">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
                    Proses satu kali absensi
                  </p>
                  <p className="mt-1 text-sm font-semibold">Pemeriksaan dilakukan berurutan oleh sistem</p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success-strong)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                  Sistem aktif
                </span>
              </div>

              <div className="space-y-3 p-6">
                {foundations.map((item, index) => (
                  <div
                    key={item.title}
                    className="grid grid-cols-[42px_1fr] gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/60 p-4"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-xs font-bold text-[var(--success)] shadow-sm">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--border)] bg-[var(--surface-soft)]/60 px-6 py-5">
                <p className="text-xs leading-6 text-[var(--muted)]">
                  Rekruter dapat menjalankan demo kamera langsung tanpa akun petugas untuk menunjukkan verifikasi wajah 1:1, sementara simulator perangkat tetap tersedia untuk menguji kondisi absensi lain tanpa kamera.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
