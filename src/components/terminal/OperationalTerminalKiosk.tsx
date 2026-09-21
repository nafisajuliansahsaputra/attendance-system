"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isAcceptedAttendanceCode,
  isRetryableFaceCode,
  operationalTerminalMessage,
  type OperationalTerminalTone,
} from "@/application/device/operational-terminal";
import { SCHOOL } from "@/config/school";

const BRIDGE_BASE_URL = "http://127.0.0.1:8765";
const RESULT_RESET_MS = 4500;
const MAX_FACE_ATTEMPTS = 4;

type TerminalStage =
  | "boot"
  | "idle"
  | "reading"
  | "verifying"
  | "success"
  | "rejected"
  | "warning"
  | "error";

type StudentIdentity = {
  id?: string;
  name: string;
  className: string;
};

type SessionIdentity = {
  id?: string;
  name: string;
  type?: string;
};

type CardResult = {
  requestId?: string;
  code?: string;
  accepted?: boolean;
  verificationTransactionId?: string;
  expiresAt?: string;
  occurredAt?: string;
  student?: StudentIdentity;
  session?: SessionIdentity;
  reason?: string;
};

type FaceResult = {
  requestId?: string;
  code?: string;
  accepted?: boolean;
  retryable?: boolean;
  verificationScore?: number;
  threshold?: number;
  reason?: string;
};

type BridgeEvent = {
  seq: number;
  type: "card-reading" | "card-result" | "face-result" | "bridge-error";
  at: string;
  payload: CardResult & {
    rfidUid?: string;
    httpStatus?: number;
    message?: string;
  };
};

type BridgeStatus = {
  ok: boolean;
  bridgeVersion?: string;
  serverOnline: boolean;
  deviceAuthorized: boolean;
  faceServiceConfigured: boolean;
  busy: boolean;
  queueDepth: number;
  lastHeartbeatAt?: string | null;
  lastServerTime?: string | null;
  lastError?: string | null;
  device?: {
    id: string;
    code: string;
    name: string;
    deviceType: string;
    protocolVersion: string;
  } | null;
};

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function sessionLabel(type?: string) {
  switch (type) {
    case "arrival":
    case "SCHOOL_ARRIVAL":
      return "Kedatangan";
    case "departure":
    case "SCHOOL_DEPARTURE":
      return "Kepulangan";
    case "dhuha":
    case "DHUHA":
      return "Dhuha";
    case "dzuhur":
    case "DZUHUR":
      return "Dzuhur";
    case "ashar":
    case "ASHAR":
      return "Ashar";
    case "ceremony":
    case "CEREMONY":
      return "Upacara";
    case "activity":
    case "SCHOOL_ACTIVITY":
      return "Kegiatan sekolah";
    default:
      return "Absensi";
  }
}

function toneClasses(tone: OperationalTerminalTone) {
  if (tone === "success") {
    return {
      panel: "border-emerald-200 bg-emerald-50",
      icon: "bg-emerald-500 text-white",
      text: "text-emerald-800",
    };
  }
  if (tone === "danger") {
    return {
      panel: "border-rose-200 bg-rose-50",
      icon: "bg-rose-500 text-white",
      text: "text-rose-800",
    };
  }
  if (tone === "warning") {
    return {
      panel: "border-amber-200 bg-amber-50",
      icon: "bg-amber-400 text-amber-950",
      text: "text-amber-900",
    };
  }
  return {
    panel: "border-slate-200 bg-slate-50",
    icon: "bg-slate-600 text-white",
    text: "text-slate-700",
  };
}

