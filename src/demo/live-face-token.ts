import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface LiveFaceDemoTokenPayload {
  displayName: string;
  embedding: number[];
  modelName: string;
  modelVersion: string;
  issuedAt: number;
  expiresAt: number;
}

const TOKEN_VERSION = "v1";
const TOKEN_TTL_MS = 10 * 60 * 1000;

function keyMaterial(): Buffer {
  const secret = process.env.FACE_SERVICE_SECRET;
  if (!secret || secret.length < 24) {
    throw new Error("LIVE_FACE_DEMO_NOT_CONFIGURED");
  }

  return createHash("sha256")
    .update(`attendance-live-face-demo:${TOKEN_VERSION}:${secret}`)
    .digest();
}

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function createLiveFaceDemoToken(input: {
  displayName: string;
  embedding: number[];
  modelName: string;
  modelVersion: string;
}) {
  const now = Date.now();
  const payload: LiveFaceDemoTokenPayload = {
    displayName: input.displayName,
    embedding: input.embedding,
    modelName: input.modelName,
    modelVersion: input.modelVersion,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
  };

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return {
    token: [TOKEN_VERSION, encode(iv), encode(tag), encode(ciphertext)].join("."),
    expiresAt: new Date(payload.expiresAt).toISOString(),
  };
}

export function readLiveFaceDemoToken(token: string): LiveFaceDemoTokenPayload {
  const [version, ivValue, tagValue, ciphertextValue, ...rest] = token.split(".");
  if (
    version !== TOKEN_VERSION ||
    !ivValue ||
    !tagValue ||
    !ciphertextValue ||
    rest.length > 0
  ) {
    throw new Error("LIVE_FACE_DEMO_TOKEN_INVALID");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), decode(ivValue));
    decipher.setAuthTag(decode(tagValue));
    const plaintext = Buffer.concat([
      decipher.update(decode(ciphertextValue)),
      decipher.final(),
    ]).toString("utf8");
    const payload = JSON.parse(plaintext) as LiveFaceDemoTokenPayload;

    if (
      typeof payload.displayName !== "string" ||
      !Array.isArray(payload.embedding) ||
      payload.embedding.length < 32 ||
      payload.embedding.length > 2048 ||
      !payload.embedding.every((value) => typeof value === "number" && Number.isFinite(value)) ||
      typeof payload.modelName !== "string" ||
      typeof payload.modelVersion !== "string" ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number"
    ) {
      throw new Error("LIVE_FACE_DEMO_TOKEN_INVALID");
    }

    if (Date.now() > payload.expiresAt) {
      throw new Error("LIVE_FACE_DEMO_TOKEN_EXPIRED");
    }

    return payload;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "LIVE_FACE_DEMO_TOKEN_EXPIRED" ||
        error.message === "LIVE_FACE_DEMO_NOT_CONFIGURED")
    ) {
      throw error;
    }
    throw new Error("LIVE_FACE_DEMO_TOKEN_INVALID");
  }
}
