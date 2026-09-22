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
const PORTFOLIO_CAMERA_PREVIEW = "data:image/webp;base64,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[... ELLIPSIZATION ...]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";

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
                <div
                  role="img"
                  aria-label="Preview kamera siswa untuk tampilan portfolio"
                  className="h-full min-h-[520px] w-full bg-cover bg-center lg:min-h-0"
                  style={{
                    backgroundImage: `url("${PORTFOLIO_CAMERA_PREVIEW}")`,
                  }}
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
