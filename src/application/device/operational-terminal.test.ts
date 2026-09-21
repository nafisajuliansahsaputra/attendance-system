import { describe, expect, it } from "vitest";
import {
  isAcceptedAttendanceCode,
  isRetryableFaceCode,
  operationalTerminalMessage,
} from "./operational-terminal";

describe("operational terminal display mapping", () => {
  it("maps accepted attendance to a success result", () => {
    expect(operationalTerminalMessage("ACCEPTED_ON_TIME")).toEqual({
      title: "Absensi berhasil",
      detail: "Kehadiran tercatat tepat waktu.",
      tone: "success",
    });
    expect(isAcceptedAttendanceCode("ACCEPTED_LATE")).toBe(true);
  });

  it("marks only recoverable face capture states as retryable", () => {
    expect(isRetryableFaceCode("FACE_NOT_DETECTED")).toBe(true);
    expect(isRetryableFaceCode("FACE_LOW_QUALITY")).toBe(true);
    expect(isRetryableFaceCode("FACE_MISMATCH")).toBe(false);
  });

  it("maps an unknown card to an operator-safe warning", () => {
    expect(operationalTerminalMessage("UNKNOWN_CARD").tone).toBe("warning");
  });
});
