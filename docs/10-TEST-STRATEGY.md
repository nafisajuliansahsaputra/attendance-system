# Test Strategy

**Goal:** Prove attendance correctness, hardware/simulator parity, authorization, and reporting integrity—not only visual UI behavior.

---

## 1. Test pyramid

### Unit/domain tests — largest layer

Test pure rules quickly and deterministically:

- session eligibility;
- schedule recurrence/override;
- late threshold;
- school-day status derivation;
- duplicate prevention decisions;
- report aggregation;
- timezone boundaries.

### Integration tests

Test real boundaries:

- database constraints/migrations;
- attendance transactions;
- RBAC/class scoping;
- Device API;
- face-service adapter;
- report queries;
- audit writes.

### Contract tests

Test protocol compatibility:

- Device API v1 schemas;
- simulator payload parity;
- non-browser client payloads;
- result/feedback codes;
- protocol-version rejection;
- idempotency semantics.

### E2E tests

Test critical human journeys through the browser:

- admin setup/enrollment;
- successful terminal attendance;
- face mismatch;
- teacher confirms Sakit/Izin/Alpa;
- targeted Dhuha;
- special event;
- weekly/monthly report export.

---

## 2. Critical invariant tests

These are release blockers.

### T-001 Face mismatch cannot create attendance

Given RFID belongs to Student A and face verification returns mismatch, assert:

- verification attempt exists;
- canonical attendance does not exist;
- outcome is identity rejected;
- simulator/hardware feedback class maps to mismatch behavior.

### T-002 Targeted Dhuha does not penalize other grades

Given Dhuha occurrence targets Grade 10:

- Grade 10 students are eligible;
- Grade 11/12 are not eligible;
- Grade 11/12 are absent from denominator, not counted as missed.

### T-003 Late is accepted

Given valid verification occurs after late threshold but before session close:

- attendance exists;
- status = late;
- result is success-class, not rejection.

### T-004 No automatic Sakit/Izin/Alpa

Given school arrival closes without valid attendance:

- state becomes pending/no-valid-arrival;
- no Sakit/Izin/Alpa exists until authorized teacher action.

### T-005 Teacher scope

A homeroom teacher cannot read/change attendance confirmation for another unassigned class.

### T-006 Duplicate/idempotency

Same logical device request repeated:

- at most one canonical attendance record;
- raw retry/repeated event remains auditable as designed.

### T-007 Special-date attendance

17 August-style event on a non-normal school day still resolves active required session(s) when published.

### T-008 Historical enrollment

A student's later class transfer does not move past attendance into the new class's historical reports.

### T-009 Report reconciliation

For deterministic seed data, daily facts sum exactly to weekly/monthly/semester/annual outputs according to defined rules.

### T-010 Simulator parity

Simulator cannot create attendance by direct database write. Its Device API event produces the same backend outcome as an equivalent API test client.

---

## 3. Face verification tests

Use controlled test samples and never depend solely on visually checking a confidence number.

Test classes:

- expected same-person samples;
- different-person samples;
- no face;
- low-quality/blur/occlusion;
- service unavailable;
- expired verification transaction;
- model-version migration/re-enrollment behavior.

Threshold calibration must be documented with false-accept/false-reject observations before claiming production reliability.

---

## 4. Schedule/calendar tests

Cover:

- ordinary weekdays;
- weekends/non-school days;
- holidays;
- cancelled normal day;
- additive event;
- replace-normal event;
- targeted grade/class;
- selected-student activity;
- exact opening boundary;
- late boundary;
- closing boundary;
- timezone conversion around midnight;
- overlapping session ambiguity once routing policy is decided.

---

## 5. Reporting tests

Use a fixed seed academic period containing:

- on-time students;
- late students;
- Sakit;
- Izin;
- Alpa;
- targeted Dhuha participation;
- missed prayer/activity sessions;
- special event;
- student class transfer history.

Verify:

- each period filter;
- per-student totals;
- per-class totals;
- denominator rules;
- export rows/totals;
- correction causes report recalculation;
- no raw rejected verification is accidentally counted as attendance.

---

## 6. Authorization/security tests

- unauthenticated management access rejected;
- teacher horizontal access rejected;
- operator cannot perform admin-only mutation;
- device credential required;
- revoked device rejected;
- malformed/oversized face payload rejected;
- public demo cannot query real management dataset;
- service/admin secrets never returned to browser;
- biometric template endpoint cannot be accessed through ordinary student API.

---

## 7. Device resilience tests

- duplicate request ID;
- same RFID scanned rapidly multiple times;
- network timeout then retry;
- face capture submitted after transaction expiry;
- device sends unsupported protocol version;
- server unavailable;
- face service unavailable;
- device clock skew if client timestamps are used;
- device reconnect/heartbeat.

---

## 8. UI/E2E behavior tests

Every major page should cover:

- loading;
- empty;
- success;
- validation error;
- authorization denied;
- server error;
- responsive layout where critical.

Terminal specifically:

- audio permission/unavailable fallback;
- success virtual LED + one-beep cue;
- mismatch virtual LED + repeated-beep cue;
- visible textual status for accessibility;
- simulator scenario controls cannot appear as normal production-terminal controls when Demo Mode is off.

---

## 9. Seed data strategy

Maintain deterministic fictional demo/test data with:

- at least Grades 10, 11, 12;
- multiple classes;
- homeroom assignments;
- registered/unregistered RFID examples;
- enrolled face profiles or test references;
- ordinary attendance records;
- Dhuha targets across different days;
- Dzuhur/Ashar sessions;
- 17 August-style event;
- Friday-cleaning activity;
- confirmed Sakit/Izin/Alpa examples.

Never use real student data in public CI fixtures.

---

## 10. CI release checks

Target pipeline:

```text
install
-> lint
-> typecheck
-> unit tests
-> integration/contract tests
-> build
-> selected E2E smoke tests
-> dependency/security checks
```

A failing critical invariant test blocks merge/release.

---

## 11. Manual exploratory QA

Automated tests do not replace exploratory review. Before major portfolio release, manually inspect:

- recruiter journey clarity;
- camera permissions;
- audible feedback behavior;
- confusing attendance statuses;
- report readability/print layout;
- teacher confirmation ergonomics;
- schedule creation mistakes/error prevention;
- slow/offline service feedback;
- mobile/tablet terminal behavior if supported.

---

## 12. Definition of verified feature

A feature is considered verified when:

1. its critical domain rule has automated coverage;
2. authorization is tested where relevant;
3. persistence result is asserted;
4. failure paths are covered;
5. UI path is E2E-tested when user-facing;
6. simulator/device contract is tested when device-related;
7. reporting impact is tested when attendance truth changes.
