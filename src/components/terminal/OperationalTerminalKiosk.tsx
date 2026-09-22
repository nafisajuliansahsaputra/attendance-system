"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isAcceptedAttendanceCode,
  isRetryableFaceCode,
  operationalTerminalMessage,
  type OperationalTerminalTone,
} from "@/application/device/operational-terminal";
import { SchoolLogo } from "@/components/school/SchoolLogo";
import { SCHOOL } from "@/config/school";

const RESULT_RESET_MS = 4500;
const MAX_FACE_ATTEMPTS = 4;
const HEARTBEAT_INTERVAL_MS = 30_000;
const PORTFOLIO_CAMERA_PREVIEW = "/terminal/portfolio-student-preview.webp";

const PRESENTATION_DEVICE: DeviceIdentity = {
  id: "00000000-0000-4000-8000-000000000012",
  code: "A12-GERBANG-01",
  name: "Terminal Gerbang Utama",
  deviceType: "ARDUINO_BRIDGE",
  protocolVersion: "v1",
  location: "Gerbang Utama",
};

type TerminalStage =
  | "boot"
  | "idle"
  | "reading"
  | "verifying"
  | "success"
  | "rejected"
  | "warning"
  | "error";

type PairingState = "checking" | "unpaired" | "paired";

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

type DeviceIdentity = {
  id: string;
  code: string;
  name: string;
  deviceType: string;
  protocolVersion: string;
  location?: string | null;
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

type HeartbeatResponse = {
  ok?: boolean;
  code?: string;
  deviceId?: string;
  protocolVersion?: string;
  lastHeartbeatAt?: string;
  serverTime?: string;
  device?: DeviceIdentity;
};

type BrowserPairingResponse = {
  ok?: boolean;
  code?: string;
  message?: string;
  device?: DeviceIdentity & {
    pairedAt?: string;
  };
  sessionExpiresAt?: string;
};

interface WebSerialPort {
  readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface WebSerialApi {
  requestPort(): Promise<WebSerialPort>;
}

function serialApi() {
  return (
    navigator as Navigator & {
      serial?: WebSerialApi;
    }
  ).serial;
}

function normalizeSerialUid(value: string) {
  return value
    .trim()
    .replace(/^RFID\s*[:=]\s*/i, "")
    .trim();
}

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
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-2">
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

export function OperationalTerminalKiosk({
  presentationMode = false,
}: {
  presentationMode?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const verificationTimerRef = useRef<number | null>(null);
  const keyboardBufferRef = useRef("");
  const lastKeyboardAtRef = useRef(0);
  const processingRef = useRef(false);
  const serialPortRef = useRef<WebSerialPort | null>(null);
  const serialReaderRef =
    useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const serialReadingRef = useRef(false);

  const [pairingState, setPairingState] = useState<PairingState>(
    presentationMode ? "paired" : "checking",
  );
  const [pairingCode, setPairingCode] = useState("");
  const [pairingPending, setPairingPending] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceIdentity | null>(
    presentationMode ? PRESENTATION_DEVICE : null,
  );
  const [serverOnline, setServerOnline] = useState(presentationMode);
  const [faceServiceReady, setFaceServiceReady] = useState(presentationMode);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [terminalStarted, setTerminalStarted] = useState(presentationMode);
  const [cameraReady, setCameraReady] = useState(presentationMode);
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialBaudRate, setSerialBaudRate] = useState(9600);
  const [stage, setStage] = useState<TerminalStage>(presentationMode ? "idle" : "boot");
  const [clock, setClock] = useState(() => new Date());
  const [student, setStudent] = useState<StudentIdentity | null>(null);
  const [session, setSession] = useState<SessionIdentity | null>(null);
  const [resultCode, setResultCode] = useState<string | null>(null);
  const [message, setMessage] = useState(
    presentationMode
      ? "Sesi terminal aktif. Nyalakan kamera untuk memulai terminal absensi."
      : "Memeriksa sesi terminal dengan server produksi.",
  );
  const [faceAttempt, setFaceAttempt] = useState(0);
  const [lastRfidUid, setLastRfidUid] = useState<string | null>(null);
  const [verificationScore, setVerificationScore] = useState<number | null>(null);

  const paired = pairingState === "paired";
  const terminalReady =
    paired &&
    terminalStarted &&
    cameraReady &&
    serverOnline &&
    faceServiceReady;

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
      let attempt = input.attempt;

      while (attempt <= MAX_FACE_ATTEMPTS) {
        if (!processingRef.current) return;

        if (!cameraReady || !terminalStarted) {
          finishResult("FACE_NOT_DETECTED", false, input.identity);
          return;
        }

        const imageBase64 = captureJpeg();
        if (!imageBase64) {
          if (attempt >= MAX_FACE_ATTEMPTS) {
            finishResult("FACE_NOT_DETECTED", false, input.identity);
            return;
          }

          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 700);
          });
          attempt += 1;
          continue;
        }

        setStage("verifying");
        setFaceAttempt(attempt);
        setMessage(
          attempt === 1
            ? "Wajah terdeteksi. Sistem produksi sedang mencocokkan identitas."
            : "Posisikan wajah tetap di dalam panduan. Sistem mencoba kembali.",
        );

        try {
          const response = await fetch("/api/device/v1/face-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: input.requestId,
              verificationTransactionId: input.transactionId,
              imageBase64,
            }),
            cache: "no-store",
            credentials: "same-origin",
          });
          const payload = (await response.json().catch(() => ({}))) as FaceResult;

          if (response.status === 401) {
            setPairingState("unpaired");
            setDevice(null);
            finishResult("DEVICE_NOT_AUTHORIZED", false, input.identity);
            return;
          }

          if (
            payload.retryable &&
            isRetryableFaceCode(payload.code) &&
            attempt < MAX_FACE_ATTEMPTS
          ) {
            const retryMessage = operationalTerminalMessage(payload.code);
            setResultCode(payload.code ?? null);
            setMessage(retryMessage.detail);

            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, 900);
            });
            if (!processingRef.current) return;
            attempt += 1;
            continue;
          }

          finishResult(
            payload.code ?? "SYSTEM_ERROR",
            Boolean(payload.accepted),
            input.identity,
            payload.verificationScore ?? null,
          );
          return;
        } catch {
          setServerOnline(false);
          finishResult("FACE_SERVICE_ERROR", false, input.identity);
          return;
        }
      }
    },
    [cameraReady, captureJpeg, finishResult, terminalStarted],
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

  const submitRfid = useCallback(
    async (uid: string, source = "keyboard-wedge") => {
      if (presentationMode) return;

      const normalized = normalizeSerialUid(uid);

      if (
        !paired ||
        !terminalStarted ||
        !serverOnline ||
        processingRef.current ||
        normalized.length < 2
      ) {
        return;
      }

      clearTimers();
      processingRef.current = true;
      setStudent(null);
      setSession(null);
      setResultCode(null);
      setVerificationScore(null);
      setFaceAttempt(0);
      setLastRfidUid(normalized);
      setStage("reading");
      setMessage(
        source === "web-serial"
          ? "RFID serial terbaca. Memeriksa identitas dan jadwal..."
          : "Kartu RFID terbaca. Memeriksa identitas dan jadwal...",
      );

      const requestId = `rfid-${crypto.randomUUID()}`;

      try {
        const response = await fetch("/api/device/v1/card-scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            rfidUid: normalized,
            occurredAt: new Date().toISOString(),
          }),
          cache: "no-store",
          credentials: "same-origin",
        });

        const payload = (await response.json().catch(() => ({}))) as CardResult;

        if (response.status === 401) {
          setPairingState("unpaired");
          setDevice(null);
          finishResult("DEVICE_NOT_AUTHORIZED", false);
          return;
        }

        handleCardResult({
          ...payload,
          rfidUid: normalized,
        });
      } catch {
        setServerOnline(false);
        finishResult("SYSTEM_ERROR", false);
      }
    },
    [
      clearTimers,
      finishResult,
      handleCardResult,
      paired,
      presentationMode,
      serverOnline,
      terminalStarted,
    ],
  );

  const disconnectSerial = useCallback(async () => {
    serialReadingRef.current = false;

    if (serialReaderRef.current) {
      await serialReaderRef.current.cancel().catch(() => undefined);
      serialReaderRef.current.releaseLock();
      serialReaderRef.current = null;
    }

    if (serialPortRef.current) {
      await serialPortRef.current.close().catch(() => undefined);
      serialPortRef.current = null;
    }

    setSerialConnected(false);
  }, []);

  const connectSerial = useCallback(async () => {
    const api = serialApi();
    if (!api) {
      setMessage(
        "Browser ini tidak mendukung Web Serial. Gunakan Chrome/Edge desktop atau reader USB keyboard-wedge.",
      );
      return;
    }

    try {
      await disconnectSerial();
      const port = await api.requestPort();
      await port.open({ baudRate: serialBaudRate });
      serialPortRef.current = port;
      serialReadingRef.current = true;
      setSerialConnected(true);
      setMessage("Reader serial terhubung dan siap menerima UID RFID.");

      const reader = port.readable?.getReader();
      if (!reader) {
        throw new Error("SERIAL_READER_UNAVAILABLE");
      }

      serialReaderRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";

      while (serialReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const uid = normalizeSerialUid(line);
          if (uid.length >= 2) {
            await submitRfid(uid, "web-serial");
          }
        }
      }
    } catch (error) {
      if (serialReadingRef.current) {
        setMessage(
          error instanceof Error && error.name === "NotFoundError"
            ? "Pemilihan port dibatalkan."
            : "Reader serial gagal dihubungkan. Periksa kabel, COM port, dan baud rate.",
        );
      }
    } finally {
      serialReadingRef.current = false;
      if (serialReaderRef.current) {
        serialReaderRef.current.releaseLock();
        serialReaderRef.current = null;
      }
      setSerialConnected(false);
    }
  }, [disconnectSerial, serialBaudRate, submitRfid]);

  const refreshProductionStatus = useCallback(async () => {
    if (presentationMode) return;

    try {
      const [heartbeatResponse, healthResponse] = await Promise.all([
        fetch("/api/device/v1/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runtimeVersion: "hosted-browser-terminal-v1",
            hardwareModel: "Browser kiosk terminal",
            readerMode: serialConnected ? "WEB_SERIAL" : "KEYBOARD_WEDGE",
            cameraReady,
            queueDepth: 0,
            localTime: new Date().toISOString(),
          }),
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/health", {
          cache: "no-store",
          credentials: "same-origin",
        }).catch(() => null),
      ]);

      setServerOnline(true);

      if (healthResponse?.ok) {
        const health = (await healthResponse.json().catch(() => null)) as {
          readiness?: { faceServiceConfigured?: boolean };
        } | null;
        setFaceServiceReady(Boolean(health?.readiness?.faceServiceConfigured));
      } else {
        setFaceServiceReady(false);
      }

      if (heartbeatResponse.status === 401) {
        setPairingState("unpaired");
        setDevice(null);
        setLastHeartbeatAt(null);
        if (!terminalStarted) {
          setStage("boot");
          setMessage(
            "Terminal belum dipasangkan. Masukkan kode pairing dari dashboard administrator.",
          );
        }
        return;
      }

      const heartbeat =
        (await heartbeatResponse.json().catch(() => ({}))) as HeartbeatResponse;

      if (!heartbeatResponse.ok || !heartbeat.ok) {
        setPairingState("unpaired");
        setDevice(null);
        return;
      }

      setPairingState("paired");
      if (heartbeat.device) setDevice(heartbeat.device);
      setLastHeartbeatAt(heartbeat.lastHeartbeatAt ?? null);

      if (!terminalStarted && stage === "boot") {
        setMessage(
          "Sesi produksi aktif. Nyalakan kamera untuk memulai terminal absensi.",
        );
      }
    } catch {
      setServerOnline(false);
      setFaceServiceReady(false);
      if (!terminalStarted) {
        setMessage("Server produksi tidak dapat dihubungi.");
      }
    }
  }, [
    cameraReady,
    presentationMode,
    serialConnected,
    stage,
    terminalStarted,
  ]);

  const pairHostedTerminal = useCallback(async () => {
    const code = pairingCode.trim();
    if (code.length < 8) {
      setPairingError("Masukkan kode pairing yang tampil di dashboard administrator.");
      return;
    }

    setPairingPending(true);
    setPairingError(null);

    try {
      const response = await fetch("/api/device/v1/browser-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairingCode: code,
          protocolVersion: "v1",
          client: {
            browser: navigator.userAgent,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
          },
        }),
        cache: "no-store",
        credentials: "same-origin",
      });

      const payload =
        (await response.json().catch(() => ({}))) as BrowserPairingResponse;

      if (!response.ok || !payload.ok || !payload.device) {
        setPairingError(
          payload.message ??
            "Pairing gagal. Pastikan kode masih berlaku dan terminal berstatus aktif.",
        );
        return;
      }

      setPairingState("paired");
      setDevice(payload.device);
      setPairingCode("");
      setStage("boot");
      setMessage(
        "Terminal berhasil dipasangkan ke server produksi. Aktifkan kamera untuk mulai absensi.",
      );
      await refreshProductionStatus();
    } catch {
      setServerOnline(false);
      setPairingError("Server produksi tidak dapat dihubungi.");
    } finally {
      setPairingPending(false);
    }
  }, [pairingCode, refreshProductionStatus]);

  const startCamera = useCallback(async () => {
    if (!paired) {
      setMessage("Pasangkan terminal terlebih dahulu.");
      return;
    }

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
      if (presentationMode) {
        setLastHeartbeatAt(new Date().toISOString());
      }

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
  }, [paired, presentationMode]);

  const stopTerminal = useCallback(() => {
    clearTimers();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
    setTerminalStarted(false);
    processingRef.current = false;
    setStudent(null);
    setSession(null);
    setResultCode(null);
    setVerificationScore(null);
    setFaceAttempt(0);
    setLastRfidUid(null);
    setStage("boot");
    setMessage(
      paired
        ? "Sesi produksi aktif. Nyalakan kamera untuk memulai terminal absensi."
        : "Terminal belum dipasangkan.",
    );
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, [clearTimers, paired]);


  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = new Date();
      setClock(now);
      if (presentationMode && terminalStarted) {
        setLastHeartbeatAt(now.toISOString());
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [presentationMode, terminalStarted]);

  useEffect(() => {
    if (presentationMode) return;

    const initialTimer = window.setTimeout(
      () => void refreshProductionStatus(),
      0,
    );
    const heartbeatTimer = window.setInterval(
      () => void refreshProductionStatus(),
      HEARTBEAT_INTERVAL_MS,
    );

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(heartbeatTimer);
    };
  }, [presentationMode, refreshProductionStatus]);

  useEffect(() => {
    if (!terminalStarted || !paired) return;

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
          void submitRfid(uid, "keyboard-wedge");
        }
        return;
      }

      if (event.key.length === 1 && /^[A-Za-z0-9:_-]$/.test(event.key)) {
        keyboardBufferRef.current += event.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [paired, submitRfid, terminalStarted]);

  useEffect(() => {
    return () => {
      clearTimers();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      serialReadingRef.current = false;
      if (serialReaderRef.current) {
        void serialReaderRef.current.cancel().catch(() => undefined);
      }
      if (serialPortRef.current) {
        void serialPortRef.current.close().catch(() => undefined);
      }
    };
  }, [clearTimers]);

  const prompt = (() => {
    if (pairingState === "checking") {
      return {
        eyebrow: "SERVER PRODUKSI",
        title: "Memeriksa terminal...",
        detail: "Sesi perangkat sedang diverifikasi ke server.",
        icon: "···",
        tone: "neutral" as OperationalTerminalTone,
      };
    }
    if (pairingState === "unpaired") {
      return {
        eyebrow: "PAIRING DIPERLUKAN",
        title: "Hubungkan terminal",
        detail: "Masukkan kode pairing dari dashboard administrator.",
        icon: "↔",
        tone: "warning" as OperationalTerminalTone,
      };
    }
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
        detail: "Identitas siswa dan sesi absensi sedang diproses di server.",
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
      detail: paired
        ? "Kamera dan reader RFID akan digunakan langsung oleh browser production."
        : "Pasangkan terminal dengan server produksi terlebih dahulu.",
      icon: "A12",
      tone: "neutral" as OperationalTerminalTone,
    };
  })();

  const promptStyle = toneClasses(prompt.tone);

  return (
    <main className="h-dvh w-screen overflow-hidden bg-[#eef3f0] text-[#183029]">
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="flex h-full w-full flex-col overflow-hidden bg-white">
        <header className="flex flex-wrap items-center justify-between gap-4 bg-[#174e39] px-5 py-4 text-white sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <SchoolLogo size={44} priority className="ring-white/15" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold sm:text-base">{SCHOOL.name}</p>
              <p className="truncate text-xs text-emerald-100/65">
                {device?.name ?? "Terminal Absensi Operasional"} ·{" "}
                {device?.code ?? "Belum dipasangkan"}
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap justify-end gap-2 lg:flex-none">
            <StatusChip
              label="Server"
              ready={serverOnline}
              detail={serverOnline ? "Production online" : "Offline"}
            />
            <StatusChip
              label="Terminal"
              ready={paired}
              detail={paired ? "Terotorisasi" : "Belum pairing"}
            />
            <StatusChip
              label="RFID"
              ready={paired && (terminalStarted || presentationMode)}
              detail={
                presentationMode
                  ? "Keyboard-wedge siap"
                  : serialConnected
                    ? "Serial terhubung"
                    : terminalStarted
                      ? "Keyboard-wedge siap"
                      : "Belum aktif"
              }
            />
            <StatusChip
              label="Kamera"
              ready={cameraReady}
              detail={cameraReady ? "Aktif" : "Tidak aktif"}
            />
            <StatusChip
              label="Face"
              ready={faceServiceReady}
              detail={faceServiceReady ? "Production siap" : "Belum siap"}
            />
          </div>
        </header>

        <div className="grid flex-1 gap-0 lg:min-h-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
          <section className="flex min-h-[520px] flex-col border-b border-[#dbe5df] bg-[#0d1d17] lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              {presentationMode ? (
                <img
                  src={PORTFOLIO_CAMERA_PREVIEW}
                  alt="Preview kamera siswa untuk tampilan portfolio"
                  className="h-full min-h-[520px] w-full object-cover object-center lg:min-h-0"
                />
              ) : (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="h-full min-h-[520px] w-full scale-x-[-1] object-cover lg:min-h-0"
                />
              )}

              {!cameraReady ? (
                <div className="absolute inset-0 grid place-items-center bg-[#0d1d17] px-8 text-center text-white">
                  <div className="max-w-xl">
                    <SchoolLogo
                      size={80}
                      priority
                      className="mx-auto rounded-[24px] ring-white/10"
                    />
                    <h1 className="mt-6 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                      Terminal absensi production
                    </h1>
                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/55">
                      Kamera, RFID, face verification, dan database terhubung
                      langsung ke layanan production. Tidak ada bridge localhost.
                    </p>
                    <button
                      type="button"
                      disabled={!paired || !serverOnline}
                      onClick={() => void startCamera()}
                      className="mt-7 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-[#174e39] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {paired
                        ? "Aktifkan kamera & mulai terminal"
                        : "Pairing terminal terlebih dahulu"}
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
                      Frame dikirim hanya setelah RFID valid
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="flex min-h-[560px] flex-col bg-[#fbfcfb] p-5 sm:p-7 lg:min-h-0 lg:overflow-y-auto">
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
                {prompt.icon === "A12" ? (
                  <SchoolLogo size={46} className="rounded-xl ring-0" />
                ) : (
                  prompt.icon
                )}
              </div>
              <p
                className={`mt-5 text-[10px] font-bold uppercase tracking-[0.18em] ${promptStyle.text}`}
              >
                {prompt.eyebrow}
              </p>
              <h2
                className={`mt-2 text-3xl font-bold tracking-[-0.04em] ${promptStyle.text}`}
              >
                {prompt.title}
              </h2>
              <p className={`mt-3 text-sm leading-6 ${promptStyle.text} opacity-80`}>
                {prompt.detail}
              </p>
            </div>

            {pairingState === "unpaired" ? (
              <div className="mt-4 rounded-2xl border border-[#dbe5df] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#56806d]">
                  Pairing langsung ke production
                </p>
                <h3 className="mt-2 text-lg font-bold text-[#17352a]">
                  Masukkan kode terminal
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Buat kode dari Dashboard → Perangkat. Browser akan menerima
                  sesi HttpOnly yang aman; tidak ada secret atau file env lokal.
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    value={pairingCode}
                    onChange={(event) => setPairingCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !pairingPending) {
                        void pairHostedTerminal();
                      }
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="A12-XXXXX-XXXXX"
                    className="h-12 min-w-0 flex-1 rounded-xl border border-[#d7e2dc] bg-white px-4 font-mono text-sm uppercase outline-none focus:border-[#6f9f88]"
                  />
                  <button
                    type="button"
                    disabled={pairingPending}
                    onClick={() => void pairHostedTerminal()}
                    className="h-12 rounded-xl bg-[#176b48] px-5 text-sm font-bold text-white transition hover:bg-[#115b3d] disabled:opacity-50"
                  >
                    {pairingPending ? "Pairing..." : "Hubungkan"}
                  </button>
                </div>
                {pairingError ? (
                  <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                    {pairingError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {paired && !terminalStarted ? (
              <div className="mt-4 rounded-2xl border border-[#dbe5df] bg-white p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#56806d]">
                  Reader RFID
                </p>
                <p className="mt-2 text-sm font-semibold text-[#17352a]">
                  USB keyboard-wedge langsung siap
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Untuk Arduino/reader serial, Chrome atau Edge dapat membaca
                  COM port langsung melalui Web Serial.
                </p>
                <div className="mt-4 flex flex-wrap items-end gap-2">
                  <label className="min-w-[120px] flex-1">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Baud rate
                    </span>
                    <select
                      value={serialBaudRate}
                      onChange={(event) =>
                        setSerialBaudRate(Number(event.target.value))
                      }
                      className="h-10 w-full rounded-xl border border-[#d7e2dc] bg-white px-3 text-xs"
                    >
                      <option value={9600}>9600</option>
                      <option value={19200}>19200</option>
                      <option value={38400}>38400</option>
                      <option value={57600}>57600</option>
                      <option value={115200}>115200</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void connectSerial()}
                    className="h-10 rounded-xl border border-[#cfded6] bg-[#f4f7f5] px-4 text-xs font-bold text-[#355548] transition hover:bg-[#e8f1ec]"
                  >
                    {serialConnected ? "Reader serial terhubung" : "Hubungkan Arduino / Serial"}
                  </button>
                </div>
                <p className="mt-2 text-[10px] leading-4 text-slate-400">
                  Web Serial memerlukan Chrome/Edge desktop. Reader USB mode keyboard tidak perlu pairing COM port.
                </p>
              </div>
            ) : null}

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

            <div className="mt-auto pt-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#dbe5df] bg-white px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Heartbeat production
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#355548]">
                    {lastHeartbeatAt
                      ? new Intl.DateTimeFormat("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        }).format(new Date(lastHeartbeatAt))
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
                Semua API, database, pairing, heartbeat, dan face verification
                berjalan di production. Laptop hanya memberi akses ke kamera dan
                reader RFID fisik melalui browser.
              </p>
            </div>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#dbe5df] bg-white px-5 py-3 text-[10px] text-slate-400 sm:px-7">
          <span>{SCHOOL.systemName} · Terminal Production</span>
          <span>
            {terminalReady
              ? "Terminal siap menerima absensi"
              : paired
                ? "Menunggu kamera dan layanan siap"
                : "Menunggu pairing terminal"}
          </span>
        </footer>
      </div>
    </main>
  );
}
