import type {
  FaceVerificationResolution,
} from "../domain/attendance/types";
import type {
  FaceVerificationRequest,
  FaceVerifier,
} from "../application/attendance/face-verifier";

export type DemoFaceMode = "match" | "mismatch" | "error";

export class DeterministicDemoFaceVerifier implements FaceVerifier {
  constructor(private readonly mode: DemoFaceMode) {}

  async verify(
    request: FaceVerificationRequest,
  ): Promise<FaceVerificationResolution> {
    if (!request.profile) {
      return {
        status: "error",
        modelVersion: "demo-no-profile",
      };
    }

    switch (this.mode) {
      case "match":
        return {
          status: "match",
          score: 0.972,
          modelVersion: `${request.profile.modelName}:${request.profile.modelVersion}`,
        };
      case "mismatch":
        return {
          status: "mismatch",
          score: 0.214,
          modelVersion: `${request.profile.modelName}:${request.profile.modelVersion}`,
        };
      case "error":
        return {
          status: "error",
          modelVersion: `${request.profile.modelName}:${request.profile.modelVersion}`,
        };
    }
  }
}