function StatusChip({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-2">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
          ready
            ? "bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.55)]"
            : "bg-rose-400"
        }`}
      />
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-white/55">
          {label}
        </p>
        <p className="truncate text-xs font-semibold text-white">{detail}</p>
      </div>
    </div>
  );
}

async function playTerminalBeep(tone: OperationalTerminalTone) {
  if (typeof window === "undefined") return;

  const AudioContextClass =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const count = tone === "success" ? 1 : tone === "danger" ? 4 : 2;
  const frequency = tone === "success" ? 720 : tone === "danger" ? 940 : 820;

  for (let index = 0; index < count; index += 1) {
    const startAt = context.currentTime + index * 0.16;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.04, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.08);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + 0.08);
  }

  window.setTimeout(() => void context.close(), count * 180 + 100);
}

export function OperationalTerminalKiosk() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const verificationTimerRef = useRef<number | null>(null);
  const lastEventSeqRef = useRef(0);
  const keyboardBufferRef = useRef("");
  const lastKeyboardAtRef = useRef(0);
  const processingRef = useRef(false);

  const [terminalStarted, setTerminalStarted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null);
  const [stage, setStage] = useState<TerminalStage>("boot");
  const [clock, setClock] = useState(() => new Date());
  const [student, setStudent] = useState<StudentIdentity | null>(null);
  const [session, setSession] = useState<SessionIdentity | null>(null);
  const [resultCode, setResultCode] = useState<string | null>(null);
  const [message, setMessage] = useState(
    "Aktifkan terminal untuk memulai kamera dan pembacaan RFID.",
  );
  const [faceAttempt, setFaceAttempt] = useState(0);
  const [lastRfidUid, setLastRfidUid] = useState<string | null>(null);
  const [verificationScore, setVerificationScore] = useState<number | null>(null);

  const deviceName =
    bridgeStatus?.device?.name ?? "Terminal Absensi Operasional";
  const deviceCode = bridgeStatus?.device?.code ?? "Menunggu bridge";
  const terminalReady =
    terminalStarted &&
    cameraReady &&
    bridgeConnected &&
    Boolean(bridgeStatus?.serverOnline) &&
    Boolean(bridgeStatus?.deviceAuthorized);

  const resultPresentation = useMemo(
    () => (resultCode ? operationalTerminalMessage(resultCode) : null),
    [resultCode],
  );

  const clearTimers = useCallback(() => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    if (verificationTimerRef.current !== null) {
      window.clearTimeout(verificationTimerRef.current);
      verificationTimerRef.current = null;
    }
  }, []);

  const resetToIdle = useCallback(() => {
    clearTimers();
    processingRef.current = false;
    setStudent(null);
    setSession(null);
    setResultCode(null);
    setVerificationScore(null);
    setFaceAttempt(0);
    setLastRfidUid(null);
    setStage("idle");
    setMessage("Tempelkan kartu RFID pada reader.");
  }, [clearTimers]);

  const finishResult = useCallback(
    (
      code: string,
      accepted: boolean,
      identity?: StudentIdentity | null,
      score?: number | null,
    ) => {
      clearTimers();
      processingRef.current = false;
      if (identity) setStudent(identity);
      setResultCode(code);
      setVerificationScore(score ?? null);

      const presentation = operationalTerminalMessage(code);
      setMessage(presentation.detail);

      if (accepted || isAcceptedAttendanceCode(code)) {
        setStage("success");
      } else if (presentation.tone === "danger") {
        setStage("rejected");
      } else {
        setStage("warning");
      }

      void playTerminalBeep(presentation.tone);
      resetTimerRef.current = window.setTimeout(
        resetToIdle,
        RESULT_RESET_MS,
      );
    },
    [clearTimers, resetToIdle],
  );

  const captureJpeg = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (
      !video ||
      !canvas ||
      video.videoWidth <= 0 ||
      video.videoHeight <= 0
    ) {
      return null;
    }

    const maxWidth = 720;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  }, []);

  const verifyFace = useCallback(
    async (input: {
      requestId: string;
      transactionId: string;
      attempt: number;
      identity: StudentIdentity | null;
    }) => {
      if (!cameraReady || !terminalStarted) {
        finishResult("FACE_NOT_DETECTED", false, input.identity);
        return;
      }

      const imageBase64 = captureJpeg();
      if (!imageBase64) {
        if (input.attempt < MAX_FACE_ATTEMPTS) {
          verificationTimerRef.current = window.setTimeout(
            () =>
              void verifyFace({
                ...input,
                attempt: input.attempt + 1,
              }),
            700,
          );
          return;
        }
        finishResult("FACE_NOT_DETECTED", false, input.identity);
        return;
      }

      setStage("verifying");
      setFaceAttempt(input.attempt);
      setMessage(
        input.attempt === 1
          ? "Wajah terdeteksi. Sistem sedang mencocokkan identitas."
          : "Posisikan wajah tetap di dalam panduan. Sistem mencoba kembali.",
      );

      try {
        const response = await fetch(`${BRIDGE_BASE_URL}/face-verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: input.requestId,
            verificationTransactionId: input.transactionId,
            imageBase64,
          }),
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as FaceResult;

        if (
          payload.retryable &&
          isRetryableFaceCode(payload.code) &&
          input.attempt < MAX_FACE_ATTEMPTS
        ) {
          const retryMessage = operationalTerminalMessage(payload.code);
          setResultCode(payload.code ?? null);
          setMessage(retryMessage.detail);
          verificationTimerRef.current = window.setTimeout(
            () =>
              void verifyFace({
                ...input,
                attempt: input.attempt + 1,
              }),
            900,
          );
          return;
        }

        finishResult(
          payload.code ?? (response.ok ? "SYSTEM_ERROR" : "SYSTEM_ERROR"),
          Boolean(payload.accepted),
          input.identity,
          payload.verificationScore ?? null,
        );
      } catch {
        setBridgeConnected(false);
        finishResult("FACE_SERVICE_ERROR", false, input.identity);
      }
    },
    [
      cameraReady,
      captureJpeg,
      finishResult,
      terminalStarted,
    ],
  );

  const handleCardResult = useCallback(
    (payload: CardResult & { rfidUid?: string }) => {
      processingRef.current = true;
      const identity = payload.student ?? null;

      if (payload.rfidUid) setLastRfidUid(payload.rfidUid);
      if (identity) setStudent(identity);
      if (payload.session) setSession(payload.session);

      if (
        payload.code === "CAPTURE_FACE" &&
        payload.requestId &&
        payload.verificationTransactionId
      ) {
        setResultCode(null);
        setStage("verifying");
        setMessage(
          "Kartu dikenali. Hadap lurus ke kamera untuk verifikasi wajah.",
        );
        verificationTimerRef.current = window.setTimeout(
          () =>
            void verifyFace({
              requestId: payload.requestId as string,
              transactionId: payload.verificationTransactionId as string,
              attempt: 1,
              identity,
            }),
          650,
        );
        return;
      }

      finishResult(
        payload.code ?? "SYSTEM_ERROR",
        Boolean(payload.accepted),
        identity,
      );
    },
    [finishResult, verifyFace],
  );

  const handleBridgeEvent = useCallback(
    (event: BridgeEvent) => {
      lastEventSeqRef.current = Math.max(
        lastEventSeqRef.current,
        event.seq,
      );

      if (event.type === "card-reading") {
        clearTimers();
        processingRef.current = true;
        setStudent(null);
        setSession(null);
        setResultCode(null);
        setVerificationScore(null);
        setFaceAttempt(0);
        setLastRfidUid(event.payload.rfidUid ?? null);
        setStage("reading");
        setMessage("Kartu RFID terbaca. Memeriksa identitas dan jadwal...");
        return;
      }

      if (event.type === "card-result") {
        handleCardResult(event.payload);
        return;
      }

      if (event.type === "bridge-error") {
        finishResult("SYSTEM_ERROR", false, student);
      }
    },
    [clearTimers, finishResult, handleCardResult, student],
  );

  const submitRfid = useCallback(
    async (uid: string, source = "keyboard-wedge") => {
      const normalized = uid.trim();
      if (
        !terminalStarted ||
        !bridgeConnected ||
        processingRef.current ||
        normalized.length < 2
      ) {
        return;
      }

      try {
        const response = await fetch(`${BRIDGE_BASE_URL}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rfidUid: normalized,
            source,
          }),
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          event?: BridgeEvent;
          code?: string;
        };

        if (payload.event) {
          handleBridgeEvent(payload.event);
        } else if (!response.ok) {
          setMessage(
            payload.code === "DEVICE_BUSY"
              ? "Terminal masih menyelesaikan transaksi sebelumnya."
              : "RFID belum dapat diproses oleh bridge.",
          );
        }
      } catch {
        setBridgeConnected(false);
        setStage("error");
        setMessage(
          "Bridge perangkat tidak dapat dihubungi. Jalankan bridge lokal pada laptop terminal.",
        );
      }
    },
    [
      bridgeConnected,
      handleBridgeEvent,
      terminalStarted,
    ],
  );

  const startCamera = useCallback(async () => {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
      setTerminalStarted(true);
      setStage("idle");
      setMessage("Tempelkan kartu RFID pada reader.");

      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => undefined);
      }
    } catch {
      setCameraReady(false);
      setTerminalStarted(false);
      setStage("error");
      setMessage(
        "Kamera tidak dapat dibuka. Berikan izin kamera pada browser lalu coba lagi.",
      );
    }
  }, []);

  const stopTerminal = useCallback(() => {
    clearTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    setTerminalStarted(false);
    processingRef.current = false;
    setStage("boot");
    setMessage("Aktifkan terminal untuk memulai kamera dan pembacaan RFID.");
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [clearTimers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollStatus() {
      try {
        const response = await fetch(`${BRIDGE_BASE_URL}/status`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("BRIDGE_STATUS_FAILED");
        const payload = (await response.json()) as BridgeStatus;
        if (cancelled) return;
        setBridgeConnected(true);
        setBridgeStatus(payload);
      } catch {
        if (cancelled) return;
        setBridgeConnected(false);
        setBridgeStatus(null);
      }
    }

    void pollStatus();
    const timer = window.setInterval(() => void pollStatus(), 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!terminalStarted) return;

    let cancelled = false;

    async function pollEvents() {
      try {
        const response = await fetch(
          `${BRIDGE_BASE_URL}/events?after=${lastEventSeqRef.current}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          events?: BridgeEvent[];
        };
        if (cancelled) return;

        for (const event of payload.events ?? []) {
          if (event.seq > lastEventSeqRef.current) {
            handleBridgeEvent(event);
          }
        }
      } catch {
        // Status polling owns bridge connectivity state.
      }
    }

    const timer = window.setInterval(() => void pollEvents(), 350);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [handleBridgeEvent, terminalStarted]);

  useEffect(() => {
    if (!terminalStarted) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const now = Date.now();
      if (now - lastKeyboardAtRef.current > 700) {
        keyboardBufferRef.current = "";
      }
      lastKeyboardAtRef.current = now;

      if (event.key === "Enter") {
        const uid = keyboardBufferRef.current.trim();
        keyboardBufferRef.current = "";
        if (uid.length >= 2) {
          event.preventDefault();
          void submitRfid(uid);
        }
        return;
      }

      if (event.key.length === 1 && /^[A-Za-z0-9:_-]$/.test(event.key)) {
        keyboardBufferRef.current += event.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [submitRfid, terminalStarted]);

  useEffect(() => {
    return () => {
      clearTimers();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [clearTimers]);

  const prompt = (() => {
    if (stage === "idle") {
      return {
        eyebrow: "SIAP MENERIMA ABSENSI",
        title: "Tempelkan kartu RFID",
        detail: "Setelah kartu dikenali, wajah akan diverifikasi otomatis.",
        icon: ")))",
        tone: "neutral" as OperationalTerminalTone,
      };
    }
    if (stage === "reading") {
      return {
        eyebrow: "RFID TERDETEKSI",
        title: "Memeriksa kartu...",
        detail: "Identitas siswa dan sesi absensi sedang diproses.",
        icon: "RF",
        tone: "neutral" as OperationalTerminalTone,
      };
    }
    if (stage === "verifying") {
      return {
        eyebrow: "VERIFIKASI WAJAH",
        title: student?.name ?? "Posisikan wajah",
        detail:
          faceAttempt > 1
            ? `Percobaan ${faceAttempt}/${MAX_FACE_ATTEMPTS} · tetap hadap kamera.`
            : "Hadap lurus ke kamera dan tetap di dalam panduan.",
        icon: "◎",
        tone: "neutral" as OperationalTerminalTone,
      };
    }
    if (resultPresentation) {
      return {
        eyebrow:
          stage === "success"
            ? "ABSENSI TERCATAT"
            : stage === "rejected"
              ? "ABSENSI DITOLAK"
              : "PERHATIAN",
        title: resultPresentation.title,
        detail: resultPresentation.detail,
        icon: stage === "success" ? "✓" : stage === "rejected" ? "×" : "!",
        tone: resultPresentation.tone,
      };
    }
    if (stage === "error") {
      return {
        eyebrow: "TERMINAL BELUM SIAP",
        title: "Periksa perangkat",
        detail: message,
        icon: "!",
        tone: "danger" as OperationalTerminalTone,
      };
    }
    return {
      eyebrow: "TERMINAL OPERASIONAL",
      title: "Aktifkan terminal",
      detail: "Kamera dan reader RFID akan disiapkan untuk mode kiosk.",
      icon: "A12",
      tone: "neutral" as OperationalTerminalTone,
    };
  })();

  const promptStyle = toneClasses(prompt.tone);

  return (
    <main className="min-h-dvh bg-[#eef3f0] p-3 text-[#183029] sm:p-4 lg:h-dvh lg:overflow-hidden lg:p-5">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[1720px] flex-col overflow-hidden rounded-[28px] border border-[#cddbd3] bg-white shadow-[0_24px_80px_rgba(15,43,32,0.12)] sm:min-h-[calc(100dvh-2rem)] lg:h-[calc(100dvh-2.5rem)] lg:min-h-0">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-[#174e39] px-5 py-4 text-white sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-sm font-black text-[#174e39]">
              A12
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">{SCHOOL.name}</p>
              <p className="truncate text-xs text-emerald-100/65">
                {deviceName} · {deviceCode}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap justify-end gap-2 lg:flex-none">
            <StatusChip
              label="Bridge"
              ready={bridgeConnected}
              detail={bridgeConnected ? "Terhubung" : "Tidak terhubung"}
            />
            <StatusChip
              label="Server"
              ready={Boolean(bridgeStatus?.serverOnline)}
              detail={bridgeStatus?.serverOnline ? "Online" : "Offline"}
            />
            <StatusChip
              label="RFID"
              ready={Boolean(terminalStarted && bridgeStatus?.deviceAuthorized)}
              detail={
                terminalStarted && bridgeStatus?.deviceAuthorized
                  ? "Siap membaca"
                  : "Belum siap"
              }
            />
            <StatusChip
              label="Kamera"
              ready={cameraReady}
              detail={cameraReady ? "Aktif" : "Tidak aktif"}
            />
            <StatusChip
              label="Face"
              ready={Boolean(bridgeStatus?.faceServiceConfigured)}
              detail={
                bridgeStatus?.faceServiceConfigured
                  ? "Tersedia"
                  : "Belum siap"
              }
            />
          </div>
        </header>

        <div className="grid flex-1 gap-0 lg:min-h-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
          <section className="flex min-h-[520px] flex-col border-b border-[#dbe5df] bg-[#0d1d17] lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <video
                ref={videoRef}
                muted
                playsInline
                className="h-full min-h-[520px] w-full scale-x-[-1] object-cover lg:min-h-0"
              />

              {!cameraReady ? (
                <div className="absolute inset-0 grid place-items-center bg-[#0d1d17] px-8 text-center text-white">
                  <div className="max-w-xl">
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] border border-white/10 bg-white/5 text-2xl font-black">
                      A12
                    </div>
                    <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                      Terminal absensi operasional
                    </h1>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/55">
                      Kamera akan tampil real-time. Proses pengenalan wajah hanya
                      dijalankan setelah kartu RFID dikenali.
                    </p>
                    <button
                      type="button"
                      onClick={() => void startCamera()}
                      className="mt-7 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#174e39] transition hover:bg-emerald-50"
                    >
                      Aktifkan kamera & mulai terminal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div
                      className={`h-[62%] max-h-[500px] w-[38%] min-w-[220px] max-w-[360px] rounded-[45%] border-2 transition ${
                        stage === "verifying"
                          ? "border-emerald-300 shadow-[0_0_50px_rgba(110,231,183,0.2)]"
                          : "border-white/35"
                      }`}
                    />
                  </div>

                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    Kamera langsung
                  </div>

                  <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-xs text-white/75 backdrop-blur-md sm:px-5">
                    <span>
                      {stage === "verifying"
                        ? "Tetap hadap lurus. Sistem sedang membandingkan wajah."
                        : "Berdiri satu orang di depan kamera."}
                    </span>
                    <span className="font-semibold text-white/90">
                      Foto tidak disimpan sebagai gambar absensi
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="flex min-h-[540px] flex-col bg-[#fbfcfb] p-5 sm:p-7 lg:min-h-0 lg:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#56806d]">
                  {formatDate(clock)}
                </p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-[-0.04em] text-[#174e39]">
                  {formatClock(clock)}
                </p>
              </div>

              {terminalStarted ? (
                <button
                  type="button"
                  onClick={stopTerminal}
                  className="rounded-xl border border-[#d7e2dc] bg-white px-3 py-2 text-xs font-bold text-[#355548] transition hover:bg-[#f3f7f5]"
                >
                  Keluar kiosk
                </button>
              ) : null}
            </div>

            <div
              className={`mt-6 rounded-[26px] border p-5 transition sm:p-6 ${promptStyle.panel}`}
            >
              <div
                className={`grid h-14 w-14 place-items-center rounded-2xl text-base font-black ${promptStyle.icon}`}
              >
                {prompt.icon}
              </div>
              <p className={`mt-5 text-[10px] font-bold uppercase tracking-[0.18em] ${promptStyle.text}`}>
                {prompt.eyebrow}
              </p>
              <h2 className={`mt-2 text-3xl font-bold tracking-[-0.04em] ${promptStyle.text}`}>
                {prompt.title}
              </h2>
              <p className={`mt-3 text-sm leading-6 ${promptStyle.text} opacity-80`}>
                {prompt.detail}
              </p>
            </div>

            {student ? (
              <div className="mt-4 rounded-2xl border border-[#dbe5df] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#56806d]">
                  Identitas kartu
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-[-0.025em] text-[#17352a]">
                  {student.name}
                </h3>
                <p className="mt-1 text-sm font-semibold text-[#56806d]">
                  {student.className}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f4f7f5] px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Sesi
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#355548]">
                      {session ? sessionLabel(session.type) : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f4f7f5] px-3 py-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Verifikasi
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#355548]">
                      {verificationScore !== null
                        ? `${Math.round(verificationScore * 100)}% cocok`
                        : stage === "verifying"
                          ? "Sedang diproses"
                          : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {!bridgeConnected ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                <strong>Bridge lokal belum berjalan.</strong> Pada laptop terminal,
                jalankan <code className="mx-1 rounded bg-white px-1.5 py-0.5">npm run device:bridge:env</code>
                setelah perangkat selesai dipasangkan.
              </div>
            ) : bridgeStatus && !bridgeStatus.deviceAuthorized ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs leading-5 text-rose-800">
                Kredensial terminal ditolak server. Lakukan pairing ulang dari
                Dashboard → Perangkat.
              </div>
            ) : null}

            <div className="mt-auto pt-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#dbe5df] bg-white px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Heartbeat
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#355548]">
                    {bridgeStatus?.lastHeartbeatAt
                      ? new Intl.DateTimeFormat("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }).format(new Date(bridgeStatus.lastHeartbeatAt))
                      : "Belum ada"}
                  </p>
                </div>
                <div className="rounded-xl border border-[#dbe5df] bg-white px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Kartu terakhir
                  </p>
                  <p className="mt-1 truncate font-mono text-xs font-semibold text-[#355548]">
                    {lastRfidUid ?? "Belum ada"}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-center text-[10px] leading-4 text-slate-400">
                Reader USB keyboard-wedge dapat langsung digunakan. Reader
                Arduino/serial mengirim UID ke bridge lokal melalui endpoint
                <code className="mx-1">/scan</code> atau stdin.
              </p>
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dbe5df] bg-white px-5 py-3 text-[10px] text-slate-400 sm:px-7">
          <span>{SCHOOL.systemName} · Mode Terminal Operasional</span>
          <span>
            {terminalReady
              ? "Terminal siap menerima absensi"
              : "Menunggu seluruh komponen siap"}
          </span>
        </footer>
      </div>
    </main>
  );
}
