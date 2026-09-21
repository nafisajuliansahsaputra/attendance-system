"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SchoolLogo } from "@/components/school/SchoolLogo";
import {
  SCHOOL,
  attendanceOutcomeLabel,
  faceStatusLabel,
} from "@/config/school";
import {
  demoCards,
  demoEnvironments,
  demoFaces,
  type DemoCardId,
  type DemoEnvironmentId,
  type DemoFaceId,
} from "@/demo/terminal-inputs";
import type { AttendanceOutcome } from "@/domain/attendance/types";

type TerminalStage = "idle" | "rfid" | "identity" | "face" | "decision" | "done";

type TerminalResponse = {
  source: string;
  input: {
    cardId: DemoCardId;
    faceId: DemoFaceId;
    environmentId: DemoEnvironmentId;
    alreadyRecorded: boolean;
  };
  resolution: {
    rfidUid: string;
    cardRegistered: boolean;
    student: { id: string; name: string; className: string } | null;
    faceStatus: string;
    verificationScore: number | null;
    session: { id: string; name: string; type: string; eligible: boolean } | null;
    duplicate: boolean;
  };
  outcome: AttendanceOutcome;
  persistence: { mode: string };
};

const stageMeta: Record<TerminalStage, { eyebrow: string; title: string; description: string }> = {
  idle: {
    eyebrow: "SISTEM SIAP",
    title: "Tempelkan kartu RFID",
    description: "Pilih kartu uji, wajah di kamera, dan kondisi jadwal sebelum memulai pemindaian.",
  },
  rfid: {
    eyebrow: "PEMBACA RFID",
    title: "Membaca UID kartu...",
    description: "Terminal membaca nomor kartu untuk mencari siswa yang terdaftar.",
  },
  identity: {
    eyebrow: "DATA SISWA",
    title: "Mencari pemilik kartu...",
    description: "Sistem memetakan UID kartu ke identitas siswa dan kelasnya.",
  },
  face: {
    eyebrow: "VERIFIKASI WAJAH",
    title: "Memeriksa kecocokan wajah...",
    description: "Wajah yang dipilih dibandingkan dengan pemilik kartu yang terdaftar.",
  },
  decision: {
    eyebrow: "PEMERIKSAAN ABSENSI",
    title: "Menentukan hasil absensi...",
    description: "Sistem memeriksa kartu, wajah, jadwal, sasaran siswa, dan absensi ganda.",
  },
  done: {
    eyebrow: "PROSES SELESAI",
    title: "Pemeriksaan selesai",
    description: "Hasil akhir ditentukan oleh aturan absensi yang sama dengan jalur perangkat.",
  },
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ledClass(led: AttendanceOutcome["feedback"]["led"] | "off") {
  if (led === "green") return "bg-emerald-500 shadow-[0_0_26px_rgba(16,185,129,0.42)]";
  if (led === "red") return "bg-rose-500 shadow-[0_0_26px_rgba(244,63,94,0.34)]";
  if (led === "amber") return "bg-amber-400 shadow-[0_0_26px_rgba(245,158,11,0.3)]";
  return "bg-slate-300";
}

async function playBeepPattern(outcome: AttendanceOutcome) {
  const context = new AudioContext();
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

function sessionKey(environmentId: DemoEnvironmentId) {
  if (environmentId === "arrival-open" || environmentId === "arrival-late") return "arrival";
  if (environmentId === "dhuha-x") return "dhuha-x";
  return "none";
}

export function TerminalSimulator() {
  const [cardId, setCardId] = useState<DemoCardId>("alya");
  const [faceId, setFaceId] = useState<DemoFaceId>("alya");
  const [environmentId, setEnvironmentId] = useState<DemoEnvironmentId>("arrival-open");
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [stage, setStage] = useState<TerminalStage>("idle");
  const [response, setResponse] = useState<TerminalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCard = useMemo(
    () => demoCards.find((card) => card.id === cardId) ?? demoCards[0],
    [cardId],
  );
  const selectedFace = useMemo(
    () => demoFaces.find((face) => face.id === faceId) ?? demoFaces[0],
    [faceId],
  );
  const selectedEnvironment = useMemo(
    () => demoEnvironments.find((environment) => environment.id === environmentId) ?? demoEnvironments[0],
    [environmentId],
  );

  const outcome = response?.outcome ?? null;
  const currentStage = stageMeta[stage];
  const historyKey = `${cardId}:${sessionKey(environmentId)}`;
  const alreadyRecorded = recordedKeys.includes(historyKey);

  async function runTerminal() {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      setStage("rfid");
      await wait(380);
      setStage("identity");
      await wait(460);

      if (cardId !== "unknown") {
        setStage("face");
        await wait(600);
      }

      setStage("decision");

      const request = await fetch("/api/demo/terminal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          cardId,
          faceId,
          environmentId,
          alreadyRecorded,
        }),
      });

      const payload = (await request.json()) as TerminalResponse & { error?: string };
      if (!request.ok) throw new Error(payload.error ?? "Simulasi terminal gagal diproses");

      await wait(380);
      setResponse(payload);
      setStage("done");

      if (payload.outcome.accepted && sessionKey(environmentId) !== "none") {
        setRecordedKeys((current) =>
          current.includes(historyKey) ? current : [...current, historyKey],
        );
      }

      await playBeepPattern(payload.outcome);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Terjadi kesalahan pada simulasi terminal");
      setStage("idle");
    } finally {
      setLoading(false);
    }
  }

  function resetTerminal() {
    setRecordedKeys([]);
    setResponse(null);
    setError(null);
    setStage("idle");
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-[1450px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white px-5 py-4 shadow-sm sm:px-6">
          <div className="flex items-center gap-3">
            <SchoolLogo size={44} priority />
            <div>
              <p className="text-sm font-semibold">{SCHOOL.name}</p>
              <p className="text-xs text-[var(--muted)]">Simulasi Perangkat Absensi</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetTerminal}
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
            >
              Atur ulang simulasi
            </button>
            <Link
              href="/terminal"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
            >
              Uji dengan kamera asli
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold transition hover:bg-[var(--surface-soft)]"
            >
              ← Halaman utama
            </Link>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white shadow-xl shadow-emerald-950/5">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--success)]">Terminal Absensi 01</p>
                <h1 className="mt-2 text-2xl font-semibold">Simulasi alur perangkat sekolah</h1>
                <p className="mt-2 text-sm text-[var(--muted)]">Masukkan kondisi perangkat, lalu sistem menentukan hasil absensi.</p>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-[var(--success-soft)] px-3 py-2 text-xs font-semibold text-[var(--success-strong)]">
                <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
                Sistem siap
              </span>
            </header>

            <div className="grid min-h-[660px] lg:grid-cols-[minmax(0,1fr)_310px]">
              <div className="flex flex-col items-center justify-center border-b border-[var(--border)] px-6 py-12 text-center lg:border-b-0 lg:border-r sm:px-10">
                <div className={`mb-7 h-5 w-5 rounded-full transition-all duration-300 ${ledClass(outcome?.feedback.led ?? "off")}`} />

                <div className="mb-8 grid aspect-[4/3] w-full max-w-[520px] place-items-center rounded-[2rem] border border-[var(--border)] bg-[var(--surface-soft)]/65 p-8">
                  <div>
                    <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-[var(--border-strong)] bg-white text-3xl font-semibold text-[var(--success)]">
                      ◎
                    </div>
                    <p className="mt-5 text-sm font-semibold">Area kamera dan pembaca RFID virtual</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      Halaman ini tidak memakai biometrik asli. Gunakan terminal kamera untuk pengujian wajah sebenarnya.
                    </p>
                  </div>
                </div>

                {outcome ? (
                  <div className="max-w-2xl">
                    <p className={`text-xs font-bold uppercase tracking-[0.18em] ${outcome.accepted ? "text-emerald-700" : outcome.feedback.led === "red" ? "text-rose-700" : "text-amber-700"}`}>
                      {attendanceOutcomeLabel(outcome.code)}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      {outcome.student?.name ?? "Kartu tidak dikenali"}
                    </h2>
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      {outcome.student?.className ?? selectedCard.uid}
                      {outcome.session ? ` · ${outcome.session.name}` : " · Tidak ada jadwal aktif"}
                    </p>
                    <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">{outcome.message}</p>
                  </div>
                ) : (
                  <div className="max-w-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{currentStage.eyebrow}</p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">{currentStage.title}</h2>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{currentStage.description}</p>
                  </div>
                )}
              </div>

              <aside className="bg-[var(--surface-soft)]/55 p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Alur transaksi</p>
                <div className="mt-5 space-y-3">
                  {[
                    ["Kartu RFID", response?.resolution.rfidUid ?? selectedCard.uid, stage === "rfid"],
                    ["Pemilik kartu", response?.resolution.student?.name ?? (selectedCard.registered ? selectedCard.label : "Belum ditemukan"), stage === "identity"],
                    ["Wajah", faceStatusLabel(response?.resolution.faceStatus) || selectedFace.detail, stage === "face"],
                    ["Jadwal", response?.resolution.session?.name ?? selectedEnvironment.label, false],
                    ["Keputusan", outcome ? attendanceOutcomeLabel(outcome.code) : "Menunggu sistem", stage === "decision"],
                  ].map(([label, value, active]) => (
                    <div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                        <span className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />
                      </div>
                      <p className="mt-2 break-words text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-white p-5 shadow-sm lg:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">Masukan simulasi</p>
            <h2 className="mt-2 text-xl font-semibold">Atur kondisi sebelum kartu ditempelkan</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Pilihan di bawah hanya menentukan kondisi awal. Hasil absensi tetap diputuskan oleh aturan sistem.
            </p>

            <div className="mt-6">
              <p className="text-xs font-semibold">Kartu RFID</p>
              <div className="mt-2 grid gap-2">
                {demoCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setCardId(card.id);
                      setResponse(null);
                      setStage("idle");
                    }}
                    className={`rounded-xl border p-3 text-left transition ${cardId === card.id ? "border-[var(--success)] bg-[var(--success-soft)]" : "border-[var(--border)] bg-white hover:bg-[var(--surface-soft)]"}`}
                  >
                    <p className="text-sm font-semibold">{card.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{card.uid} · {card.className}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold">Wajah di depan kamera</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {demoFaces.map((face) => (
                  <button
                    key={face.id}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setFaceId(face.id);
                      setResponse(null);
                      setStage("idle");
                    }}
                    className={`rounded-xl border p-3 text-left transition ${faceId === face.id ? "border-[var(--success)] bg-[var(--success-soft)]" : "border-[var(--border)] bg-white hover:bg-[var(--surface-soft)]"}`}
                  >
                    <p className="text-sm font-semibold">{face.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{face.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold">Kondisi jadwal sekolah</p>
              <div className="mt-2 grid gap-2">
                {demoEnvironments.map((environment) => (
                  <button
                    key={environment.id}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setEnvironmentId(environment.id);
                      setResponse(null);
                      setStage("idle");
                    }}
                    className={`rounded-xl border p-3 text-left transition ${environmentId === environment.id ? "border-[var(--success)] bg-[var(--success-soft)]" : "border-[var(--border)] bg-white hover:bg-[var(--surface-soft)]"}`}
                  >
                    <p className="text-sm font-semibold">{environment.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{environment.detail}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)]/55 p-3 text-xs text-[var(--muted)]">
              Status sesi kartu ini: {alreadyRecorded ? "sudah pernah tercatat" : "belum tercatat"}.
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={runTerminal}
              className="mt-5 w-full rounded-xl bg-[var(--success)] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--success-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Memproses pemindaian..." : "Tempelkan kartu RFID"}
            </button>

            <p className="mt-4 text-[11px] leading-5 text-[var(--muted)]">
              Untuk menguji wajah Anda sendiri dan wajah orang lain secara langsung, gunakan halaman Terminal Absensi Siswa.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
