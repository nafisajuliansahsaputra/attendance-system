from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

MODELS = [
    {
        "name": "face_detection_yunet_2026may.onnx",
        "url": "https://huggingface.co/opencv/opencv_zoo/resolve/main/models/face_detection_yunet/face_detection_yunet_2026may.onnx",
        "sha256": "ebafce4e3c118d6554634be5c27ab333b4c047a9a8c3faf1d7cf93101c22f0f0",
    },
    {
        "name": "face_recognition_sface_2021dec.onnx",
        "url": "https://huggingface.co/opencv/opencv_zoo/resolve/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "sha256": "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79",
    },
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    target_dir = Path(__file__).resolve().parents[1] / "models"
    target_dir.mkdir(parents=True, exist_ok=True)

    for model in MODELS:
        target = target_dir / model["name"]
        if target.exists() and sha256(target) == model["sha256"]:
            print(f"OK {model['name']} already present and verified")
            continue

        temporary = target.with_suffix(target.suffix + ".download")
        temporary.unlink(missing_ok=True)
        print(f"Downloading {model['name']}...")
        urllib.request.urlretrieve(model["url"], temporary)
        actual = sha256(temporary)
        if actual != model["sha256"]:
            temporary.unlink(missing_ok=True)
            print(
                f"SHA256 mismatch for {model['name']}: expected {model['sha256']}, got {actual}",
                file=sys.stderr,
            )
            return 1
        temporary.replace(target)
        print(f"Verified {model['name']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
