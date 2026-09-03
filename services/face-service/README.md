# Local Face Verification Service

Private biometric inference boundary for Attendance System V1. It performs face processing locally/server-side instead of sending student samples to a third-party recognition API.

## V1 behavior

- OpenCV YuNet detects exactly one face.
- Quality gates reject no-face, multiple-face, very small, blurry, overly dark, or overly bright samples.
- OpenCV SFace extracts a template for enrollment and performs 1:1 cosine verification against the RFID owner's enrolled template.
- Incoming image bytes live in request/process memory only; the service does not persist raw face images.
- V1 explicitly reports `livenessChecked=false`. Anti-spoof/presentation-attack detection is not implemented.

## Pinned models

- `face_detection_yunet_2026may.onnx`
- `face_recognition_sface_2021dec.onnx`

The binaries are Git-ignored. `scripts/download_models.py` downloads them from the official OpenCV Zoo Git LFS media endpoint and verifies the SHA-256 object IDs published in OpenCV Zoo before installing them.

CI also downloads, verifies, and loads both models through OpenCV so stale URLs or incompatible model files fail the build.

## Local setup

From `services/face-service`:

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python scripts\download_models.py
$env:FACE_SERVICE_SECRET = "replace-with-a-long-random-secret"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

macOS/Linux:

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/download_models.py
export FACE_SERVICE_SECRET="replace-with-a-long-random-secret"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Use the same secret in the root Next.js `.env.local`:

```env
FACE_SERVICE_URL=http://127.0.0.1:8000
FACE_SERVICE_SECRET=replace-with-a-long-random-secret
```

Optional tuning variables are documented in `services/face-service/.env.example`.

## Health

```text
GET http://127.0.0.1:8000/health
```

Ready state reports both model files present plus model/version metadata. The health endpoint does not expose templates, samples, or service secrets.

## Protected API

- `POST /v1/extract` — returns an enrollment embedding/template fingerprint after quality checks.
- `POST /v1/verify` — performs 1:1 comparison against a supplied reference embedding.

Both require `X-Face-Service-Key` matching `FACE_SERVICE_SECRET`.

## Similarity threshold

V1 defaults to SFace cosine threshold `0.363`, configurable with `SFACE_COSINE_THRESHOLD`. This is a baseline operating point, not a claim of school/camera-specific calibration. High-assurance deployment should calibrate the threshold with consented validation samples from the actual camera, lighting, and user population.

## Privacy and security boundary

- raw enrollment/verification images are not stored by the face service or canonical attendance database;
- Supabase stores embedding + fingerprint + model/version/quality metadata;
- audit/device payloads must never include image base64;
- biometric embeddings are server-only and not exposed to browser users;
- model files are replaceable infrastructure, not attendance business logic.

## Known V1 limitation

No liveness/anti-spoof mechanism exists yet. V1 verifies facial similarity but must **not** be described as resistant to printed-photo or replay-video presentation attacks. That is a separate future security layer, not a hidden claim of the current system.
