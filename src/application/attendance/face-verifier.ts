import type {
  FaceVerificationResolution,
  StudentIdentity,
} from "../../domain/attendance/types";
import type { FaceProfileReference } from "./context-resolver";

export interface FaceVerificationRequest {
  requestId: string;
  student: StudentIdentity;
  profile?: FaceProfileReference;
  sampleReference?: string;
}

export interface FaceVerifier {
  verify(request: FaceVerificationRequest): Promise<FaceVerificationResolution>;
}
