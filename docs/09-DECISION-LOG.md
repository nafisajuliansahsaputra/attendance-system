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

### Context

The original 2025 P5 system used physical RFID/camera/LED/buzzer hardware, but the current rebuild should not require spending money on hardware that may not be used.

### Decision

Build the complete software system now with a simulator as a device client. Preserve a versioned device boundary so Arduino/ESP32 integration can be added later without rewriting attendance business logic.

### Consequences

- simulator cannot directly fake database outcomes;
- device contracts exist before physical firmware;
- future hardware work is adapter/firmware work rather than product rewrite.

---

## ADR-002 — RFID identifies; face performs 1:1 verification

**Status:** Accepted  
**Date:** 2026-09-03

### Context

The original system rejected proxy attendance when the person tapping a card was not the registered owner.

### Decision

RFID resolves the expected student, then the camera/live sample is verified only against that student's registered face reference.

### Consequences

- core product requires 1:1 verification, not broad 1:N face recognition;
- face mismatch cannot create attendance;
- face service can be isolated behind a replaceable verification interface.

---

## ADR-003 — Preserve original physical feedback semantics

**Status:** Accepted  
**Date:** 2026-09-03

### Decision

- accepted verification → green LED + one short beep;
- face mismatch/rejected identity → red LED + rapid repeated beeps.

Other feedback patterns are intentionally not fixed yet.

---

## ADR-004 — Attendance is session-based

**Status:** Accepted  
**Date:** 2026-09-03

### Context

The school system records more than arrival/departure, including Dhuha, Dzuhur, Ashar, ceremonies, and school activities.

### Decision

Model attendance around generic session templates, schedules, concrete occurrences, participant eligibility, and attendance records.

### Consequences

- do not create one rigid table with fixed `dhuha/dzuhur/ashar` columns;
- custom activities can reuse the same engine;
- reporting separates school-day status from session participation.

---

## ADR-005 — Dhuha targeting is configurable

**Status:** Accepted  
**Date:** 2026-09-03

### Context

Dhuha is divided across grades/classes on different days rather than the whole school attending at once.

### Decision

Dhuha schedule is configured by recurrence + participant targeting. Example schedules are seed/demo data, never hard-coded rules.

### Consequences

Non-target students are not counted absent for that occurrence.

---

## ADR-006 — Special events can create attendance outside normal school schedule

**Status:** Accepted  
**Date:** 2026-09-03

### Context

Examples include 17 August ceremony with mandatory arrival/departure and Friday cleaning activities.

### Decision

Support one-off/recurring special events with target participants and additive/replacing/cancelling calendar behavior.

### Consequences

The calendar engine, not weekday assumptions, determines attendance requirements.

---

## ADR-007 — Sakit/Izin/Alpa belong to homeroom confirmation

**Status:** Accepted  
**Date:** 2026-09-03

### Context

The automated system only knows whether valid attendance occurred and whether it was late. It cannot know why an absent student did not attend.

### Decision

When no valid school arrival exists, the system leaves the school-day record pending. Authorized homeroom teacher confirms Sakit, Izin, or Alpa.

### Consequences

- no automatic Alpa;
- confirmation changes are audited;
- reports use final confirmed school-day status.

---

## ADR-008 — Raw events and canonical attendance are separate

**Status:** Accepted  
**Date:** 2026-09-03

### Decision

Persist raw device/verification/audit events separately from canonical attendance records.

### Consequences

- duplicate/rejected attempts remain auditable;
- correction of attendance does not erase device truth;
- reporting uses canonical records rather than raw scan counts.

---

## ADR-009 — Reports are derived, not manually maintained totals

**Status:** Accepted  
**Date:** 2026-09-03

### Decision

Weekly/monthly/semester/annual summaries are computed from canonical records and confirmations. Manual duplicated counters are not authoritative source data.

### Consequences

Report totals can be reconciled and regenerated after corrections.

---

## ADR-010 — Application stack

**Status:** Accepted  
**Date:** 2026-09-03

### Context

Implementation is starting and the stack must be fixed enough to prevent framework drift.

### Decision

- Next.js App Router + TypeScript for the main full-stack web application;
- React for interactive UI;
- Tailwind CSS for styling;
- PostgreSQL on Supabase for the managed data platform;
- separate Python/FastAPI boundary for future face verification;
- Python serial bridge for future USB Arduino hardware;
- direct HTTPS option for future ESP32-class hardware.

The initial dependency baseline is Next.js 16.3.x, React 19.2.x, TypeScript 6.x, and Tailwind CSS 4.3.x. Exact direct versions are pinned in `package.json` and upgraded deliberately.

### Consequences

- the main app does not depend on PHP/Laravel;
- biometric implementation remains replaceable;
- physical hardware is not required to develop the web system.

---

## ADR-011 — Historical class/enrollment context is preserved

**Status:** Accepted  
**Date:** 2026-09-03

### Decision

Attendance/report history references the student's enrollment at the time, rather than only current class fields.

### Consequences

Moving a student to another class/year does not rewrite old reports.

---

## ADR-012 — Institution-local calendar with UTC persistence

**Status:** Accepted  
**Date:** 2026-09-03

### Decision

Persist canonical instants in UTC while evaluating/displaying attendance schedules in explicit institution timezone.

### Consequences

No business rule depends on developer laptop/server timezone.

---

## ADR-013 — Attendance System receives a dedicated Supabase project

**Status:** Accepted  
**Date:** 2026-09-03

### Context

Another portfolio application (Spall Spill) also uses Supabase. Attendance data, Auth, keys, storage, and schema must not be mixed with another product.

### Decision

Create and use a separate Supabase project exclusively for Attendance System.

### Consequences

- no shared database tables with Spall Spill;
- no shared Auth tenant or Storage buckets;
- separate environment variables and credentials;
- project creation waits for explicit Supabase organization selection.

---

## ADR-014 — Start app-first, preserve service boundaries

**Status:** Accepted  
**Date:** 2026-09-03

### Context

A large monorepo before there are multiple deployable services would add ceremony without product value.

### Decision

Start the Next.js application at the repository root. Keep domain logic and contracts in explicit `src/domain` and `src/contracts` boundaries. Add `services/face-service`, device bridges, and firmware folders when those deployable units actually begin.

### Consequences

- faster initial development;
- no premature workspace tooling;
- architecture can evolve into multiple services without rewriting the attendance engine.

---

## ADR-015 — Simulator exercises canonical decision logic

**Status:** Accepted  
**Date:** 2026-09-03

### Decision

The recruiter simulator may provide deterministic fixture resolutions for RFID/session/face inputs, but the resulting attendance decision must pass through the same canonical domain engine intended for real device adapters.

### Consequences

- UI scenario buttons cannot directly declare attendance success;
- face mismatch, unknown card, duplicate, not-eligible, and timing rules are regression-testable independently of the UI;
- later database/device adapters replace fixture resolution, not the decision engine.

---

# Proposed / pending decisions

Create a new ADR when each is resolved:

- final brand/UI direction;
- exact attendance cutoff values;
- exact demo Dhuha/Dzuhur/Ashar schedules;
- missing-departure policy;
- prayer/activity denominator policy when a student is Sakit/Izin;
- attachment/evidence policy;
- manual correction approval model;
- exact face verification model and threshold calibration;
- biometric retention;
- demo vs production deployment isolation;
- report/export templates;
- overlapping session/device routing policy.
