import Link from "next/link";

const foundations = [
  {
    title: "RFID identity",
    detail: "UID kartu menentukan kandidat siswa sebelum proses biometrik dimulai.",
  },
  {
    title: "1:1 face verification",
    detail: "YuNet + SFace membandingkan wajah live dengan template pemilik kartu.",
  },
  {
    title: "Session-aware engine",
    detail: "Masuk, pulang, sholat, upacara, dan kegiatan memakai aturan sesi yang sama.",
  },
  {
    title: "Canonical records",
    detail: "Semua laporan diturunkan dari attendance record yang lolos decision engine.",
  },
];

const proofPoints = [
  "Real browser camera demo",
  "MATCH / MISMATCH decided by model",
  "RFID + face transaction flow",
  "Replay and duplicate protection",
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/90 px-5 py-4 shadow-sm backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--success)] text-sm font-bold text-white">
              SA
            </span>
            <div>
              <p className="text-sm font-semibold">Smart Attendance System</p>
              <p className="text-xs text-[var(--muted)]">P5 2025 · Rebuilt 2026</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
            >
              Staff login
            </Link>
            <Link
              href="/terminal"
              className="rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--success-strong)]"
            >
              Try live demo
            </Link>
          </div>
        </header>

        <section className="grid gap-12 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success-strong)]">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
              Hardware-ready · recruiter-testable
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.06] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              RFID attendance yang benar-benar memverifikasi siapa yang membawa kartu.
            </h1>

            <p className="mt-7 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              RFID menentukan identitas yang diharapkan, kamera melakukan verifikasi wajah 1:1,
              lalu canonical attendance engine memutuskan apakah transaksi diterima, ditolak,
              terlambat, duplikat, atau berada di luar sesi.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/terminal"
                className="rounded-2xl bg-[var(--success)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-[var(--success-strong)]"
              >
                Test dengan wajah Anda →
              </Link>
              <Link
                href="/terminal/lab"
                className="rounded-2xl border border-[var(--border)] bg-white px-6 py-3.5 text-sm font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
              >
                Open virtual hardware lab
              </Link>
            </div>

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
                    Identity transaction
                  </p>
                  <p className="mt-1 text-sm font-semibold">How one scan is resolved</p>
                </div>
                <span className="flex items-center gap-2 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success-strong)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                  Engine online
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
                  Recruiter demo menggunakan webcam browser dan face-service asli. Hasil MATCH/MISMATCH
                  tidak dipilih melalui tombol skenario.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
