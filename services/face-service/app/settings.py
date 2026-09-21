from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    model_dir: Path
    yunet_model: Path
    sface_model: Path
    service_secret: str
    cosine_threshold: float
    detection_threshold: float
    nms_threshold: float
    max_image_bytes: int
    min_face_pixels: int
    min_blur_variance: float
    min_brightness: float
    max_brightness: float


def load_settings() -> Settings:
    default_model_dir = Path(__file__).resolve().parents[1] / "models"
    model_dir = Path(os.getenv("FACE_MODEL_DIR", str(default_model_dir))).resolve()
    threshold = float(os.getenv("SFACE_COSINE_THRESHOLD", "0.363"))
    if not 0.0 < threshold < 1.0:
        raise ValueError("SFACE_COSINE_THRESHOLD must be between 0 and 1")

    return Settings(
        model_dir=model_dir,
        yunet_model=model_dir / "face_detection_yunet_2026may.onnx",
        sface_model=model_dir / "face_recognition_sface_2021dec.onnx",
        service_secret=os.getenv("FACE_SERVICE_SECRET", ""),
        cosine_threshold=threshold,
        detection_threshold=float(os.getenv("FACE_DETECTION_THRESHOLD", "0.85")),
        nms_threshold=float(os.getenv("FACE_NMS_THRESHOLD", "0.3")),
        max_image_bytes=int(os.getenv("FACE_MAX_IMAGE_BYTES", str(2 * 1024 * 1024))),
        min_face_pixels=int(os.getenv("FACE_MIN_FACE_PIXELS", "80")),
        min_blur_variance=float(os.getenv("FACE_MIN_BLUR_VARIANCE", "80")),
        min_brightness=float(os.getenv("FACE_MIN_BRIGHTNESS", "40")),
        max_brightness=float(os.getenv("FACE_MAX_BRIGHTNESS", "220")),
    )
