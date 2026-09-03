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

function humanMessage(payload: ApiResponse) {
  switch (payload.code) {
    case "FACE_ENROLLED":
      return "Face profile berhasil disimpan. Foto mentah tidak disimpan oleh Attendance System.";
    case "NO_FACE":
      return "Wajah belum terdeteksi. Pastikan wajah terlihat utuh dan berada di tengah kamera.";
    case "MULTIPLE_FACES":
      return "Terdeteksi lebih dari satu wajah. Enrollment harus dilakukan satu orang saja.";
    case "LOW_QUALITY":
      return `Kualitas gambar belum cukup${payload.reason ? ` (${payload.reason})` : ""}. Perbaiki cahaya/fokus lalu coba lagi.`;
    case "FACE_SERVICE_UNAVAILABLE":
      return "Face service sedang tidak tersedia. Pastikan service lokal sudah aktif dan model sudah terpasang.";
    case "INVALID_FACE_SAMPLE":
      return "Frame kamera tidak dapat diproses. Coba ambil ulang gambar.";
    default:
      return "Enrollment belum berhasil. Coba lagi atau periksa konfigurasi server.";
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
        "Kamera tidak dapat dibuka. Pastikan izin kamera diberikan dan halaman berjalan melalui HTTPS atau localhost.",
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
      setMessage("Frame kamera belum siap. Tunggu sebentar lalu coba lagi.");
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
      setMessage("Gagal menghubungi server enrollment. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
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
          {cameraReady ? "Restart kamera" : "Aktifkan kamera"}
        </button>
        <button
          type="button"
          onClick={enroll}
          disabled={!cameraReady || submitting}
          className="rounded-xl bg-[var(--success)] px-4 py-2.5 text-sm font-semibold text-[#07100d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Memproses…" : "Ambil frame & enroll"}
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
          Catatan enrollment (opsional)
        </span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 300))}
          placeholder="Contoh: enrollment ulang karena perubahan penampilan"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm outline-none"
        />
      </label>

      {message ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            success
              ? "border-[color:rgba(74,222,128,0.25)] bg-[color:rgba(74,222,128,0.07)] text-[var(--success)]"
              : "border-[color:rgba(251,191,36,0.25)] bg-[color:rgba(251,191,36,0.07)] text-[var(--warning)]"
          }`}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
