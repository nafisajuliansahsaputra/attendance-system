import { describe, expect, it } from "vitest";
import { mapFaceServiceStatus } from "./face-stage";

describe("mapFaceServiceStatus", () => {
  it("maps match and mismatch with score", () => {
    expect(
      mapFaceServiceStatus({ status: "MATCH", score: 0.8, modelVersion: "sface-v1" }),
    ).toEqual({ status: "match", score: 0.8, modelVersion: "sface-v1" });
    expect(
      mapFaceServiceStatus({ status: "MISMATCH", score: 0.1, modelVersion: "sface-v1" }),
    ).toEqual({ status: "mismatch", score: 0.1, modelVersion: "sface-v1" });
  });

  it("keeps no-face distinct from capture quality failure", () => {
    expect(
      mapFaceServiceStatus({ status: "NO_FACE", modelVersion: "sface-v1" }),
    ).toEqual({ status: "no_face", modelVersion: "sface-v1" });
    expect(
      mapFaceServiceStatus({ status: "MULTIPLE_FACES", modelVersion: "sface-v1" }),
    ).toEqual({ status: "low_quality", modelVersion: "sface-v1" });
    expect(
      mapFaceServiceStatus({ status: "LOW_QUALITY", modelVersion: "sface-v1" }),
    ).toEqual({ status: "low_quality", modelVersion: "sface-v1" });
  });
});
