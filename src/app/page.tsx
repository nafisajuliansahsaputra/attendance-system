import Link from "next/link";

const foundations = [
  "RFID menentukan kandidat pemilik kartu",
  "Face verification 1:1 mencegah titip absen",
  "Session engine mendukung masuk, pulang, sholat, dan kegiatan",
  "Rekap nantinya diturunkan dari canonical attendance records",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 lg:px-10 lg:py-16">
      <div className="mb-16 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
            P5 2025 · Rebuilt 2026
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">Smart Attendance System</p>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)]">
          Foundation build
        </span>
      </div>

      <section className="grid flex-1 items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="mb-5 text-sm font-medium text-emerald-300">Hardware-ready, demoable without hardware.</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-6xl">
            Sistem absensi RFID dengan verifikasi wajah dan rekap otomatis.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
            Rebuild project P5 SMK 2025. Simulator recruiter menggunakan attendance engine yang sama dengan jalur hardware masa depan—bukan mockup yang memalsukan hasil.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/terminal"
              className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
            >
              Buka Terminal Simulator
            </Link>
            <a
              href="/api/health"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
            >
              API Health
            </a>
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl shadow-black/20">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Engineering guardrails</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Source of Truth → Domain Engine → Adapters</p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.7)]" />
          </div>
          <div className="space-y-3">
            {foundations.map((item, index) => (
              <div key={item} className="flex gap-4 rounded-2xl border border-[var(--border)] bg-black/10 p-4">
                <span className="text-xs font-semibold text-emerald-300">0{index + 1}</span>
                <p className="text-sm leading-6 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
