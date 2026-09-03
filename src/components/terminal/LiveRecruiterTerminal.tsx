"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AttendanceOutcome } from "@/domain/attendance/types";

type LiveEnrollResponse = {
  code?: string;
  displayName?: string;
  demoFaceToken?: string;
  expiresAt?: string;
  qualityScore?: number;
  detectionScore?: number;
  modelName?: string;
  modelVersion?: string;
  reason?: string;
  livenessChecked?: boolean;
};

type LiveVerifyResponse = {
  code?: string;
  reason?: string;
  resolution?: {
    rfidUid: string;
    student: { id: string; name: string; className: string };
    faceStatus: string;
    verificationScore: number | null;
    threshold: number;
    qualityScore: number | null;
    detectionScore: number | null;
    modelName: string;
    modelVersion: string;
    livenessChecked: boolean;
  };
  outcome?: AttendanceOutcome;
};

type FlowStage = "ready" | "enrolling" | "enrolled" | "verifying" | "result";

type VerificationHistory = {
  id: string;
  code: string;
  accepted: boolean;
  score: number | null;
  threshold: number | null;
  quality: number | null;
  at: string;
};

function ledClass(led: AttendanceOutcome["feedback"]["led"] | "off") {
  if (led === "green") return "bg-emerald-500 shadow-[0_0_26px_rgba(16,185,129,0.45)]";
  if (led === "red") return "bg-rose-500 shadow-[0_0_26px_rgba(244,63,94,0.35)]";
  if (led === "amber") return "bg-amber-400 shadow-[0_0_26px_rgba(245,158,11,0.32)]";
  return "bg-slate-300";
}

