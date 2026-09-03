from __future__ import annotations

import base64
import hashlib
import math
from dataclasses import dataclass
from functools import lru_cache

import cv2 as cv
import numpy as np

from .settings import Settings, load_settings

MODEL_NAME = "opencv-sface"
MODEL_VERSION = "sface-2021dec+yunet-2026may"


class FaceEngineUnavailable(RuntimeError):
    pass


class InvalidImage(ValueError):
    pass


@dataclass(frozen=True)
class FaceExtraction:
    status: str
    embedding: list[float] | None = None
    quality_score: float | None = None
    detection_score: float | None = None
    fingerprint: str | None = None
    reason: str | None = None


class FaceEngine:
    def __init__(self, settings: Settings):
        self.settings = settings
        if not settings.yunet_model.exists() or not settings.sface_model.exists():
            raise FaceEngineUnavailable(
                "Face model files are missing. Run scripts/download_models.py first."
            )

        self.detector = cv.FaceDetectorYN.create(
            str(settings.yunet_model),
            "",
            (320, 320),
            settings.detection_threshold,
            settings.nms_threshold,
            5000,
        )
        self.recognizer = cv.FaceRecognizerSF.create(str(settings.sface_model), "")

    def decode_image(self, image_base64: str) -> np.ndarray:
        payload = image_base64.strip()
        if payload.startswith("data:"):
            marker = payload.find(",")
            if marker < 0:
                raise InvalidImage("Malformed data URL")
            payload = payload[marker + 1 :]

        try:
            raw = base64.b64decode(payload, validate=True)
        except Exception as exc:  # binascii.Error varies by Python version
            raise InvalidImage("Image is not valid base64") from exc

        if not raw or len(raw) > self.settings.max_image_bytes:
            raise InvalidImage("Image payload is empty or exceeds size limit")

        encoded = np.frombuffer(raw, dtype=np.uint8)
        image = cv.imdecode(encoded, cv.IMREAD_COLOR)
        if image is None or image.ndim != 3:
            raise InvalidImage("Image cannot be decoded")

        return image

    def _quality(self, image: np.ndarray, face: np.ndarray) -> tuple[bool, float, str | None]:
        height, width = image.shape[:2]
        x, y, w, h = [int(round(float(value))) for value in face[:4]]
        x = max(0, min(x, width - 1))
        y = max(0, min(y, height - 1))
        w = max(1, min(w, width - x))
        h = max(1, min(h, height - y))

        roi = image[y : y + h, x : x + w]
        if roi.size == 0:
            return False, 0.0, "EMPTY_FACE_REGION"

        detection_score = float(face[14])
        size_score = min(1.0, min(w, h) / float(self.settings.min_face_pixels))
        gray = cv.cvtColor(roi, cv.COLOR_BGR2GRAY)
        blur_variance = float(cv.Laplacian(gray, cv.CV_64F).var())
        blur_score = min(1.0, blur_variance / self.settings.min_blur_variance)
        brightness = float(gray.mean())
        brightness_ok = self.settings.min_brightness <= brightness <= self.settings.max_brightness
        brightness_score = 1.0 if brightness_ok else 0.0
        quality = max(0.0, min(1.0, detection_score, size_score, blur_score, brightness_score))

        if min(w, h) < self.settings.min_face_pixels:
            return False, quality, "FACE_TOO_SMALL"
        if blur_variance < self.settings.min_blur_variance:
            return False, quality, "IMAGE_TOO_BLURRY"
        if not brightness_ok:
            return False, quality, "IMAGE_BRIGHTNESS_OUT_OF_RANGE"

        return True, quality, None

    def extract(self, image_base64: str) -> FaceExtraction:
        image = self.decode_image(image_base64)
        height, width = image.shape[:2]
        self.detector.setInputSize((width, height))
        _, faces = self.detector.detect(image)

        if faces is None or len(faces) == 0:
            return FaceExtraction(status="NO_FACE", reason="No face detected")
        if len(faces) != 1:
            return FaceExtraction(
                status="MULTIPLE_FACES",
                reason="Exactly one face is required",
            )

        face = faces[0]
        detection_score = float(face[14])
        quality_ok, quality_score, reason = self._quality(image, face)
        if not quality_ok:
            return FaceExtraction(
                status="LOW_QUALITY",
                quality_score=quality_score,
                detection_score=detection_score,
                reason=reason,
            )

        aligned = self.recognizer.alignCrop(image, face)
        features = self.recognizer.feature(aligned)
        flat = np.asarray(features, dtype=np.float32).reshape(-1)
        if flat.size < 32 or not np.isfinite(flat).all():
            raise FaceEngineUnavailable("Recognizer returned an invalid embedding")

        fingerprint = hashlib.sha256(flat.tobytes()).hexdigest()
        return FaceExtraction(
            status="OK",
            embedding=[float(value) for value in flat],
            quality_score=quality_score,
            detection_score=detection_score,
            fingerprint=fingerprint,
        )

    def verify(
        self,
        reference_embedding: list[float],
        image_base64: str,
        threshold: float | None = None,
    ) -> tuple[FaceExtraction, float | None, float]:
        extraction = self.extract(image_base64)
        effective_threshold = threshold or self.settings.cosine_threshold
        if extraction.status != "OK" or extraction.embedding is None:
            return extraction, None, effective_threshold

        reference = np.asarray(reference_embedding, dtype=np.float32).reshape(1, -1)
        sample = np.asarray(extraction.embedding, dtype=np.float32).reshape(1, -1)
        if reference.shape != sample.shape or not np.isfinite(reference).all():
            raise InvalidImage("Reference embedding shape is incompatible with active model")

        score = float(
            self.recognizer.match(reference, sample, cv.FaceRecognizerSF_FR_COSINE)
        )
        if not math.isfinite(score):
            raise FaceEngineUnavailable("Recognizer returned a non-finite score")

        status = "MATCH" if score >= effective_threshold else "MISMATCH"
        return (
            FaceExtraction(
                status=status,
                embedding=extraction.embedding,
                quality_score=extraction.quality_score,
                detection_score=extraction.detection_score,
                fingerprint=extraction.fingerprint,
            ),
            score,
            effective_threshold,
        )


@lru_cache(maxsize=1)
def get_engine() -> FaceEngine:
    return FaceEngine(load_settings())
