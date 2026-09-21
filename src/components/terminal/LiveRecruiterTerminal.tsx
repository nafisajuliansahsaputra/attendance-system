"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SchoolLogo } from "@/components/school/SchoolLogo";
import {
  SCHOOL,
  attendanceOutcomeLabel,
  faceStatusLabel,
} from "@/config/school";
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
      return `Kualitas gambar wajah belum mencukupi${payload.reason ? ` (${payload.reason})` : ""}. Perbaiki pencahayaan dan pastikan kamera fokus.`;
    case "MULTIPLE_FACES":
      return "Terdeteksi lebih dari satu wajah. Pastikan hanya satu orang berada di depan kamera.";
    case "LIVE_FACE_DEMO_EXPIRED":
      return "Data wajah sementara sudah kedaluwarsa. Silakan daftarkan wajah kembali.";
    case "FACE_SERVICE_UNAVAILABLE":
      return "Layanan verifikasi wajah tidak dapat dihubungi. Pastikan layanan kamera dan pengenal wajah sedang aktif.";
    case "INVALID_FACE_SAMPLE":
      return "Gambar dari kamera tidak dapat diproses. Silakan coba ambil gambar kembali.";
    default:
      return payload.reason || "Pengujian verifikasi wajah belum berhasil. Silakan coba lagi.";
  }
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LiveRecruiterTerminal() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [displayName, setDisplayName] = useState("Pengunjung");
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
    if (!demoFaceToken) return "Daftarkan wajah pemilik kartu";
    if (!ownerPassed) return "Uji menggunakan wajah yang sama";
    if (!mismatchSeen) return "Sekarang coba menggunakan wajah orang lain";
    return "Pengujian pemilik dan wajah berbeda sudah selesai";
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
      setMessage("Kamera tidak dapat dibuka. Berikan izin akses kamera pada browser lalu coba kembali.");
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
      setMessage("Kamera belum siap mengambil gambar. Tunggu sebentar lalu coba lagi.");
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
          displayName: displayName.trim() || "Pengunjung",
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
      setMessage("Wajah pemilik kartu berhasil didaftarkan. Sekarang lakukan verifikasi menggunakan wajah orang yang sama.");
    } catch {
      setStage("ready");
      setMessage("Sistem tidak dapat menghubungi layanan pendaftaran wajah sementara.");
    }
  }

  async function verifyCurrentFace() {
    if (!demoFaceToken) {
      setMessage("Daftarkan wajah pemilik kartu terlebih dahulu.");
      return;
    }

    const imageBase64 = captureJpeg();
    if (!imageBase64) {
      setMessage("Kamera belum siap mengambil gambar. Tunggu sebentar lalu coba lagi.");
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
      setMessage("Sistem tidak dapat menghubungi layanan verifikasi wajah.");
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
            <SchoolLogo size={44} priority />
            <div>
              <p className="text-sm font-semibold">{SCHOOL.name}</p>
              <p className="text-xs text-[var(--muted)]">Terminal Uji Absensi Siswa</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/terminal/lab"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
            >
              Simulasi perangkat
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-xs font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)]"
            >
              ← Halaman utama
            </Link>
          </div>
        </header>

        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {[
            {
              label: "01 · Daftarkan pemilik kartu",
              done: Boolean(demoFaceToken),
              active: !demoFaceToken,
              text: "Ambil satu gambar wajah untuk membuat identitas RFID sementara.",
            },
            {
              label: "02 · Verifikasi pemilik",
              done: ownerPassed,
              active: Boolean(demoFaceToken) && !ownerPassed,
              text: "Wajah orang yang sama seharusnya diterima oleh sistem.",
            },
            {
              label: "03 · Uji wajah berbeda",
              done: mismatchSeen,
              active: ownerPassed && !mismatchSeen,
              text: "Minta orang lain berdiri di depan kamera. Sistem seharusnya menolak.",
            },
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
                <p className={`text-xs font-bold uppercase tracking-[0.08em] ${item.done ? "text-emerald-700" : "text-[var(--muted)]"}`}>
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
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--success)]">
                  Terminal Absensi 01 · Mode Pengujian
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  Uji sendiri pencegahan titip absen
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                  Pengguna hanya memberikan kartu dan wajah. Sistem yang menentukan apakah wajah sesuai dengan pemilik kartu.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[var(--muted)]">
                <span className={`h-2 w-2 rounded-full ${cameraReady ? "bg-emerald-500" : "bg-slate-300"}`} />
                {cameraReady ? "Kamera aktif" : "Kamera tidak aktif"}
              </div>
            </header>

            <div className="grid min-h-[720px] lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col items-center justify-center border-b border-[var(--border)] px-6 py-9 text-center lg:border-b-0 lg:border-r sm:px-10">
                <div className={`mb-6 h-5 w-5 rounded-full transition-all duration-300 ${ledClass(outcome?.feedback.led ?? "off")}`} />

                <div className="relative aspect-video w-full max-w-[690px] overflow-hidden rounded-[2rem] border border-[var(--border)] bg-slate-950 shadow-inner">
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="h-full w-full scale-x-[-1] object-cover"
                  />

                  {!cameraReady ? (
                    <div className="absolute inset-0 grid place-items-center bg-slate-950 px-8 text-white">
                      <div>
                        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl">
                          ◎
                        </div>
                        <p className="mt-5 text-lg font-semibold">Kamera belum diaktifkan</p>
                        <p className="mt-2 text-sm text-slate-400">
                          Aktifkan kamera dari panel petunjuk untuk memulai pengujian.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {cameraReady ? (
                    <div className="pointer-events-none absolute inset-0 grid place-items-center">
                      <div className="h-[68%] w-[46%] rounded-[42%] border-2 border-dashed border-white/50" />
                    </div>
                  ) : null}

                  <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                    {stage === "enrolling"
                      ? "Mendaftarkan wajah..."
                      : stage === "verifying"
                        ? "Memeriksa kecocokan wajah..."
                        : "Kamera langsung"}
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-xs text-slate-200 backdrop-blur">
                    <span>Pastikan satu wajah berada di dalam garis panduan.</span>
                    <span>Gambar asli tidak disimpan</span>
                  </div>
                </div>

                {outcome ? (
                  <div className="mt-8 max-w-2xl">
                    <p className={`text-xs font-bold uppercase tracking-[0.18em] ${outcome.accepted ? "text-emerald-700" : "text-rose-700"}`}>
                      {attendanceOutcomeLabel(outcome.code)}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      {outcome.accepted ? "Identitas sesuai" : "Verifikasi ditolak"}
                    </h2>
                    <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--muted)]">
                      {outcome.message}
                    </p>
                  </div>
                ) : (
                  <div className="mt-8 max-w-xl">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
                      {demoFaceToken ? "KARTU RFID SEMENTARA SIAP" : "PERSIAPAN PENGUJIAN"}
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                      {challengeLabel}
                    </h2>
                    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                      {demoFaceToken
                        ? "Tekan tombol verifikasi saat wajah berada di kamera. Sistem akan membandingkannya dengan wajah pemilik kartu yang didaftarkan sebelumnya."
                        : "Aktifkan kamera, isi nama pemilik kartu, lalu daftarkan satu gambar wajah sebagai identitas sementara untuk pengujian."}
                    </p>
                  </div>
                )}
              </div>

              <aside className="bg-[var(--surface-soft)]/55 p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Alur pemeriksaan sistem
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    ["Kartu RFID", demoFaceToken ? "Kartu uji terdaftar" : "Belum didaftarkan"],
                    ["Pemilik kartu", demoFaceToken ? displayName : "Belum ada"],
                    ["Pengenal wajah", result?.resolution?.modelName ?? "YuNet + SFace"],
                    ["Status wajah", faceStatusLabel(result?.resolution?.faceStatus)],
                    ["Keputusan sistem", outcome ? attendanceOutcomeLabel(outcome.code) : "Menunggu verifikasi"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                        {label}
                      </p>
                      <p className="mt-2 break-words text-sm font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {result?.resolution ? (
                  <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                      Hasil pemeriksaan wajah
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[var(--muted)]">Skor kemiripan</p>
                        <p className="mt-1 font-semibold">
                          {result.resolution.verificationScore?.toFixed(3) ?? "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[var(--muted)]">Batas kecocokan</p>
                        <p className="mt-1 font-semibold">{result.resolution.threshold.toFixed(3)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--muted)]">Kualitas gambar</p>
                        <p className="mt-1 font-semibold">{formatPercent(result.resolution.qualityScore)}</p>
                      </div>
                      <div>
                        <p className="text-[var(--muted)]">Pemeriksaan keaslian</p>
                        <p className={`mt-1 font-semibold ${result.resolution.livenessChecked ? "text-emerald-700" : "text-amber-700"}`}>
                          {result.resolution.livenessChecked ? "Sudah diperiksa" : "Belum tersedia"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </aside>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-[var(--border)] bg-white p-5 shadow-sm lg:p-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--success)]">
                Petunjuk pengujian
              </p>
              <h2 className="mt-2 text-xl font-semibold">Coba seperti proses absensi siswa</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Tidak tersedia tombol untuk memilih hasil berhasil atau gagal. Hasil ditentukan dari wajah yang benar-benar berada di kamera.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/55 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--success-soft)] text-xs font-bold text-[var(--success)]">1</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Aktifkan kamera</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Berikan izin penggunaan kamera pada browser.</p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={cameraReady ? stopCamera : startCamera}
                    className="mt-3 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
                  >
                    {cameraReady ? "Matikan kamera" : "Aktifkan kamera"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/55 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--success-soft)] text-xs font-bold text-[var(--success)]">2</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Daftarkan pemilik kartu</p>
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value.slice(0, 80))}
                    disabled={busy || Boolean(demoFaceToken)}
                    placeholder="Nama pemilik kartu"
                    className="mt-3 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--success)] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!cameraReady || busy}
                    onClick={enrollLiveFace}
                    className="mt-3 w-full rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--success-strong)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {stage === "enrolling" ? "Mendaftarkan wajah..." : demoFaceToken ? "Daftarkan ulang wajah" : "Daftarkan wajah pemilik"}
                  </button>

                  {demoFaceToken ? (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
                      <p className="font-semibold">Identitas sementara siap digunakan</p>
                      <p className="mt-1 text-emerald-700">
                        Kualitas pendaftaran {formatPercent(enrollQuality)}
                        {expiresAt ? ` · berlaku sampai ${new Date(expiresAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : ""}.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/55 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--success-soft)] text-xs font-bold text-[var(--success)]">3</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Tempelkan kartu dan verifikasi wajah</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Coba wajah pemilik terlebih dahulu. Setelah diterima, ganti dengan wajah orang lain lalu lakukan pemeriksaan lagi.
                  </p>
                  <button
                    type="button"
                    disabled={!cameraReady || !demoFaceToken || busy}
                    onClick={verifyCurrentFace}
                    className="mt-3 w-full rounded-xl bg-[#17352A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0f2b20] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {stage === "verifying" ? "Memeriksa identitas..." : "Tempelkan kartu & verifikasi wajah"}
                  </button>
                </div>
              </div>
            </div>

            {message ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                {message}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={resetLiveDemo}
                disabled={busy}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-xs text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-50"
              >
                Ulangi dari awal
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setMessage(null);
                  setStage(demoFaceToken ? "enrolled" : "ready");
                }}
                disabled={busy}
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-xs text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)] disabled:opacity-50"
              >
                Bersihkan hasil
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)]/55 p-4 text-[11px] leading-5 text-[var(--muted)]">
              <p className="font-semibold text-[var(--text)]">Privasi mode pengujian</p>
              <p className="mt-1">
                Foto asli tidak disimpan ke basis data sekolah. Data wajah sementara dienkripsi, hanya berlaku singkat, dan dibuang saat identitas diulang atau sesi berakhir. Versi saat ini belum memiliki pemeriksaan anti-spoof atau liveness.
              </p>
            </div>

            <div className="mt-5 border-t border-[var(--border)] pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold">Riwayat pengujian</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">Maksimal enam pemeriksaan terakhir pada tab ini.</p>
                </div>
                {history.length ? (
                  <button
                    type="button"
                    onClick={() => setHistory([])}
                    className="text-[11px] font-semibold text-[var(--success)]"
                  >
                    Hapus riwayat
                  </button>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {history.length ? (
                  history.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[var(--border)] bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${item.accepted ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {item.accepted ? "✓" : "×"}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold">{attendanceOutcomeLabel(item.code)}</p>
                            <p className="mt-0.5 text-[10px] text-[var(--muted)]">{formatTime(item.at)}</p>
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-[var(--muted)]">
                          <p>Skor {item.score?.toFixed(3) ?? "—"}</p>
                          <p>Kualitas {formatPercent(item.quality)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)]/40 p-4 text-center text-xs text-[var(--muted)]">
                    Belum ada hasil pengujian.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        <p className="mt-5 text-center text-[11px] leading-5 text-[var(--muted)]">
          Mode pengujian ini tidak menulis kehadiran ke data siswa sekolah. Tujuannya menunjukkan proses verifikasi RFID dan wajah yang digunakan oleh sistem.
        </p>
      </div>
    </main>
  );
}
