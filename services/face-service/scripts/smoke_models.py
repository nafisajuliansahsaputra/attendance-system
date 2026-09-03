from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.engine import FaceEngine
from app.settings import load_settings


def main() -> int:
    settings = load_settings()
    engine = FaceEngine(settings)

    if engine.detector is None:
        raise RuntimeError("YuNet detector did not initialize")
    if engine.recognizer is None:
        raise RuntimeError("SFace recognizer did not initialize")

    # Execute a real YuNet forward pass. A blank frame should produce no valid
    # face, but the important release check is that OpenCV can execute the ONNX
    # graph rather than merely parse/construct it.
    detector_frame = np.zeros((320, 320, 3), dtype=np.uint8)
    engine.detector.setInputSize((320, 320))
    _, faces = engine.detector.detect(detector_frame)
    if faces is not None and faces.ndim != 2:
        raise RuntimeError("YuNet returned an unexpected detection tensor")

    # Execute a real SFace feature forward pass on a correctly shaped aligned
    # crop. This is not a biometric accuracy test; it proves the pinned model is
    # executable by the pinned OpenCV runtime used by V1.
    aligned_face = np.full((112, 112, 3), 127, dtype=np.uint8)
    feature = engine.recognizer.feature(aligned_face)
    if feature is None or feature.size < 32 or not np.isfinite(feature).all():
        raise RuntimeError("SFace did not produce a valid feature vector")

    print(
        "Face model inference smoke passed:",
        settings.yunet_model.name,
        settings.sface_model.name,
        f"sface_dimensions={feature.size}",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
