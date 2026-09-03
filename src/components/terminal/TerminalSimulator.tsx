"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
    eyebrow: "SYSTEM READY",
    title: "Tempelkan kartu RFID",
    description: "Pilih kartu virtual di hardware dock untuk memulai transaksi.",
  },
  rfid: {
    eyebrow: "RFID READER",
    title: "Membaca UID kartu...",
    description: "Terminal mengirim identitas kartu ke adapter RFID.",
  },
  identity: {
    eyebrow: "IDENTITY RESOLVER",
    title: "Mencari pemilik kartu...",
    description: "Backend memetakan UID ke siswa dan konteks sesi aktif.",
  },
  face: {
    eyebrow: "FACE VERIFICATION",
    title: "Memverifikasi wajah...",
    description: "Adapter kamera mengirim hasil verifikasi 1:1 ke engine.",
  },
  decision: {
    eyebrow: "CANONICAL ENGINE",
    title: "Menentukan hasil absensi...",
    description: "Client tidak mengirim outcome. Engine memutuskan dari input yang sudah di-resolve.",
  },
  done: {
    eyebrow: "TRANSACTION COMPLETE",
    title: "Transaksi selesai",
    description: "Hasil akhir berasal dari canonical attendance engine.",
  },
};

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function ledClass(led: AttendanceOutcome["feedback"]["led"] | "off") {
  if (led === "green") return "bg-emerald-400 shadow-[0_0_42px_rgba(74,222,128,0.75)]";
  if (led === "red") return "bg-rose-400 shadow-[0_0_42px_rgba(251,113,133,0.75)]";
  if (led === "amber") return "bg-amber-300 shadow-[0_0_42px_rgba(252,211,77,0.55)]";
  return "bg-slate-700";
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

function initials(label: string) {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
      await wait(420);
      setStage("identity");
      await wait(520);

      if (cardId !== "unknown") {
        setStage("face");
        await wait(650);
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
      if (!request.ok) throw new Error(payload.error ?? "Virtual terminal request failed");

      await wait(420);
      setResponse(payload);
      setStage("done");

      if (payload.outcome.accepted && sessionKey(environmentId) !== "none") {
        setRecordedKeys((current) =>
          current.includes(historyKey) ? current : [...current, historyKey],
        );
      }

      await playBeepPattern(payload.outcome);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown terminal error");
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
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Recruiter Experience · Virtual Hardware
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Smart Attendance Terminal
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetTerminal}
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--muted)] transition hover:text-white"
            >
              Reset demo state
            </button>
            <Link
              href="/"
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--muted)] transition hover:text-white"
            >
              ← Project overview
            </Link>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/20">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Terminal 01 · Hardware Adapter Boundary
                </p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Input virtual, aturan keputusan nyata. Tidak ada tombol untuk memilih hasil.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-black/15 px-3 py-2 text-xs text-[var(--muted)]">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Canonical engine online
              </div>
            </header>

            <div className="grid min-h-[690px] lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex flex-col items-center justify-center border-b border-[var(--border)] px-6 py-12 text-center lg:border-b-0 lg:border-r sm:px-10">
                <div className={`mb-7 h-5 w-5 rounded-full transition-all duration-300 ${ledClass(outcome?.feedback.led ?? "off")}`} />

                <div className="relative mb-9 aspect-[4/3] w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-[var(--border)] bg-black/20">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.08),transparent_60%)]" />
                  <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300 backdrop-blur">
                    <span className={`h-1.5 w-1.5 rounded-full ${stage === "face" ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`} />
                    Camera Adapter
                  </div>

                  <div className="absolute inset-0 grid place-items-center px-8">
                    <div className="relative grid h-36 w-36 place-items-center rounded-full border border-emerald-300/20 bg-emerald-300/[0.03]">
                      <div className={`absolute inset-3 rounded-full border border-dashed border-emerald-300/25 ${stage === "face" ? "animate-spin" : ""}`} />
                      <div className="grid h-24 w-24 place-items-center rounded-full bg-black/25 text-3xl font-semibold text-slate-200">
                        {faceId === "no-face" ? "—" : faceId === "low-quality" ? "≈" : initials(selectedFace.label)}
                      </div>
                    </div>
                  </div>

                  <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-left backdrop-blur">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Camera subject</p>
                      <p className="mt-1 text-sm font-semibold text-white">{selectedFace.label}</p>
                    </div>
                    <span className="text-xs text-slate-400">Virtual sample</span>
                  </div>
                </div>

                {outcome ? (
                  <div className="max-w-2xl">
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.22em] ${
                        outcome.accepted
                          ? "text-emerald-300"
                          : outcome.feedback.led === "red"
                            ? "text-rose-300"
                            : "text-amber-200"
                      }`}
                    >
                      {outcome.code}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      {outcome.student?.name ?? "Kartu tidak dikenali"}
                    </h2>
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      {outcome.student?.className ?? selectedCard.uid}
                      {outcome.session ? ` · ${outcome.session.name}` : " · Tidak ada sesi aktif"}
                    </p>
                    <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-200">
                      {outcome.message}
                    </p>
                  </div>
                ) : (
                  <div className="max-w-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                      {currentStage.eyebrow}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      {currentStage.title}
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      {currentStage.description}
                    </p>
                  </div>
                )}
              </div>

              <aside className="bg-black/10 p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Live transaction trace
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    ["RFID", response?.resolution.rfidUid ?? selectedCard.uid, stage === "rfid"],
                    ["Identity", response?.resolution.student?.name ?? (selectedCard.registered ? selectedCard.label : "Pending"), stage === "identity"],
                    ["Face", response?.resolution.faceStatus ?? selectedFace.detail, stage === "face"],
                    ["Session", response?.resolution.session?.name ?? selectedEnvironment.label, false],
                    ["Decision", outcome?.code ?? "Waiting for engine", stage === "decision"],
                  ].map(([label, value, active]) => (
                    <div key={String(label)} className="rounded-2xl border border-[var(--border)] bg-black/15 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
                        <span className={`h-2 w-2 rounded-full ${active ? "animate-pulse bg-emerald-400" : "bg-slate-700"}`} />
                      </div>
                      <p className="mt-2 break-words text-sm font-medium text-slate-200">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4 text-xs leading-5 text-emerald-100/80">
                  RFID, camera, dan waktu adalah input adapter. Outcome hanya dibuat oleh canonical attendance engine.
                </div>
              </aside>
            </div>

            <footer className="grid gap-3 border-t border-[var(--border)] bg-black/10 px-6 py-5 text-xs text-[var(--muted)] sm:grid-cols-4 sm:px-8">
              <span>RFID Adapter: virtual</span>
              <span>Face Adapter: virtual 1:1</span>
              <span>Persistence: ephemeral</span>
              <span>Decision Engine: canonical</span>
            </footer>
          </section>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl shadow-black/10 lg:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Virtual Hardware Dock</p>
              <h2 className="mt-2 text-lg font-semibold">Build a real transaction</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Recruiter memilih input perangkat, bukan outcome. Coba kartu dan wajah yang sama, lalu tukar wajah untuk menguji anti titip-absen.
              </p>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">1 · RFID Card</p>
                <span className="text-[10px] text-slate-600">13.56 MHz virtual</span>
              </div>
              <div className="mt-3 grid gap-2">
                {demoCards.map((card) => {
                  const active = card.id === cardId;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setCardId(card.id);
                        setResponse(null);
                        setStage("idle");
                      }}
                      className={`group rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-emerald-400/60 bg-emerald-400/10"
                          : "border-[var(--border)] bg-black/10 hover:bg-[var(--surface-soft)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold">{card.label}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">{card.className}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-slate-400">
                          {card.uid}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">2 · Camera Subject</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {demoFaces.map((face) => {
                  const active = face.id === faceId;
                  return (
                    <button
                      key={face.id}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setFaceId(face.id);
                        setResponse(null);
                        setStage("idle");
                      }}
                      className={`rounded-2xl border p-3 text-left transition ${
                        active
                          ? "border-emerald-400/60 bg-emerald-400/10"
                          : "border-[var(--border)] bg-black/10 hover:bg-[var(--surface-soft)]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/25 text-xs font-semibold">
                          {face.id === "no-face" ? "—" : face.id === "low-quality" ? "≈" : initials(face.label)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">{face.label}</p>
                          <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{face.detail}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">3 · School Context</p>
              <div className="mt-3 grid gap-2">
                {demoEnvironments.map((environment) => {
                  const active = environment.id === environmentId;
                  return (
                    <button
                      key={environment.id}
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setEnvironmentId(environment.id);
                        setResponse(null);
                        setStage("idle");
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-emerald-400/60 bg-emerald-400/10"
                          : "border-[var(--border)] bg-black/10 hover:bg-[var(--surface-soft)]"
                      }`}
                    >
                      <p className="text-xs font-semibold">{environment.label}</p>
                      <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">{environment.detail}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {alreadyRecorded ? (
              <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-3 text-xs leading-5 text-amber-100/80">
                Kartu ini sudah punya transaksi accepted pada sesi yang sama. Scan ulang akan menguji duplicate protection secara alami.
              </div>
            ) : null}

            {error ? (
              <p className="mt-5 rounded-xl bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p>
            ) : null}

            <button
              type="button"
              disabled={loading}
              onClick={runTerminal}
              className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Terminal memproses..." : `Tap ${selectedCard.label}`}
            </button>

            <p className="mt-3 text-center text-[10px] leading-4 text-slate-600">
              Demo tidak menulis ke database produksi. State accepted disimpan sementara di browser untuk menguji scan ulang.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}
