# Local Face Verification Service

This service is the biometric boundary for Attendance System. It runs locally/private-side and does not send student face samples to a third-party recognition API.

## Models

- OpenCV YuNet `face_detection_yunet_2026may.onnx` for face detection.
- OpenCV SFace `face_recognition_sface_2021dec.onnx` for feature extraction and 1:1 comparison.
- Default cosine threshold: `0.363`, configurable with `SFACE_COSINE_THRESHOLD`.

Model binaries are not committed. Download and SHA-256 verify them with:

```bash
python scripts/download_models.py
```

The downloader pins the expected SHA-256 for both ONNX files and aborts if downloaded bytes do not match.

## Local setup

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
python scripts/download_models.py
```

Configure at minimum:

```text
FACE_SERVICE_SECRET=<random server-to-server secret>
FACE_MODEL_DIR=./models
```

Run:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The service is intended to sit behind the Attendance System server or private network. `/v1/extract` and `/v1/verify` require `X-Face-Service-Key`. `/health` is non-sensitive and does not load the models.

## Privacy behavior

- Input JPEG bytes are decoded and processed in memory.
- This service does not persist the submitted image.
- Enrollment returns an embedding/template fingerprint; the main application stores the embedding and model metadata, not the raw enrollment photo.
- Verification returns only result/score/quality metadata.
- Audit logs must never include base64 image data.

## Quality and liveness

The current service performs basic single-face, face-size, blur, brightness, and detector-confidence checks. **It does not implement liveness/anti-spoofing and must not be described as doing so.** A production school rollout should add an evaluated liveness policy before relying on the system against photo/video presentation attacks.

## Model provenance note

YuNet and SFace are sourced from OpenCV Zoo. Repository/model-directory licensing should be reviewed again before a commercial deployment, especially SFace training-data/model provenance. This project currently treats them as an explicit replaceable inference boundary rather than coupling attendance logic to a specific biometric vendor/model.
