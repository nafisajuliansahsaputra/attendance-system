# Architecture & Product Decision Log

This file records decisions that materially affect product behavior or architecture. Accepted decisions should not be reversed silently.

Format:

```text
ADR-XXX — Title
Status: Proposed | Accepted | Superseded
Date: YYYY-MM-DD
Context
Decision
Consequences
```

---

## ADR-001 — Rebuild is hardware-ready even without current hardware

**Status:** Accepted  
**Date:** 2026-09-03

Build the complete software system now with a simulator as a device client. Preserve a versioned device boundary so Arduino/ESP32 integration can be added later without rewriting attendance business logic.

Consequences: simulator cannot directly fake canonical outcomes; future hardware work remains adapter/firmware work.

---

## ADR-002 — RFID identifies; face performs 1:1 verification

**Status:** Accepted  
**Date:** 2026-09-03

RFID resolves the expected student, then the camera/live sample is verified only against that student's registered face template. The system does not use broad 1:N face identification as attendance truth.

---

## ADR-003 — Preserve original physical feedback semantics

**Status:** Accepted  
**Date:** 2026-09-03

- accepted owner verification → green LED + one short beep;
- face mismatch/rejected identity → red LED + rapid repeated beeps.

Camera quality/no-face errors are separate states and must not impersonate the proxy-attendance alarm.

---

## ADR-004 — Attendance is session-based

**Status:** Accepted  
**Date:** 2026-09-03

Model attendance around generic session templates, schedules, concrete occurrences, participant eligibility, and attendance records. Do not create rigid fixed Dhuha/Dzuhur/Ashar columns.

---

## ADR-005 — Dhuha targeting is configurable

**Status:** Accepted  
**Date:** 2026-09-03

Dhuha schedule is configured by recurrence + participant targeting. Example grade/day mappings are fixtures/configuration, not hard-coded business rules. Non-target students are not counted absent.

---

## ADR-006 — Special events can create attendance outside normal school schedule

**Status:** Accepted  
**Date:** 2026-09-03

Support one-off/recurring special events with targeted participants and additive/replacing/cancelling calendar behavior. Calendar configuration, not weekday assumptions, determines attendance requirements.

---

## ADR-007 — Sakit/Izin/Alpa belong to homeroom confirmation

**Status:** Accepted  
**Date:** 2026-09-03

When no valid required school arrival exists, the system leaves the school-day state pending. Authorized homeroom teacher confirms Sakit, Izin, or Alpa. The automated system does not infer those reasons.

---

## ADR-008 — Raw events and canonical attendance are separate

**Status:** Accepted  
**Date:** 2026-09-03

Persist raw device/verification/audit events separately from canonical attendance records. Reports use canonical records, while rejected/duplicate/device evidence remains auditable.

---

## ADR-009 — Reports are derived, not manually maintained totals

**Status:** Accepted  
**Date:** 2026-09-03

Weekly/monthly/semester/academic-year summaries are regenerated from canonical attendance plus teacher confirmations. No manually maintained total is a source of truth.

---

## ADR-010 — Application stack

**Status:** Accepted  
**Date:** 2026-09-03

- Next.js App Router + TypeScript for the main full-stack web application;
- React + Tailwind CSS for UI;
- PostgreSQL/Supabase for managed data + staff Auth;
- separate Python/FastAPI service boundary for face verification;
- future USB Arduino hardware through a bridge, network-capable hardware through HTTPS Device API.

Exact dependencies are pinned and upgraded deliberately.

---

## ADR-011 — Historical class/enrollment context is preserved

**Status:** Accepted  
**Date:** 2026-09-03

Attendance/report history references the student's enrollment at the relevant date. Mid-year class transfer creates a new non-overlapping enrollment instead of rewriting old class history.

---

## ADR-012 — Institution-local calendar with UTC persistence

**Status:** Accepted  
**Date:** 2026-09-03

Persist canonical instants in UTC while evaluating/displaying attendance schedules in an explicit institution timezone. No business rule depends on developer laptop/server local timezone.

