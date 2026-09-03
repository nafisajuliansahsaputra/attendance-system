from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

# OpenCV Zoo stores model binaries with Git LFS. Use GitHub's LFS media endpoint
# rather than mirrors that may lag behind the repository. Every binary is pinned
# to the SHA-256 object id published in the OpenCV Zoo LFS pointer.
MODELS = [
    {
        "name": "face_detection_yunet_2026may.onnx",
        "url": "https://media.githubusercontent.com/media/opencv/opencv_zoo/refs/heads/main/models/face_detection_yunet/face_detection_yunet_2026may.onnx",
        "sha256": "ebafce4e3c118d6554634be5c27ab333b4c047a9a8c3faf1d7cf93101c22f0f0",
    },
    {
        "name": "face_recognition_sface_2021dec.onnx",
        "url": "https://media.githubusercontent.com/media/opencv/opencv_zoo/refs/heads/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "sha256": "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79",
    },
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, target: Path) -> None:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "attendance-system-face-service/1.0"},
    )
    with urllib.request.urlopen(request, timeout=90) as response, target.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)


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
        print(f"Downloading {model['name']} from official OpenCV Zoo LFS media...")

        try:
            download(model["url"], temporary)
        except Exception as exc:
            temporary.unlink(missing_ok=True)
            print(f"Download failed for {model['name']}: {exc}", file=sys.stderr)
            return 1

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
