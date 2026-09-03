import type { AttendanceOutcomeCode, FeedbackPattern } from "./types";

const SUCCESS: FeedbackPattern = {
  led: "green",
  tone: "success",
  beep: { count: 1, durationMs: 90, intervalMs: 0 },
};

const FACE_MISMATCH: FeedbackPattern = {
  led: "red",
  tone: "danger",
  beep: { count: 5, durationMs: 65, intervalMs: 70 },
};

const ERROR: FeedbackPattern = {
  led: "red",
  tone: "error",
  beep: { count: 3, durationMs: 120, intervalMs: 180 },
};

const NEUTRAL: FeedbackPattern = {
  led: "amber",
  tone: "neutral",
  beep: { count: 2, durationMs: 80, intervalMs: 240 },
};

export function feedbackFor(code: AttendanceOutcomeCode): FeedbackPattern {
  if (code === "ACCEPTED_ON_TIME" || code === "ACCEPTED_LATE") return SUCCESS;
  if (code === "FACE_MISMATCH") return FACE_MISMATCH;
  if (code === "FACE_SERVICE_ERROR") return ERROR;
  return NEUTRAL;
}
