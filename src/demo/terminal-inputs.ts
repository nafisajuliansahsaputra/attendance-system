import type {
  FaceVerificationResolution,
  ResolvedAttendanceAttempt,
  SessionResolution,
  StudentIdentity,
} from "@/domain/attendance/types";

export const demoCardIds = ["alya", "bima", "unknown"] as const;
export const demoFaceIds = ["alya", "bima", "no-face", "low-quality"] as const;
export const demoEnvironmentIds = ["arrival-open", "arrival-late", "dhuha-x", "no-session"] as const;

export type DemoCardId = (typeof demoCardIds)[number];
export type DemoFaceId = (typeof demoFaceIds)[number];
export type DemoEnvironmentId = (typeof demoEnvironmentIds)[number];

export interface DemoTerminalInput {
  requestId: string;
  cardId: DemoCardId;
  faceId: DemoFaceId;
  environmentId: DemoEnvironmentId;
  alreadyRecorded: boolean;
}

export const demoStudents: Record<Exclude<DemoCardId, "unknown">, StudentIdentity> = {
  alya: {
    id: "student-demo-alya",
    name: "Alya Pratama",
    className: "X RPL 1",
  },
  bima: {
    id: "student-demo-bima",
    name: "Bima Mahendra",
    className: "XI RPL 1",
  },
};

export const demoCards = [
  {
    id: "alya" as const,
    uid: "DE:MO:10:01",
    label: "Alya Pratama",
    className: "X RPL 1",
    registered: true,
  },
  {
    id: "bima" as const,
    uid: "DE:MO:11:02",
    label: "Bima Mahendra",
    className: "XI RPL 1",
    registered: true,
  },
  {
    id: "unknown" as const,
    uid: "FF:AA:99:00",
    label: "Kartu tidak dikenal",
    className: "UID belum terdaftar",
    registered: false,
  },
] as const;

export const demoFaces = [
  { id: "alya" as const, label: "Alya", detail: "Subjek kamera A" },
  { id: "bima" as const, label: "Bima", detail: "Subjek kamera B" },
  { id: "no-face" as const, label: "Tidak ada wajah", detail: "Frame kosong" },
  { id: "low-quality" as const, label: "Frame buram", detail: "Quality gate gagal" },
] as const;

export const demoEnvironments = [
  {
    id: "arrival-open" as const,
    label: "Masuk · 07:20",
    detail: "Sesi aktif, masih tepat waktu",
  },
  {
    id: "arrival-late" as const,
    label: "Masuk · 08:10",
    detail: "Sesi aktif, melewati batas terlambat",
  },
  {
    id: "dhuha-x" as const,
    label: "Dhuha · Kelas X",
    detail: "Hanya siswa kelas X yang menjadi target",
  },
  {
    id: "no-session" as const,
    label: "Tidak ada sesi",
    detail: "Tidak ada jadwal aktif saat scan",
  },
] as const;

const arrivalSession: SessionResolution = {
  id: "session-demo-arrival",
  name: "Masuk Sekolah",
  type: "arrival",
  opensAt: "2026-09-04T00:00:00.000Z",
  lateAfter: "2026-09-04T01:00:00.000Z",
  closesAt: "2026-09-04T01:30:00.000Z",
  eligible: true,
};

function resolveCard(cardId: DemoCardId) {
  if (cardId === "unknown") {
    return {
      uid: "FF:AA:99:00",
      registered: false,
    } as const;
  }

  return {
    uid: cardId === "alya" ? "DE:MO:10:01" : "DE:MO:11:02",
    registered: true,
    student: demoStudents[cardId],
  } as const;
}

function resolveFace(cardId: DemoCardId, faceId: DemoFaceId): FaceVerificationResolution {
  if (faceId === "no-face") {
    return { status: "no_face", modelVersion: "virtual-camera-adapter-v2" };
  }

  if (faceId === "low-quality") {
    return { status: "low_quality", modelVersion: "virtual-camera-adapter-v2" };
  }

  if (cardId === "unknown") {
    return {
      status: "match",
      score: 0.91,
      modelVersion: "virtual-camera-adapter-v2",
    };
  }

  const matched = cardId === faceId;
  return {
    status: matched ? "match" : "mismatch",
    score: matched ? 0.91 : 0.11,
    modelVersion: "virtual-camera-adapter-v2",
  };
}

function resolveEnvironment(
  environmentId: DemoEnvironmentId,
  cardId: DemoCardId,
): Pick<ResolvedAttendanceAttempt, "occurredAt" | "session"> {
  switch (environmentId) {
    case "arrival-open":
      return {
        occurredAt: "2026-09-04T00:20:00.000Z",
        session: arrivalSession,
      };
    case "arrival-late":
      return {
        occurredAt: "2026-09-04T01:10:00.000Z",
        session: arrivalSession,
      };
    case "dhuha-x":
      return {
        occurredAt: "2026-09-04T02:15:00.000Z",
        session: {
          id: "session-demo-dhuha-x",
          name: "Absensi Dhuha Kelas X",
          type: "dhuha",
          opensAt: "2026-09-04T02:00:00.000Z",
          closesAt: "2026-09-04T02:30:00.000Z",
          eligible: cardId === "alya",
        },
      };
    case "no-session":
      return {
        occurredAt: "2026-09-04T04:00:00.000Z",
        session: undefined,
      };
  }
}

export function buildDemoTerminalAttempt(input: DemoTerminalInput): ResolvedAttendanceAttempt {
  const environment = resolveEnvironment(input.environmentId, input.cardId);

  return {
    requestId: input.requestId,
    institutionId: "institution-demo-001",
    deviceId: "virtual-terminal-01",
    occurredAt: environment.occurredAt,
    card: resolveCard(input.cardId),
    face: resolveFace(input.cardId, input.faceId),
    session: environment.session,
    duplicate: input.alreadyRecorded,
  };
}
