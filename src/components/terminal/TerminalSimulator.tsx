"use client";

import { useMemo, useState } from "react";
import type { DemoScenario } from "@/demo/scenarios";
import type { AttendanceOutcome } from "@/domain/attendance/types";

const scenarioOptions: Array<{ id: DemoScenario; label: string; description: string }> = [
  { id: "verified", label: "Berhasil", description: "RFID valid + wajah cocok" },
  { id: "late", label: "Terlambat", description: "Valid, tetapi melewati batas telat" },
  { id: "face-mismatch", label: "Titip Absen", description: "Kartu valid, wajah berbeda" },
  { id: "unknown-card", label: "Kartu Asing", description: "UID belum terdaftar" },
  { id: "not-eligible", label: "Bukan Jadwal", description: "Siswa bukan target sesi" },
  { id: "duplicate", label: "Duplikat", description: "Sesi sudah pernah tercatat" },
  { id: "outside-session", label: "Di Luar Sesi", description: "Tidak ada sesi aktif" },
];

async function playBeepPattern(outcome: AttendanceOutcome) {
  if (typeof window === "undefined") return;

  const AudioContextClass = window.AudioContext;
  const context = new AudioContextClass();
  const { count, durationMs, intervalMs } = outcome.feedback.beep;

  for (let index = 0; index < count; index += 1) {
    const startAt = context.currentTime + (index * (durationMs + intervalMs)) / 1000;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "square";
    oscillator.frequency.value = outcome.feedback.tone === "danger" ? 920 : 760;
    gain.gain.setValueAtTime(0.045, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + durationMs / 1000);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + durationMs / 1000);
  }

  const totalMs = count * durationMs + Math.max(0, count - 1) * intervalMs + 80;
  window.setTimeout(() => void context.close(), totalMs);
}

function ledClass(led: AttendanceOutcome["feedback"]["led"] | "off") {
  if (led === "green") return "bg-emerald-400 shadow-[0_0_42px_rgba(74,222,128,0.75)]";
  if (led === "red") return "bg-rose-400 shadow-[0_0_42px_rgba(251,113,133,0.75)]";
  if (led === "amber") return "bg-amber-300 shadow-[0_0_42px_rgba(252,211,77,0.55)]";
  return "bg-slate-700";
}

export function TerminalSimulator() {
  const [selected, setSelected] = useState<DemoScenario>("verified");
  const [outcome, setOutcome] = useState<AttendanceOutcome | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMeta = useMemo(
    () => scenarioOptions.find((option) => option.id === selected) ?? scenarioOptions[0],
    [selected],
  );

  async function runScenario() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/demo/attempt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          scenario: selected,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Demo request failed");

      const nextOutcome = payload.outcome as AttendanceOutcome;
      setOutcome(nextOutcome);
      await playBeepPattern(nextOutcome);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown simulator error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-[720px] flex-col overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/20">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 sm:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Terminal 01 · Demo Adapter</p>
              <h1 className="mt-2 text-xl font-semibold">Smart Attendance Terminal</h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-black/15 px-3 py-2 text-xs text-[var(--muted)]">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Backend engine ready
            </div>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
            <div className={`mb-8 h-5 w-5 rounded-full transition-all duration-300 ${ledClass(outcome?.feedback.led ?? "off")}`} />

            <div className="mb-8 grid h-48 w-full max-w-md place-items-center rounded-3xl border border-dashed border-[var(--border)] bg-black/15">
              <div>
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface-soft)] text-2xl">◎</div>
                <p className="text-sm font-medium">Camera / face adapter boundary</p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--muted)]">
                  Belum menyimpan biometrik asli. Scenario demo memasok hasil verifikasi ke canonical attendance engine.
                </p>
              </div>
            </div>

            {outcome ? (
              <div className="max-w-xl">
                <p className={`text-xs font-bold uppercase tracking-[0.22em] ${outcome.accepted ? "text-emerald-300" : outcome.feedback.led === "red" ? "text-rose-300" : "text-amber-200"}`}>
                  {outcome.code}
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  {outcome.student?.name ?? "Tidak ada siswa terverifikasi"}
                </h2>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {outcome.student?.className ?? "—"} · {outcome.session?.name ?? "Tidak ada sesi aktif"}
                </p>
                <p className="mt-6 text-base leading-7 text-slate-200">{outcome.message}</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">System Ready</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Tempelkan kartu RFID</h2>
                <p className="mt-4 text-sm text-[var(--muted)]">Pilih scenario di panel demo lalu jalankan scan.</p>
              </div>
            )}
          </div>

          <footer className="grid gap-3 border-t border-[var(--border)] bg-black/10 px-6 py-5 text-xs text-[var(--muted)] sm:grid-cols-3 sm:px-8">
            <span>RFID Adapter: simulated</span>
            <span>Face Adapter: simulated result</span>
            <span>Decision Engine: canonical</span>
          </footer>
        </section>

        <aside className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 lg:p-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Recruiter Demo</p>
            <h2 className="mt-2 text-lg font-semibold">Scenario Control</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Semua scenario melewati fungsi keputusan attendance yang sama. Client tidak menentukan hasil absensi.
            </p>
          </div>

          <div className="space-y-2">
            {scenarioOptions.map((option) => {
              const active = option.id === selected;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelected(option.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${active ? "border-emerald-400/60 bg-emerald-400/10" : "border-[var(--border)] bg-black/10 hover:bg-[var(--surface-soft)]"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{option.label}</span>
                    <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-slate-700"}`} />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-black/15 p-4">
            <p className="text-xs text-[var(--muted)]">Selected</p>
            <p className="mt-1 text-sm font-semibold">{selectedMeta.label}</p>
          </div>

          {error ? <p className="mt-4 rounded-xl bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p> : null}

          <button
            type="button"
            disabled={loading}
            onClick={runScenario}
            className="mt-5 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Memproses..." : "Simulasikan RFID Scan"}
          </button>

          <a href="/" className="mt-3 block text-center text-xs text-[var(--muted)] hover:text-white">
            ← Kembali ke project overview
          </a>
        </aside>
      </div>
    </main>
  );
}
