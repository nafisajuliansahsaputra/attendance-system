from __future__ import annotations

import hmac

from fastapi import Depends, FastAPI, Header, HTTPException, status

from .engine import (
    MODEL_NAME,
    MODEL_VERSION,
    FaceEngineUnavailable,
    InvalidImage,
    get_engine,
)
from .schemas import (
    ExtractRequest,
    ExtractResponse,
    HealthResponse,
    VerifyRequest,
    VerifyResponse,
)
from .settings import load_settings

app = FastAPI(
    title="Attendance Face Verification Service",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def require_service_key(x_face_service_key: str | None = Header(default=None)) -> None:
    configured = load_settings().service_secret
    if not configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FACE_SERVICE_SECRET_NOT_CONFIGURED",
        )
    if not x_face_service_key or not hmac.compare_digest(x_face_service_key, configured):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="FACE_SERVICE_NOT_AUTHORIZED",
        )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = load_settings()
    detector_present = settings.yunet_model.exists()
    recognizer_present = settings.sface_model.exists()
    return HealthResponse(
        status="ok" if detector_present and recognizer_present else "degraded",
        modelName=MODEL_NAME,
        modelVersion=MODEL_VERSION,
        detectorModelPresent=detector_present,
        recognizerModelPresent=recognizer_present,
        livenessImplemented=False,
    )


@app.post(
    "/v1/extract",
    response_model=ExtractResponse,
    dependencies=[Depends(require_service_key)],
)
def extract(request: ExtractRequest) -> ExtractResponse:
    try:
        result = get_engine().extract(request.imageBase64)
    except InvalidImage as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FaceEngineUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return ExtractResponse(
        status=result.status,
        embedding=result.embedding,
        embeddingDimensions=len(result.embedding) if result.embedding is not None else None,
        qualityScore=result.quality_score,
        detectionScore=result.detection_score,
        modelName=MODEL_NAME,
        modelVersion=MODEL_VERSION,
        templateFingerprint=result.fingerprint,
        reason=result.reason,
        livenessChecked=False,
    )


@app.post(
    "/v1/verify",
    response_model=VerifyResponse,
    dependencies=[Depends(require_service_key)],
)
def verify(request: VerifyRequest) -> VerifyResponse:
    try:
        result, score, threshold = get_engine().verify(
            request.referenceEmbedding,
            request.imageBase64,
            request.threshold,
        )
    except InvalidImage as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FaceEngineUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return VerifyResponse(
        status=result.status,
        score=score,
        threshold=threshold,
        qualityScore=result.quality_score,
        detectionScore=result.detection_score,
        modelName=MODEL_NAME,
        modelVersion=MODEL_VERSION,
        reason=result.reason,
        livenessChecked=False,
    )