---

## ADR-013 — Attendance System receives a dedicated Supabase project

**Status:** Accepted  
**Date:** 2026-09-03

Attendance System uses a dedicated Supabase project separate from Spall Spill: separate database, Auth tenant, Storage/keys, and environment variables.

---

## ADR-014 — Start app-first, preserve service boundaries

**Status:** Accepted  
**Date:** 2026-09-03

Keep the main Next.js app at repository root and isolate deployable infrastructure behind explicit domain/application/contracts boundaries. The face service lives under `services/face-service` without moving attendance business logic into it.

---

## ADR-015 — Simulator exercises canonical decision logic

**Status:** Accepted  
**Date:** 2026-09-03

Recruiter simulator may provide deterministic fixture resolutions, but final attendance decisions must pass through the same canonical domain engine intended for real device adapters.

---

## ADR-016 — Ambiguous overlapping sessions fail closed

**Status:** Accepted  
**Date:** 2026-09-03

Until a final routing priority is defined, more than one unresolved candidate attendance session at the same time is a configuration/system error. Never select one based on database ordering.

---

## ADR-017 — Supabase Auth proves identity; application database owns authorization

**Status:** Accepted  
**Date:** 2026-09-03

Supabase Auth verifies staff identity. Canonical `profiles` and `homeroom_assignments` own SYSTEM_ADMIN/HOMEROOM_TEACHER/OPERATOR role and class scope. Privileged application RPCs remain server-only; public staff signup is not part of V1.

---

## ADR-018 — Homeroom absence confirmation cannot override valid arrival truth

**Status:** Accepted  
**Date:** 2026-09-03

Sakit/Izin/Alpa can be confirmed only when attendance was required and no valid school-arrival attendance exists. Every confirmation is attributable/auditable. Valid machine presence cannot be rewritten into an absence reason through the normal workflow.

---

## ADR-019 — V1 biometric engine is local YuNet + SFace with ephemeral raw images

**Status:** Accepted  
**Date:** 2026-09-03

### Context

V1 requires actual 1:1 face verification instead of deterministic production fixtures, while preserving privacy and keeping biometric infrastructure replaceable.

### Decision

- run a private Python 3.12 + FastAPI face service;
- use OpenCV YuNet for face detection and OpenCV SFace for 1:1 feature comparison;
- pin model filenames and verify OpenCV Zoo Git LFS SHA-256 object IDs before model use;
- CI must download and initialize both models through OpenCV;
- use baseline SFace cosine threshold `0.363`, configurable by environment;
- enrollment stores embedding + fingerprint + model/version/quality metadata server-side;
- raw enrollment and verification JPEG/base64 is processed in request memory and is not persisted in Supabase canonical/audit/device payloads;
- enforce exact enrolled-model/version compatibility at verification time;
- no-face / low-quality samples are retryable quality states, not identity mismatches;
- V1 does **not** claim liveness/presentation-attack detection and explicitly reports `livenessChecked=false`.

### Consequences

- attendance core remains independent from the specific face engine;
- third-party recognition APIs are not required for V1;
- raw student face photos are not required as canonical stored data;
- the baseline threshold is not a claim of school-specific calibration;
- high-assurance production use requires consented threshold calibration and a separately evaluated liveness/anti-spoof layer;
- model/training-data provenance and privacy/legal requirements must be reviewed before a real institutional rollout.

---

# Proposed / pending decisions

Create a new ADR when each is resolved:

- final brand/UI direction;
- exact production attendance cutoff values;
- exact production Dhuha/Dzuhur/Ashar schedules;
- missing-departure policy;
- prayer/activity denominator policy when a student is Sakit/Izin;
- attachment/evidence policy;
- manual correction approval model;
- school/camera/population-specific biometric threshold calibration;
- liveness/presentation-attack detection approach;
- demo vs production deployment isolation;
- final report/export templates if native XLSX/server PDF becomes required;
- final overlapping-session priority/device routing policy.
