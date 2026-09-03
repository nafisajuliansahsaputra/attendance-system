# V1 Testing Runbook

This is the operator runbook for testing the implemented Attendance System V1 locally after the codebase quality gates are green.

## 1. What V1 is expected to prove

V1 is ready to exercise the complete software path:

```text
RFID/card request
→ authenticated device
→ server-side RFID owner resolution
→ schedule/session/eligibility resolution
→ short-lived verification transaction
→ camera image
→ local YuNet + SFace 1:1 verification
→ canonical attendance decision
→ atomic Supabase persistence
→ LED/buzzer feedback response
→ homeroom reconciliation
→ class report/export
```

The public `/terminal` recruiter simulator remains an isolated deterministic adapter. Real biometric testing uses the protected staff enrollment page plus Device API, not simulator scenario buttons.

## 2. Known security limitation before testing

**Liveness / anti-spoofing is not implemented in V1.**

V1 verifies facial similarity and applies image-quality checks. It must not be treated as resistant to printed-photo or replay-video attacks. Test face matching first; presentation-attack resistance is a separate future hardening project.

## 3. Prerequisites

- Node.js 22+
- npm
- Python 3.12
- a browser with camera permission
- access to the dedicated Attendance System Supabase project
- root project environment values:
  - `SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `FACE_SERVICE_URL`
  - `FACE_SERVICE_SECRET`
- a private random `FACE_SERVICE_SECRET`; the same value must be used by Next.js and the Python service.

Never use the Spall Spill project credentials.

## 4. Prepare the web application

At repository root:

```bash
npm ci
```

Copy `.env.example` to `.env.local` and fill the Attendance System values. Do not commit `.env.local`.

Before starting the UI, verify:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## 5. Prepare the face service

From `services/face-service`:

```bash
python -m venv .venv
```

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python scripts\download_models.py
$env:FACE_SERVICE_SECRET = "the-same-secret-used-by-nextjs"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### macOS/Linux

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
python scripts/download_models.py
export FACE_SERVICE_SECRET="the-same-secret-used-by-nextjs"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Check:

```text
http://127.0.0.1:8000/health
```

Expected:

- `status: ok`
- detector model present
- recognizer model present
- `livenessImplemented: false`

## 6. Start the web application

At repository root:

```bash
npm run dev
```

Open:

```text
http://localhost:3000/api/health
```

Expected readiness:

- `supabaseConfigured: true`
- `faceServiceConfigured: true`
- `livenessImplemented: false`

## 7. Create the first staff account

There is intentionally no public sign-up.

For the very first application account, use the secure bootstrap documented in `docs/11-STAFF-PROVISIONING.md`. The first profile must be `SYSTEM_ADMIN`.

After an admin exists, additional staff can be provisioned from `/dashboard/staff`.

Do not commit passwords or secret keys.

## 8. Admin configuration test order

Login as System Admin and test in this order:

1. `/dashboard/students`
   - verify fictional/loaded students;
   - assign or replace an RFID;
   - test historical class transfer if desired.
2. `/dashboard/students/<student-id>/face`
   - allow camera access;
   - capture one clear frontal face;
   - enroll;
   - confirm face profile becomes ACTIVE with OpenCV model metadata.
3. `/dashboard/schedules`
   - confirm school arrival/Dhuha/Dzuhur/Ashar/departure templates;
   - create/inspect a session covering the test time and target student/class;
   - avoid creating two unresolved overlapping sessions for the same student/time.
4. `/dashboard/devices`
   - ensure a device exists and is ACTIVE;
   - provision/rotate its secret with the CLI workflow;
   - store the plaintext secret only in the simulator/bridge/device environment.
5. `/dashboard/staff`
   - provision a Homeroom Teacher if testing teacher-scoped workflows.

## 9. Device API test sequence

The physical/simulator client uses these headers:

```text
Authorization: Bearer <device-secret>
x-device-id: <device-uuid>
x-protocol-version: v1
Content-Type: application/json
```

### 9.1 Heartbeat

```text
POST /api/device/v1/heartbeat
```

Expected: authenticated device identity and server time.

### 9.2 RFID stage

```text
POST /api/device/v1/card-scan
```

Body shape:

```json
{
  "requestId": "unique-request-id-at-least-8-chars",
  "rfidUid": "RFID-UID",
  "occurredAt": "2026-09-03T14:00:00+07:00"
}
```

For a face-required eligible session, expected response:

```text
CAPTURE_FACE
+ verificationTransactionId
+ expiresAt
```

Other valid stage responses include unknown card, no active session, not eligible, duplicate attendance, or missing face profile.

### 9.3 Face stage

Capture a JPEG frame and submit:

```text
POST /api/device/v1/face-verify
```

Body:

```json
{
  "requestId": "same-request-id-as-card-scan",
  "verificationTransactionId": "uuid-from-card-stage",
  "imageBase64": "base64-jpeg-without-data-url-prefix"
}
```

Expected successful owner match:

- `ACCEPTED_ON_TIME` or `ACCEPTED_LATE`
- `accepted: true`
- green LED feedback
- one beep
- attendance record ID.

Expected different-person mismatch:

- `FACE_MISMATCH`
- `accepted: false`
- red LED feedback
- rapid repeated beep
- no attendance record.

Expected poor capture:

- `FACE_NOT_DETECTED` or `FACE_LOW_QUALITY`
- retryable while transaction is active
- not treated as proxy-attendance mismatch.

## 10. Replay/idempotency test

After a successful face response, send the same face-verification request again with the same request/transaction IDs.

Expected:

- same canonical outcome;
- `replayed: true`;
- no second attendance record.

This protects physical devices when the network drops after the server committed but before the device received the response.

## 11. Homeroom test

Open `/teacher` with an authorized Homeroom Teacher or System Admin.

Verify:

- correct historical class roster;
- present/late/pending states;
- a valid machine arrival cannot be changed to Sakit/Izin/Alpa;
- a missing required arrival can be confirmed as Sakit/Izin/Alpa;
- notes/audit history persist.

## 12. Reporting test

Open `/teacher/reports`.

Verify:

- 7-day/current-month/semester/academic-year/custom periods;
- future school dates are not counted as pending;
- per-student H/T/S/I/A/pending totals;
- session participation separately shows Dhuha/Dzuhur/Ashar/activity data;
- CSV export opens correctly in Excel;
- Print view can Save as PDF.

Prayer/activity percentage is intentionally not calculated until the Sakit/Izin denominator policy is formally decided.

## 13. Recruiter simulator test

Open `/terminal` without login.

Verify deterministic scenarios still preserve the original feedback contract:

- success → green + one beep;
- face mismatch → red + rapid repeated beep;
- unknown/not eligible/duplicate/no session do not create canonical attendance.

The public simulator remains ephemeral by design and must not contaminate shared attendance records.

## 14. What counts as V1 test pass

The user test passes when all of these are observed:

- staff login and role boundaries work;
- admin can manage students/RFID/class history/schedules/devices/staff;
- browser face enrollment produces a usable ACTIVE face profile;
- device heartbeat authenticates;
- RFID resolves the intended student/session server-side;
- correct face creates exactly one canonical attendance;
- different face creates zero canonical attendance and produces mismatch feedback;
- retry does not duplicate attendance;
- teacher absence confirmation obeys machine-truth guardrails;
- reports and exports reflect the canonical data;
- raw face images are not present in Supabase tables/audit payloads;
- liveness remains explicitly reported as not implemented.

## 15. If something fails

Capture:

- page/endpoint being tested;
- exact response code/message;
- relevant browser console/server log;
- whether `/api/health` and face `/health` are ready;
- the step number from this runbook.

Do **not** send or commit `SUPABASE_SECRET_KEY`, staff passwords, device secrets, or biometric embeddings. Redact secrets before sharing logs/screenshots.
