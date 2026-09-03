import { z } from "zod";

const faceServiceConfigSchema = z.object({
  FACE_SERVICE_URL: z.string().url(),
  FACE_SERVICE_SECRET: z.string().min(24),
});

const extractResponseSchema = z.object({
  status: z.enum(["OK", "NO_FACE", "MULTIPLE_FACES", "LOW_QUALITY"]),
  embedding: z.array(z.number()).min(32).max(2048).nullable().optional(),
  embeddingDimensions: z.number().int().min(32).max(2048).nullable().optional(),
  qualityScore: z.number().min(0).max(1).nullable().optional(),
  detectionScore: z.number().min(0).max(1).nullable().optional(),
  modelName: z.string().min(1),
  modelVersion: z.string().min(1),
  templateFingerprint: z.string().regex(/^[0-9a-f]{64}$/).nullable().optional(),
  reason: z.string().nullable().optional(),
  livenessChecked: z.boolean(),
});

const verifyResponseSchema = z.object({
  status: z.enum(["MATCH", "MISMATCH", "NO_FACE", "MULTIPLE_FACES", "LOW_QUALITY"]),
  score: z.number().nullable().optional(),
  threshold: z.number().min(0).max(1),
  qualityScore: z.number().min(0).max(1).nullable().optional(),
  detectionScore: z.number().min(0).max(1).nullable().optional(),
  modelName: z.string().min(1),
  modelVersion: z.string().min(1),
  reason: z.string().nullable().optional(),
  livenessChecked: z.boolean(),
});

export type FaceExtractResult = z.infer<typeof extractResponseSchema>;
export type FaceVerifyResult = z.infer<typeof verifyResponseSchema>;

export class FaceServiceUnavailableError extends Error {
  constructor(message = "Face service is unavailable.") {
    super(message);
    this.name = "FaceServiceUnavailableError";
  }
}

export class FaceServiceRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FaceServiceRequestError";
  }
}

function getFaceServiceConfig() {
  const parsed = faceServiceConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new FaceServiceUnavailableError("Face service is not configured.");
  }
  return {
    url: parsed.data.FACE_SERVICE_URL.replace(/\/$/, ""),
    secret: parsed.data.FACE_SERVICE_SECRET,
  };
}

async function callFaceService<T>(
  path: string,
  payload: Record<string, unknown>,
  parse: (value: unknown) => T,
): Promise<T> {
  const config = getFaceServiceConfig();
  let response: Response;

  try {
    response = await fetch(`${config.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Face-Service-Key": config.secret,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(7_000),
    });
  } catch (error) {
    throw new FaceServiceUnavailableError(
      error instanceof Error ? error.message : "Face service request failed.",
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String((body as { detail?: unknown }).detail ?? "")
        : "";

    if (response.status >= 500) {
      throw new FaceServiceUnavailableError(detail || `Face service HTTP ${response.status}`);
    }

    throw new FaceServiceRequestError(detail || `Face service HTTP ${response.status}`);
  }

  return parse(body);
}

export async function extractFaceEmbedding(imageBase64: string): Promise<FaceExtractResult> {
  return callFaceService(
    "/v1/extract",
    { imageBase64 },
    (value) => extractResponseSchema.parse(value),
  );
}

export async function verifyFaceEmbedding(input: {
  referenceEmbedding: number[];
  imageBase64: string;
  threshold?: number;
}): Promise<FaceVerifyResult> {
  return callFaceService(
    "/v1/verify",
    {
      referenceEmbedding: input.referenceEmbedding,
      imageBase64: input.imageBase64,
      threshold: input.threshold,
    },
    (value) => verifyResponseSchema.parse(value),
  );
}
