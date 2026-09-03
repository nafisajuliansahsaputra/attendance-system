from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ExtractRequest(BaseModel):
    imageBase64: str = Field(min_length=16)


class ExtractResponse(BaseModel):
    status: Literal["OK", "NO_FACE", "MULTIPLE_FACES", "LOW_QUALITY"]
    embedding: list[float] | None = None
    embeddingDimensions: int | None = None
    qualityScore: float | None = None
    detectionScore: float | None = None
    modelName: str
    modelVersion: str
    templateFingerprint: str | None = None
    reason: str | None = None
    livenessChecked: bool = False


class VerifyRequest(BaseModel):
    referenceEmbedding: list[float] = Field(min_length=32, max_length=2048)
    imageBase64: str = Field(min_length=16)
    threshold: float | None = None

    @field_validator("threshold")
    @classmethod
    def validate_threshold(cls, value: float | None) -> float | None:
        if value is not None and not 0.0 < value < 1.0:
            raise ValueError("threshold must be between 0 and 1")
        return value


class VerifyResponse(BaseModel):
    status: Literal["MATCH", "MISMATCH", "NO_FACE", "MULTIPLE_FACES", "LOW_QUALITY"]
    score: float | None = None
    threshold: float
    qualityScore: float | None = None
    detectionScore: float | None = None
    modelName: str
    modelVersion: str
    reason: str | None = None
    livenessChecked: bool = False


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    modelName: str
    modelVersion: str
    detectorModelPresent: bool
    recognizerModelPresent: bool
    livenessImplemented: bool = False
