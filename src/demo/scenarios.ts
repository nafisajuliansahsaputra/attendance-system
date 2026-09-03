import type { ResolvedAttendanceAttempt } from "../domain/attendance/types";

export const demoScenarios = [
  "verified",
  "late",
  "face-mismatch",
  "unknown-card",
  "not-eligible",
  "duplicate",
  "outside-session",
] as const;

export type DemoScenario = (typeof demoScenarios)[number];

const student = {
  id: "student-demo-001",
  name: "Nafisa Juliansah",
  className: "XII RPL 1",
};

const arrivalSession = {
  id: "session-arrival-demo",
  name: "Masuk Sekolah",
  type: "arrival" as const,
  opensAt: "2026-09-02T23:00:00.000Z",
  lateAfter: "2026-09-03T00:00:00.000Z",
  closesAt: "2026-09-03T00:30:00.000Z",
  eligible: true,
};

export function buildDemoAttempt(scenario: DemoScenario, requestId: string): ResolvedAttendanceAttempt {
  const base: ResolvedAttendanceAttempt = {
    requestId,
    institutionId: "institution-demo-001",
    deviceId: "simulator-terminal-01",
    occurredAt: "2026-09-02T23:50:00.000Z",
    card: {
      uid: "A4:B8:32:F1",
      registered: true,
      student,
    },
    face: {
      status: "match",
      score: 0.972,
      modelVersion: "demo-adapter-v1",
    },
    session: arrivalSession,
    duplicate: false,
  };

  switch (scenario) {
    case "verified":
      return base;
    case "late":
      return { ...base, occurredAt: "2026-09-03T00:10:00.000Z" };
    case "face-mismatch":
      return { ...base, face: { status: "mismatch", score: 0.214, modelVersion: "demo-adapter-v1" } };
    case "unknown-card":
      return {
        ...base,
        card: { uid: "FF:FF:FF:FF", registered: false },
        face: { status: "match", score: 0.99, modelVersion: "demo-adapter-v1" },
      };
    case "not-eligible":
      return { ...base, session: { ...arrivalSession, name: "Dhuha Kelas X", type: "dhuha", eligible: false } };
    case "duplicate":
      return { ...base, duplicate: true };
    case "outside-session":
      return { ...base, session: undefined };
  }
}