async function playBeepPattern(outcome: AttendanceOutcome) {
  if (typeof window === "undefined") return;

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

function errorMessage(payload: { code?: string; reason?: string }) {
  switch (payload.code) {
    case "FACE_NOT_DETECTED":
      return "Wajah belum terdeteksi. Hadap lurus ke kamera dan coba lagi.";
    case "FACE_LOW_QUALITY":
      return `Frame wajah terlalu buram atau pencahayaan kurang${payload.reason ? ` (${payload.reason})` : ""}.`;
    case "MULTIPLE_FACES":
      return "Pastikan hanya satu wajah berada di depan kamera saat proses berlangsung.";
    case "LIVE_FACE_DEMO_EXPIRED":
      return "Template demo sudah kedaluwarsa. Daftarkan wajah lagi.";
    case "FACE_SERVICE_UNAVAILABLE":
      return "Face service tidak dapat dijangkau. Pastikan face-service aktif.";
    case "INVALID_FACE_SAMPLE":
      return "Frame kamera tidak dapat diproses. Coba ambil ulang.";
    default:
      return payload.reason || "Live face demo belum berhasil. Coba lagi.";
  }
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function LiveRecruiterTerminal() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [displayName, setDisplayName] = useState("Recruiter Demo");
  const [cameraReady, setCameraReady] = useState(false);
  const [stage, setStage] = useState<FlowStage>("ready");
  const [demoFaceToken, setDemoFaceToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [enrollQuality, setEnrollQuality] = useState<number | null>(null);
  const [result, setResult] = useState<LiveVerifyResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<VerificationHistory[]>([]);

  const busy = stage === "enrolling" || stage === "verifying";
  const outcome = result?.outcome ?? null;
  const ownerPassed = history.some((item) => item.accepted);
  const mismatchSeen = history.some((item) => item.code === "FACE_MISMATCH");

  const challengeLabel = useMemo(() => {
    if (!demoFaceToken) return "Enroll the card owner";
    if (!ownerPassed) return "Verify the same person";
    if (!mismatchSeen) return "Invite a friend to challenge it";
    return "Demo challenge completed";
  }, [demoFaceToken, mismatchSeen, ownerPassed]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    setMessage(null);

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setMessage("Kamera tidak dapat dibuka. Izinkan akses kamera dan gunakan HTTPS atau localhost.");
    }
  }

  function captureJpeg() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth <= 0 || video.videoHeight <= 0) return null;

    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }

  async function enrollLiveFace() {
    const imageBase64 = captureJpeg();
    if (!imageBase64) {
      setMessage("Kamera belum siap mengambil frame.");
      return;
    }

    setStage("enrolling");
    setMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/demo/live-face/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || "Recruiter Demo",
          imageBase64,
        }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as LiveEnrollResponse;

      if (!response.ok || payload.code !== "LIVE_FACE_ENROLLED" || !payload.demoFaceToken) {
        setStage("ready");
        setMessage(errorMessage(payload));
        return;
      }

      setDemoFaceToken(payload.demoFaceToken);
      setExpiresAt(payload.expiresAt ?? null);
      setEnrollQuality(payload.qualityScore ?? null);
      setHistory([]);
      setStage("enrolled");
      setMessage("Kartu demo siap. Sekarang verifikasi wajah pemilik kartu yang sama.");
    } catch {
      setStage("ready");
      setMessage("Gagal menghubungi endpoint live enrollment.");
    }
  }

  async function verifyCurrentFace() {
    if (!demoFaceToken) {
      setMessage("Daftarkan wajah pemilik kartu demo terlebih dahulu.");
      return;
    }

    const imageBase64 = captureJpeg();
    if (!imageBase64) {
      setMessage("Kamera belum siap mengambil frame.");
      return;
    }

    setStage("verifying");
    setMessage(null);
    setResult(null);

    try {
      const response = await fetch("/api/demo/live-face/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: `live-${crypto.randomUUID()}`,
          demoFaceToken,
          imageBase64,
        }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as LiveVerifyResponse;

      if (!response.ok || !payload.outcome) {
        if (payload.code === "LIVE_FACE_DEMO_EXPIRED") {
          setDemoFaceToken(null);
          setExpiresAt(null);
          setEnrollQuality(null);
        }
        setStage(demoFaceToken ? "enrolled" : "ready");
        setMessage(errorMessage(payload));
        return;
      }

      setResult(payload);
      setStage("result");
      setHistory((current) => [
        {
          id: payload.outcome?.requestId ?? crypto.randomUUID(),
          code: payload.outcome?.code ?? "UNKNOWN",
          accepted: Boolean(payload.outcome?.accepted),
          score: payload.resolution?.verificationScore ?? null,
          threshold: payload.resolution?.threshold ?? null,
          quality: payload.resolution?.qualityScore ?? null,
          at: new Date().toISOString(),
        },
        ...current,
      ].slice(0, 6));
      await playBeepPattern(payload.outcome);
    } catch {
      setStage("enrolled");
      setMessage("Gagal menghubungi endpoint live verification.");
    }
  }

  function resetLiveDemo() {
    setDemoFaceToken(null);
    setExpiresAt(null);
    setEnrollQuality(null);
    setResult(null);
    setMessage(null);
    setHistory([]);
    setStage("ready");
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1480px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/90 px-5 py-4 shadow-sm backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--success)] text-sm font-bold text-white">SA</span>
            <div>
              <p className="text-sm font-semibold">Live Recruiter Demo</p>
              <p className="text-xs text-[var(--muted)]">Real camera · YuNet + SFace · canonical engine</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/terminal/lab"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
            >
              Virtual hardware lab
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
            >
              ← Project overview
            </Link>
          </div>
        </header>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {[
            { label: "01 · Enroll owner", done: Boolean(demoFaceToken), active: !demoFaceToken, text: "Create a temporary RFID identity" },
            { label: "02 · Verify owner", done: ownerPassed, active: Boolean(demoFaceToken) && !ownerPassed, text: "Same face should be accepted" },
            { label: "03 · Challenge", done: mismatchSeen, active: ownerPassed && !mismatchSeen, text: "A different face should be rejected" },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-2xl border p-4 transition ${
                item.done
                  ? "border-emerald-200 bg-emerald-50"
                  : item.active
                    ? "border-[var(--border-strong)] bg-white shadow-sm"
                    : "border-[var(--border)] bg-white/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className={`text-xs font-bold uppercase tracking-[0.12em] ${item.done ? "text-emerald-700" : "text-[var(--muted)]"}`}>
                  {item.label}
                </p>
                <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${item.done ? "bg-emerald-500 text-white" : item.active ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-slate-100 text-slate-400"}`}>
                  {item.done ? "✓" : "·"}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white shadow-xl shadow-emerald-950/5">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--success)]">Terminal 01 · Live face adapter</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Test the anti-proxy attendance flow yourself</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Recruiter hanya memberi input wajah. MATCH atau MISMATCH diputuskan model, bukan tombol skenario.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
                <span className={`h-2 w-2 rounded-full ${cameraReady ? "bg-emerald-500" : "bg-slate-300"}`} />
                {cameraReady ? "Camera online" : "Camera offline"}
              </div>
            </header>

            <div className="grid min-h-[710px] lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col items-center justify-center border-b border-[var(--border)] px-5 py-8 text-center lg:border-b-0 lg:border-r sm:px-8">
                <div className="mb-5 flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-2 text-xs font-semibold text-[var(--muted)]">
                  <span className={`h-3 w-3 rounded-full transition-all ${ledClass(outcome?.feedback.led ?? "off")}`} />
                  Terminal feedback LED
                </div>

                <div className="relative aspect-video w-full max-w-[720px] overflow-hidden rounded-[2rem] bg-[#0d1b15] shadow-inner">
                  <video ref={videoRef} muted playsInline className="h-full w-full scale-x-[-1] object-cover" />

                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className={`h-[62%] w-[42%] rounded-[45%] border-2 ${stage === "verifying" || stage === "enrolling" ? "animate-pulse border-emerald-300/80" : "border-white/35"}`} />
                  </div>

                  {!cameraReady ? (
                    <div className="absolute inset-0 grid place-items-center bg-[#0d1b15] px-8 text-white">
                      <div>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl">◎</div>
                        <p className="mt-5 text-lg font-semibold">Camera permission required</p>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-white/60">Webcam hanya dipakai untuk frame demo dan tidak menyimpan foto mentah ke database.</p>
                      </div>
                    </div>
                  ) : null}

                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                    <span className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse bg-emerald-400" : "bg-white/60"}`} />
                    {stage === "enrolling" ? "Extracting template" : stage === "verifying" ? "Verifying 1:1" : "Live camera"}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-left text-white backdrop-blur">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Current challenge</p>
                      <p className="mt-1 text-sm font-semibold">{challengeLabel}</p>
                    </div>
                    <span className="text-xs text-white/60">1 face only</span>
                  </div>
                </div>

                {outcome ? (
                  <div className={`mt-7 w-full max-w-2xl rounded-2xl border p-5 text-left ${outcome.accepted ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-[0.18em] ${outcome.accepted ? "text-emerald-700" : "text-rose-700"}`}>{outcome.code}</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{outcome.accepted ? "Identity verified" : "Identity rejected"}</h2>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{outcome.message}</p>
                      </div>
                      <span className={`grid h-12 w-12 place-items-center rounded-full text-xl font-bold ${outcome.accepted ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}`}>{outcome.accepted ? "✓" : "×"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-7 max-w-2xl">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--success)]">{demoFaceToken ? "Temporary RFID identity ready" : "Live demo setup"}</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{challengeLabel}</h2>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {!demoFaceToken
                        ? "Daftarkan satu wajah sebagai pemilik kartu virtual. Foto mentah tidak dipersist."
                        : !ownerPassed
                          ? "Tetap gunakan orang yang sama dan jalankan verifikasi pertama."
                          : !mismatchSeen
                            ? "Sekarang minta teman berdiri di depan kamera dan jalankan tombol verifikasi yang sama."
                            : "Anda sudah membuktikan jalur MATCH dan MISMATCH dengan input kamera nyata."}
                    </p>
                  </div>
                )}
              </div>

              <aside className="bg-[var(--surface-soft)]/55 p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Live transaction trace</p>
                <div className="mt-4 space-y-3">
                  {[
                    ["RFID", demoFaceToken ? "LIVE:DEMO:CARD" : "Waiting for enrollment"],
                    ["Identity", demoFaceToken ? displayName : "Unbound"],
                    ["Face model", result?.resolution?.modelName ?? "OpenCV YuNet + SFace"],
                    ["Face status", result?.resolution?.faceStatus ?? (stage === "verifying" ? "Processing" : "Waiting")],
                    ["Decision", outcome?.code ?? "Waiting for engine"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
                      <p className="mt-2 break-words text-sm font-semibold">{value}</p>
                    </div>
                  ))}
                </div>

                {result?.resolution ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border-strong)] bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--success)]">Verification metrics</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                        <p className="text-[var(--muted)]">Similarity</p>
                        <p className="mt-1 text-base font-bold">{result.resolution.verificationScore?.toFixed(3) ?? "—"}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                        <p className="text-[var(--muted)]">Threshold</p>
                        <p className="mt-1 text-base font-bold">{result.resolution.threshold.toFixed(3)}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--surface-soft)] p-3">
                        <p className="text-[var(--muted)]">Quality</p>
                        <p className="mt-1 text-base font-bold">{formatPercent(result.resolution.qualityScore)}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--warning-soft)] p-3">
                        <p className="text-[var(--muted)]">Liveness</p>
                        <p className="mt-1 font-bold text-[var(--warning)]">{result.resolution.livenessChecked ? "Checked" : "V1 off"}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[2rem] border border-[var(--border)] bg-white p-5 shadow-lg shadow-emerald-950/5 lg:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">Recruiter controls</p>
                  <h2 className="mt-2 text-xl font-semibold">Run a real identity challenge</h2>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Tidak ada tombol MATCH/MISMATCH. Tombol verifikasi selalu sama.</p>
                </div>
                <span className="rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--success-strong)]">Live</span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[var(--success)] shadow-sm">1</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Camera</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Allow webcam access and keep one face inside the guide.</p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={cameraReady ? stopCamera : startCamera}
                        className="mt-3 w-full rounded-xl border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                      >
                        {cameraReady ? "Turn camera off" : "Enable camera"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[var(--success)] shadow-sm">2</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Bind a temporary RFID card</p>
                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value.slice(0, 80))}
                        disabled={busy || Boolean(demoFaceToken)}
                        placeholder="Your name"
                        className="mt-3 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[var(--success)] disabled:opacity-60"
                      />
                      <button
                        type="button"
                        disabled={!cameraReady || busy}
                        onClick={enrollLiveFace}
                        className="mt-3 w-full rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--success-strong)] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {stage === "enrolling" ? "Creating face template..." : demoFaceToken ? "Re-enroll owner face" : "Enroll my face"}
                      </button>

                      {demoFaceToken ? (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                          <p className="font-semibold">Temporary identity ready</p>
                          <p className="mt-1 text-emerald-700">Quality {formatPercent(enrollQuality)} · memory-only token{expiresAt ? ` · expires ${new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/60 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[var(--success)] shadow-sm">3</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">Scan RFID + verify whoever is on camera</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Same owner should pass. Then swap to a friend and press this exact same button.</p>
                      <button
                        type="button"
                        disabled={!cameraReady || !demoFaceToken || busy}
                        onClick={verifyCurrentFace}
                        className="mt-3 w-full rounded-xl border border-[var(--success)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--success-strong)] transition hover:bg-[var(--success-soft)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {stage === "verifying" ? "Verifying identity..." : "Scan RFID + verify face"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {message ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">{message}</div> : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" onClick={resetLiveDemo} disabled={busy} className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50">Reset identity</button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setMessage(null);
                    setStage(demoFaceToken ? "enrolled" : "ready");
                  }}
                  disabled={busy}
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                >
                  Clear result
                </button>
              </div>
            </section>

            <section className="rounded-[2rem] border border-[var(--border)] bg-white p-5 shadow-lg shadow-emerald-950/5 lg:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Verification history</p>
                  <h3 className="mt-1 text-base font-semibold">Same button, different people</h3>
                </div>
                <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">{history.length}</span>
              </div>

              <div className="mt-4 space-y-2">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-soft)]/50 p-5 text-center text-xs leading-5 text-[var(--muted)]">Run a verification to see MATCH/MISMATCH evidence here.</div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-white p-3.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white ${item.accepted ? "bg-emerald-500" : "bg-rose-500"}`}>{item.accepted ? "✓" : "×"}</span>
                        <div className="min-w-0">
                          <p className={`truncate text-xs font-bold ${item.accepted ? "text-emerald-700" : "text-rose-700"}`}>{item.code}</p>
                          <p className="mt-1 text-[11px] text-[var(--muted)]">score {item.score?.toFixed(3) ?? "—"} · threshold {item.threshold?.toFixed(3) ?? "—"}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] text-[var(--muted)]">{formatTime(item.at)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--success-soft)]/65 p-4 text-[11px] leading-5 text-[var(--muted)]">
              <p className="font-semibold text-[var(--text)]">Privacy & technical scope</p>
              <p className="mt-1">Raw photos are not persisted. The temporary embedding is wrapped in a short-lived encrypted token kept only in this browser tab. V1 intentionally reports liveness as not enabled.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
