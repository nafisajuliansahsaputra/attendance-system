import { describe, expect, it } from "vitest";
import { parseDeviceVerificationPayload } from "./supabase-face-stage";

describe("parseDeviceVerificationPayload", () => {
  const base = {
    transactionId: "11111111-1111-4111-8111-111111111111",
    institutionId: "22222222-2222-4222-8222-222222222222",
    deviceId: "33333333-3333-4333-8333-333333333333",
    requestId: "request-12345678",
    rfidUid: "AA:BB:CC:DD",
    occurredAt: "2026-09-03T00:00:00+00:00",
    expiresAt: "2026-09-03T00:02:00+00:00",
    student: {
      id: "44444444-4444-4444-8444-444444444444",
      name: "Siswa Demo",
      className: "X RPL 1",
    },
    session: {
      id: "55555555-5555-4555-8555-555555555555",
      name: "Masuk Sekolah",
      type: "SCHOOL_ARRIVAL",
      opensAt: "2026-09-02T23:00:00+00:00",
      lateAfter: "2026-09-03T00:00:00+00:00",
      closesAt: "2026-09-03T00:30:00+00:00",
      eligible: true,
    },
    faceProfile: {
      id: "66666666-6666-4666-8666-666666666666",
      modelName: "opencv-sface",
      modelVersion: "sface-2021dec+yunet-2026may",
      embedding: Array.from({ length: 128 }, () => 0.01),
      embeddingDimensions: 128,
      templateFingerprint: "a".repeat(64),
    },
  };

  it("maps canonical database session type to domain type", () => {
    const parsed = parseDeviceVerificationPayload(base);
    expect(parsed.session.type).toBe("arrival");
    expect(parsed.faceProfile.embedding).toHaveLength(128);
  });

  it("fails closed when embedding dimensions disagree", () => {
    expect(() =>
      parseDeviceVerificationPayload({
        ...base,
        faceProfile: { ...base.faceProfile, embeddingDimensions: 127 },
      }),
    ).toThrow("FACE_TEMPLATE_DIMENSION_MISMATCH");
  });
});
