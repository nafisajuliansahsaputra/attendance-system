# Roadmap & TODO

**Planning rule:** Complete work by capability and acceptance gate, not by randomly building pages.

Legend:

- [ ] Not started
- [x] Complete

---

## Phase 0 — Product foundation

- [x] Establish canonical Source of Truth.
- [x] Write PRD.
- [x] Define user/device flows.
- [x] Define target architecture.
- [x] Define domain/data model.
- [x] Define device protocol + simulator parity.
- [x] Define security/privacy baseline.
- [x] Define engineering working agreements.
- [x] Create decision log.
- [x] Create project skill/capability map.
- [x] Create persistent current-work file.

### Gate 0

No implementation begins until unresolved decisions required for scaffolding are explicitly chosen and logged.

---

## Phase 1 — Product decisions & UX system

### Product decisions

- [ ] Finalize product name/branding for the rebuilt project.
- [ ] Lock MVP human roles and permission matrix.
- [ ] Lock ordinary school arrival/departure semantics.
- [ ] Lock demo Dhuha/Dzuhur/Ashar schedules.
- [ ] Lock special-event attendance modes exposed in MVP.
- [ ] Decide prayer/activity reporting denominator behavior for Sakit/Izin days.
- [ ] Decide manual correction permissions and audit requirements.
- [ ] Decide evidence attachment policy for Sakit/Izin.

### Technical decisions

- [ ] Lock repo layout.
- [ ] Lock database/Auth provider.
- [ ] Lock initial face verification implementation.
- [ ] Lock biometric storage/retention for demo.
- [ ] Lock report export approach.
- [ ] Lock deployment environment for demo.

### UX/IA

- [ ] Define route map / information architecture.
- [ ] Define management navigation by role.
- [ ] Wireframe Dashboard.
- [ ] Wireframe Students.
- [ ] Wireframe Attendance Daily View.
- [ ] Wireframe Schedule/Calendar.
- [ ] Wireframe Special Event creation.
- [ ] Wireframe Reports.
- [ ] Wireframe Devices.
- [ ] Wireframe Terminal/Simulator.
- [ ] Define loading/empty/error/success states.
- [ ] Define responsive behavior.

### Gate 1

A developer should be able to explain the whole MVP and all main screens without inventing a missing rule.

---

## Phase 2 — Repository scaffold & quality baseline

- [ ] Initialize application workspace.
- [ ] Configure TypeScript strict mode.
- [ ] Configure formatter/linter.
- [ ] Configure environment-variable validation.
- [ ] Create local/dev environment setup documentation.
- [ ] Add database migration workflow.
- [ ] Add seed workflow for fictional demo school data.
- [ ] Add unit test runner.
- [ ] Add integration test baseline.
- [ ] Add browser E2E test baseline.
- [ ] Add CI checks: lint, typecheck, tests, build.
- [ ] Add dependency/security scanning baseline.
- [ ] Establish error/logging conventions.

### Gate 2

Fresh clone can be configured reproducibly, and CI rejects broken lint/type/test/build state.

---

## Phase 3 — Identity, school structure, and RBAC

- [ ] Authentication.
- [ ] System Admin role.
- [ ] Homeroom Teacher role.
- [ ] Optional Operator role.
- [ ] Academic years.
- [ ] Semesters/terms.
- [ ] Grade levels.
- [ ] Classes.
- [ ] Historical student enrollment.
- [ ] Homeroom assignments.
- [ ] Student CRUD.
- [ ] RFID credential registration model.
- [ ] Face enrollment metadata model.
- [ ] Server-side class-scope authorization.
- [ ] Audit privileged mutations.

### Tests

- [ ] Teacher cannot access unrelated class.
- [ ] Active RFID UID is unique.
- [ ] Moving a student class does not rewrite historical attendance context.

### Gate 3

School structure can be configured safely and historical enrollment is stable.

---

## Phase 4 — Schedule & attendance domain engine

- [ ] Session templates.
- [ ] Session recurrence rules.
- [ ] Session occurrence resolution.
- [ ] Participant targeting: all/grade/class/selected student.
- [ ] Holiday/cancel rules.
- [ ] Additive special events.
- [ ] Replace-normal special events.
- [ ] Current active session resolver.
- [ ] Late threshold logic.
- [ ] School arrival session.
- [ ] School departure session.
- [ ] Dhuha targeted schedule.
- [ ] Dzuhur schedule.
- [ ] Ashar schedule.
- [ ] Custom activity/special event sessions.
- [ ] Duplicate/canonical attendance rule.
- [ ] Pending school absence confirmation state.

### Critical tests

- [ ] Grade 11 is not counted absent during Grade-10-only Dhuha.
- [ ] Special 17 August event works outside normal calendar.
- [ ] Cancelled/holiday sessions produce no required attendance.
- [ ] Late scan is accepted as late, not rejected.
- [ ] Duplicate scan creates one canonical attendance record.

### Gate 4

All critical scheduling/attendance rules pass as pure/integration tests before polished UI is built around them.

---

## Phase 5 — Versioned Device API & simulator

