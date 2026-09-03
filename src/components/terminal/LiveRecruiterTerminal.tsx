"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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

function ledClass(led: AttendanceOutcome["feedback"]["led"] | "off") {
  if (led === "green") return "bg-emerald-400 shadow-[0_0_46px_rgba(74,222,128,0.75)]";
  if (led === "red") return "bg-rose-400 shadow-[0_0_46px_rgba(251,113,133,0.75)]";
  if (led === "amber") return "bg-amber-300 shadow-[0_0_46px_rgba(252,211,77,0.55)]";
  return "bg-slate-700";
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
      return "Face service tidak dapat dijangkau. Pada deployment publik, service Python harus aktif di server.";
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

  const busy = stage === "enrolling" || stage === "verifying";
  const outcome = result?.outcome ?? null;

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
      setMessage(
        "Kamera tidak dapat dibuka. Izinkan akses kamera dan gunakan HTTPS atau localhost.",
      );
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
      setStage("enrolled");
      setMessage(
        "Template demo siap. Sekarang verifikasi wajah yang sedang berada di kamera. Setelah MATCH, minta teman berdiri di depan kamera dan verifikasi lagi untuk mencoba MISMATCH.",
      );
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
    setStage("ready");
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="mx-auto w-full max-w-[1450px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Recruiter Experience · Real Camera
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Live Smart Attendance Terminal
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/terminal/lab"
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--muted)] transition hover:text-white"
            >
              Virtual hardware lab →
            </Link>
            <Link
              href="/"
              className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs text-[var(--muted)] transition hover:text-white"
            >
              ← Project overview
            </Link>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/20">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-5 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                  Terminal 01 · Live Face Adapter
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Kamera browser mengirim frame ke YuNet + SFace. Hasil MATCH/MISMATCH diputuskan model,
                  lalu canonical attendance engine menentukan feedback terminal.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-black/15 px-3 py-2 text-xs text-[var(--muted)]">
                <span className={`h-2 w-2 rounded-full ${cameraReady ? "bg-emerald-400" : "bg-slate-600"}`} />
                {cameraReady ? "Camera online" : "Camera offline"}
              </div>
            </header>

            <div className="grid min-h-[700px] lg:grid-cols-[minmax(0,1fr)_310px]">
              <div className="flex flex-col items-center justify-center border-b border-[var(--border)] px-6 py-9 text-center lg:border-b-0 lg:border-r sm:px-10">
                <div className={`mb-6 h-5 w-5 rounded-full transition-all duration-300 ${ledClass(outcome?.feedback.led ?? "off")}`} />

                <div className="relative aspect-video w-full max-w-[680px] overflow-hidden rounded-[2rem] border border-[var(--border)] bg-black">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="h-full w-full scale-x-[-1] object-cover"
                  />
                  {!cameraReady ? (
                    <div className="absolute inset-0 grid place-items-center bg-black/70 px-8">
                      <div>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-300/20 bg-emerald-300/[0.05] text-2xl">
                          ◎
                        </div>
                        <p className="mt-5 text-lg font-semibold">Aktifkan kamera untuk mulai</p>
                        <p className="mt-2 text-sm text-slate-400">
                          Tidak ada foto yang disimpan oleh live recruiter demo.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 backdrop-blur">
                    {stage === "enrolling"
                      ? "Extracting template..."
                      : stage === "verifying"
                        ? "Verifying 1:1..."
                        : "Live camera"}
                  </div>
                </div>

                {outcome ? (
                  <div className="mt-8 max-w-2xl">
                    <p
                      className={`text-xs font-bold uppercase tracking-[0.22em] ${
                        outcome.accepted ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {outcome.code}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      {outcome.accepted ? "Identity verified" : "Identity rejected"}
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-200">
                      {outcome.message}
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 max-w-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                      {demoFaceToken ? "TEMPORARY CARD READY" : "LIVE DEMO SETUP"}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      {demoFaceToken ? "Siapa yang ada di kamera?" : "Daftarkan wajah pemilik"}
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      {demoFaceToken
                        ? "Klik verifikasi. Wajah yang sama harus MATCH; wajah teman harus MISMATCH."
                        : "Satu frame dipakai untuk membuat template demo sementara yang terikat ke kartu virtual."}
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
                    ["RFID", demoFaceToken ? "LIVE:DEMO:CARD" : "Waiting for enrollment"],
                    ["Identity", demoFaceToken ? displayName : "Unbound"],
                    ["Face model", result?.resolution?.modelName ?? "OpenCV YuNet + SFace"],
                    ["Face status", result?.resolution?.faceStatus ?? (stage === "verifying" ? "Processing" : "Waiting")],
                    ["Decision", outcome?.code ?? "Waiting for engine"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-[var(--border)] bg-black/15 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 break-words text-sm font-medium text-slate-200">{value}</p>
                    </div>
                  ))}
                </div>

                {result?.resolution ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-black/15 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Verification metrics
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500">Similarity</p>
                        <p className="mt-1 font-semibold text-slate-200">
                          {result.resolution.verificationScore?.toFixed(3) ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Threshold</p>
                        <p className="mt-1 font-semibold text-slate-200">
                          {result.resolution.threshold.toFixed(3)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Quality</p>
                        <p className="mt-1 font-semibold text-slate-200">
                          {formatPercent(result.resolution.qualityScore)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Liveness</p>
                        <p className="mt-1 font-semibold text-amber-200">
                          {result.resolution.livenessChecked ? "Checked" : "V1: not enabled"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 lg:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Recruiter controls
              </p>
              <h2 className="mt-2 text-xl font-semibold">Test it with real faces</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Tidak ada tombol MATCH atau MISMATCH. Model membandingkan wajah yang ada di kamera dengan template sementara.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-black/15 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-xs font-bold text-emerald-300">1</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Aktifkan kamera</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Izinkan browser menggunakan webcam.</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={cameraReady ? stopCamera : startCamera}
                    className="mt-3 w-full rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                  >
                    {cameraReady ? "Matikan kamera" : "Aktifkan kamera"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-black/15 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-xs font-bold text-emerald-300">2</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Buat kartu demo sementara</p>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value.slice(0, 80))}
                    disabled={busy || Boolean(demoFaceToken)}
                    placeholder="Nama recruiter"
                    className="mt-3 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!cameraReady || busy}
                    onClick={enrollLiveFace}
                    className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {stage === "enrolling" ? "Membuat template..." : demoFaceToken ? "Enroll ulang wajah" : "Daftarkan wajah saya"}
                  </button>

                  {demoFaceToken ? (
                    <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3 text-xs leading-5 text-emerald-100">
                      <p className="font-semibold">Temporary identity ready</p>
                      <p className="mt-1 text-emerald-100/70">
                        Enrollment quality {formatPercent(enrollQuality)} · token hanya di memory tab
                        {expiresAt ? ` · expires ${new Date(expiresAt).toLocaleTimeString()}` : ""}.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-black/15 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-xs font-bold text-emerald-300">3</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Verifikasi wajah di kamera</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Coba wajah pemilik dulu. Setelah hijau, ganti dengan wajah teman lalu klik lagi.
                  </p>
                  <button
                    type="button"
                    disabled={!cameraReady || !demoFaceToken || busy}
                    onClick={verifyCurrentFace}
                    className="mt-3 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {stage === "verifying" ? "Memverifikasi..." : "Scan RFID + verifikasi wajah"}
                  </button>
                </div>
              </div>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-xs leading-5 text-amber-100">
                {message}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetLiveDemo}
                disabled={busy}
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs text-[var(--muted)] transition hover:text-white disabled:opacity-50"
              >
                Reset identity
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setMessage(null);
                  setStage(demoFaceToken ? "enrolled" : "ready");
                }}
                disabled={busy}
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs text-[var(--muted)] transition hover:text-white disabled:opacity-50"
              >
                Clear result
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-black/10 p-4 text-[11px] leading-5 text-[var(--muted)]">
              <p className="font-semibold text-slate-300">Privacy & demo scope</p>
              <p className="mt-1">
                Foto mentah tidak dipersist ke database. Template wajah dibungkus dalam token terenkripsi berumur pendek dan hanya disimpan di memory tab browser. V1 belum memiliki liveness/anti-spoof.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
