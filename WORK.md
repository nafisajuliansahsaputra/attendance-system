# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** V1 implementation complete / ready for user E2E testing  
**Coding status:** Feature-complete for the agreed V1 software scope. Do not add new features before the user test unless a regression blocks setup.

Read this after `AGENTS.md` and `docs/00-SOURCE-OF-TRUTH.md`.

---

## 1. V1 implementation status

The software path is implemented end-to-end:

```text
RFID / device
→ device authentication
→ server-side RFID owner resolution
→ historical enrollment + schedule/session + eligibility resolution
→ optional short-lived face transaction
→ local YuNet + SFace 1:1 verification
→ canonical attendance engine
→ atomic/idempotent Supabase persistence
→ LED/buzzer response
→ homeroom reconciliation
→ derived report/export
```

The recruiter `/terminal` remains a deterministic, ephemeral adapter that calls canonical attendance logic without contaminating shared attendance data.

---

## 2. Locked technical stack

- Next.js App Router + TypeScript + React + Tailwind CSS.
- Dedicated Attendance System PostgreSQL/Supabase project in Singapore.
- Supabase Auth for staff identity; canonical application tables own roles/scope.
- Python 3.12 + FastAPI private face service.
- OpenCV YuNet for face detection and SFace for 1:1 face-template comparison.
- Versioned HTTPS Device API for simulator/network devices; future Arduino USB hardware can use a local bridge.

Attendance System remains isolated from Spall Spill database/Auth/Storage/keys.

---

## 3. Canonical attendance and schedule engine — complete

Implemented and regression-tested:

- accepted on-time and late;
- unknown RFID;
- face mismatch, no face, low quality, and face-service failure;
- no active session / outside window;
- non-target/non-eligible student;
- duplicate attendance;
- explicit no-face-required path.

Original hardware semantics remain canonical:

- valid owner verification → GREEN + one short beep;
- face mismatch/proxy attendance → RED + rapid repeated beeps.

Schedule engine supports arrival, Dhuha, Dzuhur, Ashar, departure, ceremony/activity/custom templates; one-off/daily/weekly recurrence; historical participant snapshots; flexible targets; special schedule relationships; proactive zero-scan-day materialization; and fail-closed unresolved overlap.

---

## 4. Staff Auth/RBAC and workflows — complete

Roles: `SYSTEM_ADMIN`, `HOMEROOM_TEACHER`, `OPERATOR`.

Implemented:

- internal login/logout and protected routes;
- no public staff signup;
- roles/class scope from canonical DB rather than editable Auth metadata;
- secure first-admin bootstrap and in-app later provisioning;
- self-disable and last-active-admin safeguards;
- Homeroom Teacher class assignment;
- Operator device-monitoring-only scope.

`/teacher` supports daily roster and Sakit/Izin/Alpa confirmation. A valid machine arrival cannot be rewritten into an absence reason.

---

## 5. Admin workspaces — complete for V1

- `/dashboard/students` — students, RFID history, historical class transfer, face status.
- `/dashboard/students/[studentId]/face` — browser camera enrollment; raw image not stored.
- `/dashboard/schedules` — versioned prospective schedule management.
- `/dashboard/devices` — device registry/status/heartbeat/disable/revoke; Operator monitoring.
- `/dashboard/staff` — staff directory/provisioning and RBAC guardrails.

---

## 6. Device API V1 — complete

Routes:

- `POST /api/device/v1/heartbeat`
- `POST /api/device/v1/card-scan`
- `POST /api/device/v1/face-verify`

Device auth uses `x-device-id`, `x-protocol-version`, and Bearer device secret over HTTPS. Only the SHA-256 secret hash is stored.

Card scan derives institution/student/class/session/eligibility server-side. Face-required scans create a short-lived transaction bound to device + request + RFID owner + session + face profile. Replay is idempotent and cannot create a second attendance record.

---

## 7. Real face verification V1 — complete with explicit limitation

Service: `services/face-service`.

Implemented:

- FastAPI private service protected by `FACE_SERVICE_SECRET`;
- pinned OpenCV YuNet + SFace models;
- official OpenCV Zoo Git LFS download + SHA-256 verification;
- CI runtime model loading;
- exactly-one-face and basic quality gates;
- enrollment embedding/fingerprint extraction;
- 1:1 cosine comparison;
- baseline threshold `0.363`, configurable;
- model/version compatibility guard;
- request-memory-only raw images;
- server-only embedding storage;
- retryable NO_FACE/LOW_QUALITY path.

**Known V1 security limitation:** liveness/presentation-attack detection is NOT implemented. `livenessChecked=false` is deliberate. Do not claim photo/video spoof resistance.

The default threshold is not school-specific calibration; high-assurance deployment requires consented calibration using the real camera/environment.

---

## 8. Reporting/export — complete for V1

`/teacher/reports` supports 7 days, current month, semester, academic year, and custom ranges with per-student H/T/S/I/A/Pending plus separate activity/session participation.

Exports:

- protected Excel-compatible CSV with formula-injection protection;
- protected A4 Print / Save as PDF view.

Prayer/activity percentages remain intentionally absent until the Sakit/Izin denominator policy is decided.

---

## 9. Supabase state

Dedicated project: **ACTIVE_HEALTHY**.

Live migration history: **21 migrations**, through `admin_face_enrollment_target`.

Security advisor final state: no warning/error finding; only intentional INFO `RLS enabled no policy` because browser roles are default-deny.

Performance advisor final state: no missing-FK-index warning; only INFO unused-index notices expected on a fresh low-traffic database.

---

## 10. Verified automated gates

### Node / Next.js

- `npm ci` ✅
- lint ✅
- TypeScript typecheck ✅
- Vitest suite ✅
- production build ✅

### Python face service

- dependency install ✅
- Python compile ✅
- pytest contract tests ✅
- official model download ✅
- SHA-256 verification ✅
- OpenCV YuNet/SFace runtime initialization ✅

### Live database smoke tests (transaction + rollback)

MATCH path ✅: exactly one final event + one verification attempt + one attendance record; replay returns the same IDs with `replayed=true`.

MISMATCH path ✅: final event `FACE_REJECTED`, verification `MISMATCH`, zero attendance records.

Smoke data was rolled back and did not pollute the fictional seed dataset.

---

## 11. What remains before production rollout

These are not blockers for the user's V1 functional test:

- real liveness/anti-spoofing;
- school/camera-specific biometric threshold calibration;
- prayer/activity absence denominator policy;
- final overlapping-session routing policy instead of fail-closed behavior;
- final missing-departure and manual-correction policies;
- real-institution deployment/monitoring/backups/privacy/consent review;
- physical Arduino/camera firmware/bridge validation on actual hardware.

---

## 12. Next action

**Do not expand V1 before user testing.**

Use `docs/13-V1-TESTING-RUNBOOK.md`. Next implementation work should be driven by defects found during the user's real login/camera/device-flow test.
