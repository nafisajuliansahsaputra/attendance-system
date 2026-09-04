from __future__ import annotations

import hashlib
import sys
import time
import urllib.request
from pathlib import Path

# Model binaries are pinned to immutable OpenCV Zoo commits instead of the
# moving `main` branch. Every download is checked against both the Git LFS
# object size and SHA-256 published by the upstream pointer.
MODELS = [
    {
        "name": "face_detection_yunet_2026may.onnx",
        "urls": [
            "https://media.githubusercontent.com/media/opencv/opencv_zoo/26cc381e4d2594bb9f47a26eb8fd96c94a13660d/models/face_detection_yunet/face_detection_yunet_2026may.onnx",
            "https://github.com/opencv/opencv_zoo/raw/26cc381e4d2594bb9f47a26eb8fd96c94a13660d/models/face_detection_yunet/face_detection_yunet_2026may.onnx",
        ],
        "sha256": "ebafce4e3c118d6554634be5c27ab333b4c047a9a8c3faf1d7cf93101c22f0f0",
        "size": 229738,
    },
    {
        "name": "face_recognition_sface_2021dec.onnx",
        "urls": [
            "https://media.githubusercontent.com/media/opencv/opencv_zoo/ba91a3b91d00d76e86540d4013f944bd6b514e39/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
            "https://github.com/opencv/opencv_zoo/raw/ba91a3b91d00d76e86540d4013f944bd6b514e39/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        ],
        "sha256": "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79",
        "size": 38696353,
    },
]

MAX_ATTEMPTS_PER_URL = 3


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, target: Path) -> None:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "attendance-system-face-service/1.0",
            "Accept": "application/octet-stream",
        },
    )
    with urllib.request.urlopen(request, timeout=90) as response, target.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)


def verify(path: Path, model: dict[str, object]) -> tuple[bool, str]:
    expected_size = int(model["size"])
    actual_size = path.stat().st_size
    if actual_size != expected_size:
        return False, f"size mismatch: expected {expected_size}, got {actual_size}"

    expected_hash = str(model["sha256"])
    actual_hash = sha256(path)
    if actual_hash != expected_hash:
        return False, f"SHA256 mismatch: expected {expected_hash}, got {actual_hash}"

    return True, "verified"


def download_verified(model: dict[str, object], temporary: Path) -> tuple[bool, str]:
    errors: list[str] = []

    for url in model["urls"]:
        for attempt in range(1, MAX_ATTEMPTS_PER_URL + 1):
            temporary.unlink(missing_ok=True)
            try:
                print(
                    f"Downloading {model['name']} (source {url}, attempt {attempt}/{MAX_ATTEMPTS_PER_URL})...",
                    flush=True,
                )
                download(str(url), temporary)
                valid, detail = verify(temporary, model)
                if valid:
                    return True, detail
                errors.append(f"{url} attempt {attempt}: {detail}")
            except Exception as exc:
                errors.append(f"{url} attempt {attempt}: {exc}")
            finally:
                if errors and temporary.exists():
                    valid, _ = verify(temporary, model)
                    if not valid:
                        temporary.unlink(missing_ok=True)

            if attempt < MAX_ATTEMPTS_PER_URL:
                time.sleep(attempt * 2)

    return False, "; ".join(errors)


def main() -> int:
    target_dir = Path(__file__).resolve().parents[1] / "models"
    target_dir.mkdir(parents=True, exist_ok=True)

    for model in MODELS:
        target = target_dir / str(model["name"])
        if target.exists():
            valid, _ = verify(target, model)
            if valid:
                print(f"OK {model['name']} already present and verified")
                continue

        temporary = target.with_suffix(target.suffix + ".download")
        success, detail = download_verified(model, temporary)
        if not success:
            temporary.unlink(missing_ok=True)
            print(f"Download failed for {model['name']}: {detail}", file=sys.stderr)
            return 1

        temporary.replace(target)
        print(f"Verified {model['name']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
