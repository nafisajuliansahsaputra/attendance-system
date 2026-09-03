"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface FaceEnrollmentCameraProps {
  studentId: string;
}

interface ApiResponse {
  code?: string;
  reason?: string;
  qualityScore?: number;
  modelName?: string;
  modelVersion?: string;
  livenessChecked?: boolean;
}

function reasonLabel(reason?: string) {
  switch (reason) {
    case "IMAGE_TOO_BLURRY":
      return "gambar terlalu buram";
    case "FACE_TOO_SMALL":
      return "wajah terlalu jauh dari kamera";
    case "IMAGE_BRIGHTNESS_OUT_OF_RANGE":
      return "pencahayaan terlalu gelap atau terlalu terang";
    case "EMPTY_FACE_REGION":
      return "area wajah tidak dapat dibaca";
    default:
      return reason;
  }
}

function humanMessage(payload: ApiResponse) {
  switch (payload.code) {
    case "FACE_ENROLLED":
      return "Profil wajah berhasil disimpan. Foto asli tidak disimpan oleh Sistem Absensi Siswa.";
    case "NO_FACE":
      return "Wajah belum terdeteksi. Pastikan wajah terlihat utuh dan berada di tengah kamera.";
    case "MULTIPLE_FACES":
      return "Terdeteksi lebih dari satu wajah. Pendaftaran harus dilakukan oleh satu siswa saja.";
    case "LOW_QUALITY":
      return `Kualitas gambar belum mencukupi${payload.reason ? ` (${reasonLabel(payload.reason)})` : ""}. Perbaiki pencahayaan atau fokus kamera lalu coba lagi.`;
    case "FACE_SERVICE_UNAVAILABLE":
      return "Layanan pengenal wajah sedang tidak tersedia. Pastikan layanan verifikasi wajah sudah aktif.";
    case "INVALID_FACE_SAMPLE":
      return "Gambar dari kamera tidak dapat diproses. Silakan ambil gambar kembali.";
    default:
      return "Pendaftaran wajah belum berhasil. Silakan coba lagi atau periksa layanan verifikasi wajah.";
  }
}

export function FaceEnrollmentCamera({ studentId }: FaceEnrollmentCameraProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [note, setNote] = useState("");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }

  useEffect(() => stopCamera, []);

  async function startCamera() {
    setMessage(undefined);
    setSuccess(false);

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
        "Kamera tidak dapat dibuka. Pastikan izin kamera sudah diberikan pada browser.",
      );
    }
  }

  function captureJpeg(): string | null {
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
    return canvas.toDataURL("image/jpeg", 0.86);
  }

  async function enroll() {
    const imageBase64 = captureJpeg();
    if (!imageBase64) {
      setMessage("Kamera belum siap mengambil gambar. Tunggu sebentar lalu coba lagi.");
      return;
    }

    setSubmitting(true);
    setMessage(undefined);
    setSuccess(false);

    try {
      const response = await fetch(`/api/admin/students/${studentId}/face-enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, note: note.trim() || undefined }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ApiResponse;
      const ok = response.ok && payload.code === "FACE_ENROLLED";
      setSuccess(ok);
      setMessage(humanMessage(payload));
      if (ok) {
        router.refresh();
      }
    } catch {
      setMessage("Tidak dapat menghubungi layanan pendaftaran wajah. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-950">
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-video w-full object-cover"
        />
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startCamera}
          disabled={submitting}
          className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
        >
          {cameraReady ? "Mulai ulang kamera" : "Aktifkan kamera"}
        </button>
        <button
          type="button"
          onClick={enroll}
          disabled={!cameraReady || submitting}
          className="rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Memproses…" : "Ambil gambar & daftarkan wajah"}
        </button>
        {cameraReady ? (
          <button
            type="button"
            onClick={stopCamera}
            disabled={submitting}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm transition hover:bg-[var(--surface-soft)]"
          >
            Matikan kamera
          </button>
        ) : null}
      </div>

      <label>
        <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
          Catatan pendaftaran (opsional)
        </span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 300))}
          placeholder="Contoh: daftar ulang karena perubahan penampilan"
          className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none"
        />
      </label>

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            success
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
