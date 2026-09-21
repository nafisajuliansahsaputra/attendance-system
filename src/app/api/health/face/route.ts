export const dynamic = "force-dynamic";

type FaceHealthPayload = {
  status?: string;
  modelName?: string;
  modelVersion?: string;
  detectorModelPresent?: boolean;
  recognizerModelPresent?: boolean;
  livenessImplemented?: boolean;
};

export async function GET() {
  const faceServiceUrl = process.env.FACE_SERVICE_URL?.trim();

  if (!faceServiceUrl) {
    return Response.json(
      {
        status: "degraded",
        reachable: false,
        reason: "FACE_SERVICE_URL_NOT_CONFIGURED",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const response = await fetch(`${faceServiceUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    const payload = (await response.json().catch(() => null)) as FaceHealthPayload | null;

    if (!response.ok || !payload) {
      return Response.json(
        {
          status: "degraded",
          reachable: true,
          upstreamStatus: response.status,
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const ready =
      payload.status === "ok" &&
      payload.detectorModelPresent === true &&
      payload.recognizerModelPresent === true;

    return Response.json(
      {
        status: ready ? "ok" : "degraded",
        reachable: true,
        modelName: payload.modelName ?? null,
        modelVersion: payload.modelVersion ?? null,
        detectorModelPresent: payload.detectorModelPresent ?? false,
        recognizerModelPresent: payload.recognizerModelPresent ?? false,
        livenessImplemented: payload.livenessImplemented ?? false,
      },
      {
        status: ready ? 200 : 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        status: "degraded",
        reachable: false,
        reason: error instanceof Error ? error.message : "FACE_SERVICE_UNREACHABLE",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
