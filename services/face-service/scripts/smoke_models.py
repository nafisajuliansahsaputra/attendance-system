from __future__ import annotations

import sys
from pathlib import Path

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

    print(
        "Face models loaded successfully:",
        settings.yunet_model.name,
        settings.sface_model.name,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
