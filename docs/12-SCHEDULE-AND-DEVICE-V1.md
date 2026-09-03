# Schedule Materialization & Device API V1

**Status:** V1 implemented / ready for user testing  
**Last updated:** 2026-09-03

This document records the concrete schedule and physical-device contract implemented by V1. It complements `05-DEVICE-PROTOCOL-AND-SIMULATOR.md`.

---

## 1. Schedule materialization

Configuration lives in reusable `attendance_schedule_rules`; runtime attendance uses dated `attendance_session_occurrences` plus `session_participants` snapshots.

Core functions:

```text
materialize_attendance_schedule_range(institution_id, start_date, end_date)
materialize_attendance_schedule_at(institution_id, occurred_at)
```

Materialization is invoked from device scans, homeroom reads, and reports. This makes a zero-scan required day visible as an attendance obligation instead of disappearing from the dataset.

### Supported recurrence subset

```text
one-off rule (blank recurrence)
FREQ=DAILY
FREQ=WEEKLY
BYDAY=MO,TU,WE,TH,FR,SA,SU
INTERVAL=N
```

Unsupported or malformed RRULE properties fail closed.

### Participant targets

DB engine supports:

- `ALL_STUDENTS`
- `GRADE_LEVELS`
- `CLASSES`
- `DEPARTMENTS`
- `SELECTED_STUDENTS`

Participants resolve from historical enrollment on the occurrence date.

### Schedule relationships

- `NORMAL`
- `ADDITIVE`
- `REPLACE_NORMAL`
- `CANCEL_NORMAL`

A replace/cancel operation cannot silently rewrite a normal occurrence that already owns canonical attendance.

---

## 2. Device identity and secret

Physical terminals/bridges do not use staff credentials.

Each device has:

- UUID;
- protocol version;
- status;
- random plaintext secret held only by the device/bridge;
- SHA-256 hash stored in the database.

Secret provisioning/rotation:

```bash
npm run device:rotate-secret:env
```

Required local environment:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
DEVICE_ID
```

The DB never stores the plaintext device secret.

---

## 3. Common Device API headers

```http
Authorization: Bearer <device-secret>
X-Device-Id: <device-uuid>
X-Protocol-Version: v1
```

Authentication failures are intentionally generic. Network deployment must use HTTPS.

---

## 4. Heartbeat

```text
POST /api/device/v1/heartbeat
```

Authenticates the device and refreshes `last_seen_at`.

---

## 5. Card scan — Stage 1

```text
POST /api/device/v1/card-scan
```

Body:

```json
{
  "requestId": "unique-device-idempotency-key",
  "rfidUid": "A4:B8:32:F1",
  "occurredAt": "2026-09-03T06:45:00+07:00"
}
```

The device does **not** assert authoritative student/class/institution/session/late state.

Server path:

```text
device auth
→ timestamp/replay guard
→ materialize institution-local date
→ RFID owner + historical enrollment
→ candidate session + eligibility + duplicate state
→ Stage 1 decision
```

Current timestamp tolerance:

- no more than ~10 minutes old;
- no more than ~2 minutes in the future.

Possible Stage 1 responses:

```text
CAPTURE_FACE
ACCEPT_WITHOUT_FACE
UNKNOWN_CARD
NO_ACTIVE_SESSION
NOT_ELIGIBLE
DUPLICATE_ATTENDANCE
FACE_PROFILE_MISSING
```

Unresolved overlapping sessions fail closed.

---

## 6. Face-required transaction

`CAPTURE_FACE` creates a short-lived `device_verification_transactions` row bound to:

- institution;
- authenticated device;
- request ID;
- RFID UID;
- expected student;
- concrete occurrence;
- active face profile;
- original scan timestamp.

It expires at the earlier of roughly two minutes after creation or session close.

This transaction prevents Stage 2 from swapping the expected student/session after RFID resolution.

---

## 7. Face verification — Stage 2

Implemented endpoint:

```text
POST /api/device/v1/face-verify
```

Body:

```json
{
  "requestId": "same-request-id-as-card-scan",
  "verificationTransactionId": "uuid-from-stage-1",
  "imageBase64": "base64-jpeg-without-data-url-prefix"
}
```

Runtime path:

```text
authenticate device
→ verify transaction binding/state
→ load enrolled embedding server-side
→ send image + reference embedding to private FastAPI face service
→ YuNet detection + quality gates
→ SFace 1:1 similarity
→ canonical attendance engine
→ atomic finalization
→ device feedback
```

### MATCH

- canonical result becomes `ACCEPTED_ON_TIME` or `ACCEPTED_LATE`;
- GREEN LED feedback;
- one short beep;
- exactly one attendance record.

### MISMATCH

- canonical result `FACE_MISMATCH`;
- RED LED;
- rapid repeated beeps;
- zero attendance records.

### NO_FACE / LOW_QUALITY

- does not consume the transaction immediately;
- response is retryable while transaction remains active;
- not treated as proxy-attendance mismatch;
- no rapid mismatch alarm.

### Replay

Consumed verification transactions expose their stored final state. Retrying the same transaction/request after a network interruption returns the existing outcome and does not create duplicate attendance.

---

## 8. Face service contract

Private service: `services/face-service`.

- Python 3.12 + FastAPI.
- OpenCV YuNet + SFace.
- protected by `FACE_SERVICE_SECRET` / `X-Face-Service-Key`.
- pinned model/version compatibility enforced between enrollment and verification.
- raw image bytes are request-memory-only.
- embeddings and fingerprint/model/quality metadata are server-side data.
- V1 liveness/anti-spoof is **not implemented** and is reported as `livenessChecked=false`.

See `services/face-service/README.md`.

---

## 9. Admin face enrollment

Protected route:

```text
/dashboard/students/[studentId]/face
```

The browser captures one JPEG frame and sends it to a protected Next.js API. The server passes it to `/v1/extract` on the private face service. Supabase stores the resulting embedding/fingerprint/model/version/quality metadata; the raw enrollment photo is not stored.

Re-enrollment revokes the previous ACTIVE profile and creates a new versioned profile.

---

## 10. Sessions without face requirement

When `face_verification_required=false`, the canonical engine receives:

```text
face.status = not_required
```

Persistence records `NOT_REQUIRED`, never a fake `MATCH`.

All other attendance rules still apply.

---

## 11. Privacy / persistence

Raw device events, verification attempts, and canonical attendance remain separate.

Browser roles do not directly read biometric embeddings or device-verification tables. Privileged RPCs are server/service-role paths.

Device/audit persistence must not include raw `imageBase64`.

---

## 12. Verified V1 evidence

Automated CI:

- Node install/lint/typecheck/tests/build ✅
- Python dependency install/compile/pytest ✅
- official ONNX download ✅
- OpenCV Zoo SHA-256 verification ✅
- YuNet/SFace OpenCV runtime initialization ✅

Live Supabase smoke, executed inside transaction and rolled back:

- MATCH → one final event + one verification + one attendance; replay returns same IDs ✅
- MISMATCH → `FACE_REJECTED` + `MISMATCH` + zero attendance ✅

User-facing real camera/login/device E2E is the next step and is documented in `13-V1-TESTING-RUNBOOK.md`.

---

## 13. Outside V1-complete software scope

Still future hardening/integration:

- liveness/presentation-attack detection;
- camera/population-specific biometric threshold calibration;
- actual Arduino/ESP32 firmware/serial bridge validation on physical hardware;
- production edge rate limiting/observability/deployment hardening;
- real-school privacy/consent/legal review.