- [ ] Device registration model.
- [ ] Device authentication.
- [ ] Device capabilities model.
- [ ] Protocol v1 schemas.
- [ ] Idempotency/replay handling.
- [ ] RFID scan endpoint/command.
- [ ] Face-verification transaction flow.
- [ ] Machine-readable feedback codes.
- [ ] Raw device event persistence.
- [ ] Device heartbeat/last-seen.
- [ ] Virtual terminal simulator shell.
- [ ] Success scenario.
- [ ] Face mismatch scenario.
- [ ] Unknown card scenario.
- [ ] Not eligible scenario.
- [ ] Late scenario.
- [ ] Duplicate scenario.
- [ ] Service/device error scenario.
- [ ] Special event scenario.

### Gate 5

A non-browser test client and the simulator can both use the same Device API contract to produce identical domain outcomes.

---

## Phase 6 — Face verification capability

- [ ] Select and pin face model/library.
- [ ] Implement face-service interface.
- [ ] Enrollment workflow.
- [ ] Sample quality validation.
- [ ] 1:1 verification workflow.
- [ ] Model/version audit metadata.
- [ ] Secure face-template storage.
- [ ] Face mismatch handling.
- [ ] No-face/low-quality handling.
- [ ] Face-service failure handling.
- [ ] Temporary recruiter enrollment flow.
- [ ] Demo biometric deletion/expiry.
- [ ] Threshold calibration with documented test set.

### Critical tests

- [ ] RFID Student A + face Student B cannot create attendance.
- [ ] Face-service outage cannot be mislabeled as mismatch.
- [ ] Expired verification transaction cannot be reused.

### Gate 6

Real 1:1 verification can drive the same attendance engine used by deterministic simulator scenarios.

---

## Phase 7 — Management UI

### Admin

- [ ] Dashboard.
- [ ] Student list/detail.
- [ ] RFID enrollment.
- [ ] Face enrollment.
- [ ] Academic structure management.
- [ ] Schedule/calendar management.
- [ ] Special event management.
- [ ] Device monitoring.
- [ ] Verification/audit logs.

### Homeroom Teacher

- [ ] Assigned-class dashboard.
- [ ] Daily attendance list.
- [ ] Pending absence confirmation queue.
- [ ] Confirm Sakit.
- [ ] Confirm Izin.
- [ ] Confirm Alpa.
- [ ] Review prayer/activity participation.
- [ ] Student attendance detail.

### Gate 7

All primary admin/teacher jobs can be completed without direct database editing.

---

## Phase 8 — Reporting & exports

- [ ] Daily report.
- [ ] Weekly recap.
- [ ] Monthly recap.
- [ ] Semester recap.
- [ ] Academic-year/annual recap.
- [ ] Custom date range.
- [ ] Per-student report.
- [ ] Per-class report.
- [ ] Prayer/activity report.
- [ ] Special event report.
- [ ] Lateness breakdown.
- [ ] CSV/XLSX-compatible export.
- [ ] PDF/print report.
- [ ] Reconciliation tests against canonical attendance records.

### Gate 8

A homeroom teacher can produce weekly through annual recaps without manually counting daily rows.

---

## Phase 9 — Portfolio demo polish

- [ ] Guided product introduction.
- [ ] Recruiter demo entry point.
- [ ] Virtual RFID interaction.
- [ ] Camera permission UX.
- [ ] Virtual green/red LED.
- [ ] Single success beep.
- [ ] Rapid repeated mismatch beep.
- [ ] Scenario selector that is clearly demo-only.
- [ ] Realtime/near-realtime reflected attendance in dashboard.
- [ ] Seed/reset fictional demo school.
- [ ] Mobile/tablet/desktop polish.
- [ ] Accessibility basics.
- [ ] Portfolio case-study content/screenshots.

### Gate 9

A recruiter can understand and try the product in a few minutes without setup instructions or physical hardware.

---

## Phase 10 — Security, QA, performance, release

- [ ] Authorization test suite.
- [ ] Device auth/revocation tests.
- [ ] Replay/idempotency tests.
- [ ] Upload validation tests.
- [ ] Biometric privacy audit.
- [ ] Demo isolation audit.
- [ ] Audit-log integrity tests.
- [ ] Timezone/calendar edge-case tests.
- [ ] Accessibility review.
- [ ] Performance profiling.
- [ ] Error-state review.
- [ ] Backup/restore documentation for production-style deployment.
- [ ] Final architecture review.
- [ ] Final Source of Truth reconciliation.
- [ ] Release README/case study.

### Gate 10

No known critical product-rule, security, or reporting mismatch remains.

---

## Phase 11 — Future physical hardware integration

Not required for the portfolio MVP, but planned architecture path:

- [ ] Reconstruct/select physical board architecture.
- [ ] RFID reader firmware.
- [ ] Camera integration.
- [ ] Green/red LED patterns.
- [ ] Buzzer patterns.
- [ ] Arduino serial framing if Arduino path is used.
- [ ] Python serial bridge.
- [ ] ESP32 HTTPS adapter if ESP32 path is used.
- [ ] Hardware contract tests against Device API v1.
- [ ] Failure/reconnect behavior.
- [ ] Physical enrollment flow.
- [ ] End-to-end field test.

### Hardware integration success criterion

Adding physical hardware must not require rewriting attendance, schedule, teacher-confirmation, or reporting business logic.
