# Product Requirements Document (PRD)

**Product:** Smart Attendance System  
**Version:** 1.0 baseline  
**Date:** 2026-09-03  
**Owner:** NATSX / Nafisa Juliansah Saputra  
**Source of truth:** `docs/00-SOURCE-OF-TRUTH.md`

---

## 1. Executive summary

Smart Attendance System is a hardware-ready school attendance platform rebuilt from a 2025 P5 SMK project. It combines RFID-based student identification with 1:1 face verification to prevent proxy attendance, records multiple attendance sessions throughout the school day, supports flexible school/event schedules, and automatically produces attendance recaps for homeroom teachers.

The current development phase does not require physical Arduino/ESP32 hardware. A recruiter-facing simulator must exercise the same core backend and attendance rules that real hardware will use later.

---

## 2. Problem statement

Schools may face several operational problems:

- attendance cards can be lent to another student unless identity is independently verified;
- attendance is not limited to school arrival/departure; schools may require prayer and event attendance;
- Dhuha or other activities may be scheduled differently by grade/class;
- special dates can require attendance outside the ordinary school schedule;
- homeroom teachers may spend time manually recapping weekly/monthly/annual attendance;
- a raw scanner system alone does not explain or audit rejected attendance attempts.

---

## 3. Product goals

### G1 — Prevent proxy attendance
A card scan is not sufficient by itself. The live face must match the registered RFID owner before the attendance can be accepted.

### G2 — Capture real school attendance structure
Support ordinary school attendance, prayer attendance, and custom school-event sessions without hard-coding each activity into the database schema.

### G3 — Automate recap work
Homeroom teachers should be able to view and export recaps without manually counting raw daily attendance.

### G4 — Remain hardware-ready
The current demo must not introduce a dead-end architecture. A physical device should later integrate through the same backend contract.

### G5 — Be portfolio-demonstrable
A recruiter should be able to understand the problem, try realistic scenarios, and see real domain behavior without owning school hardware.

---

## 4. Success metrics

For the portfolio/rebuild release, success is primarily functional and engineering-oriented:

- 100% of accepted attendance passes RFID-owner + face verification requirements where face verification is required.
- No non-target student is counted absent from a targeted session.
- No Sakit/Izin/Alpa status is generated automatically by the system.
- Attendance summary totals can be recomputed from canonical data without manual duplicate totals.
- Simulator and hardware adapters use the same domain API/contract.
- Core attendance rules have automated tests.
- Weekly, monthly, semester, annual/academic-year, and custom-range reports can be generated from persisted records.

---

## 5. Personas and roles

### 5.1 System Admin
Needs to configure the school, academic periods, classes, students, user roles, RFID/face enrollment, attendance schedules, special events, devices, and system-wide reports.

### 5.2 Homeroom Teacher (Wali Kelas)
Needs to see attendance for assigned class(es), confirm Sakit/Izin/Alpa for students with no valid school arrival attendance, review prayer/activity attendance, and export recaps.

### 5.3 Operator
Optional operational role. Needs to monitor terminal/device state, current sessions, scanning errors, and verification failures without having unrestricted administrative permissions.

### 5.4 Recruiter / Demo Visitor
Needs a safe, obvious way to try the system through simulation and understand how the physical device would behave.

### 5.5 Student
Primarily an attendance subject in the initial release. A student login is not required for MVP.

---

## 6. Functional requirements

### FR-001 Authentication and authorization

- Users authenticate to the management web application.
- Role-based access control must distinguish at minimum System Admin and Homeroom Teacher.
- Homeroom teachers can access only assigned class scope unless explicitly granted more.
- Device authentication is separate from human user authentication.

### FR-002 Student management

Admin can create, update, activate/deactivate, and view students with at minimum:

- student identifier / NIS;
- name;
- grade/class relationship;
- active academic enrollment;
- RFID UID registration;
- face enrollment state/reference;
- optional profile image.

RFID UID must be unique among active registrations.

### FR-003 Academic organization

The domain must support:

- academic year;
- semester/term;
- grade level;
- class;
- optional department/major when needed by the school model;
- homeroom teacher assignment.

Historical records must remain linked to historical class/enrollment context even if the student later changes class.

### FR-004 Attendance session templates and schedules

Admin can configure recurring and one-off sessions.

A scheduled session must support:

- name/type;
- date or recurrence;
- start/end window;
- optional late threshold;
- participant selector;
- required verification method;
- session attendance mode;
- relationship to normal calendar/event overrides;
- enabled/disabled state.

### FR-005 Participant targeting

A session may target:

- all active students;
- one or more grade levels;
- one or more classes;
- optional department/major grouping;
- selected individual students.

The resolved eligible set should be deterministically auditable for a session occurrence.

### FR-006 Regular school attendance

The system supports school arrival and school departure sessions.

For arrival, the engine can determine:

- verified on-time;
- verified late;
- no valid arrival recorded after the required session closes;
- rejected/non-attendance events.

Exact time rules are configuration, not code constants.

### FR-007 Dhuha attendance

Dhuha supports targeted recurring schedules by grade/class. The example schedule from the original school context must remain configurable.

A student outside the eligible target receives no absence penalty for that Dhuha occurrence.

### FR-008 Dzuhur and Ashar attendance

Dzuhur and Ashar are independent scheduled attendance sessions and must be reportable separately.

### FR-009 Special events and custom activities

Admin can create attendance events such as:

- 17 August ceremony;
- Friday cleaning (`Jumat Bersih`);
- other future school activities.

Events may occur outside ordinary school-day patterns and can add to, replace, or cancel normal schedule requirements according to configured policy.

### FR-010 RFID scan processing

A device/simulator submits an RFID UID.

The backend must:

1. validate device/client;
2. find the active RFID registration;
3. reject unknown/inactive cards;
4. resolve the expected student;
5. resolve the relevant active session/eligibility context;
6. continue to face verification when required.

### FR-011 Face verification

For sessions requiring face verification:

- capture/live sample is compared 1:1 with the registered RFID owner's face reference;
- threshold/version information is auditable;
- a mismatch cannot result in valid attendance;
- verification service failures are distinct from mismatches.

### FR-012 Hardware feedback outcome

Canonical outcomes map to device-facing feedback.

Required semantics:

- accepted verification → green LED + one short beep;
- face mismatch rejection → red LED + rapid repeated beeps.

Other errors should use distinct feedback mappings configurable by device firmware/adapter.

### FR-013 Duplicate handling

Repeated scans must not create unintended duplicate attendance records.

The system should preserve raw repeated events while enforcing idempotent/canonical attendance behavior.

### FR-014 Homeroom absence confirmation

When a required school arrival is not validly recorded, the system exposes the student's school-day status to the assigned homeroom teacher as requiring confirmation.

Teacher can confirm:

- Sakit;
- Izin;
- Alpa.

The system stores actor, timestamp, and change audit metadata. Optional notes/evidence remain configurable/open decision.

### FR-015 Manual correction with audit

Authorized users may need to correct attendance data for legitimate operational reasons. Corrections must be audit-trailed and must not erase immutable raw device/security events.

Exact correction permissions will be defined before implementation.

### FR-016 Daily monitoring

Management views should show at least:

- current/next attendance session;
- present/on-time count;
- late count where applicable;
- missing/unconfirmed school attendance;
- prayer/activity participation;
- recent accepted/rejected verification events;
- device status where applicable.

### FR-017 Reports

The system generates reports for:

- daily;
- weekly;
- monthly;
- semester;
- academic year / annual;
- custom range.

Reports must support student and class dimensions and distinguish school attendance from prayer/activity participation.

### FR-018 Export

Reports should be exportable in practical formats. Minimum target:

- CSV/XLSX-compatible tabular export;
- printable/PDF report.

Exact template is an open product decision.

### FR-019 Device management

Admin/operator can see registered devices and operational state such as:

- device ID/name;
- adapter type;
- online/offline/last seen;
- firmware/protocol version when available;
- capabilities (RFID, camera, LED, buzzer);
- assigned location/terminal.

### FR-020 Recruiter simulator

A simulator must allow a visitor to exercise realistic scenarios without real hardware.

Minimum scenarios:

- successful attendance;
- face mismatch;
- unknown RFID;
- duplicate attendance;
- outside/not eligible session;
- late attendance;
- device/camera verification error.

Where practical, a real browser camera verification demo may be provided using temporary demo enrollment. Scripted scenarios must be clearly identified as simulator controls.

### FR-021 Audit log

Security- and attendance-relevant actions should be auditable, including:

- accepted/rejected scans;
- user changes to attendance status;
- RFID registration changes;
- face enrollment changes;
- schedule/event changes;
- role/permission changes;
- device registration/security events.

---

## 7. Non-functional requirements

### NFR-001 Security

- least-privilege RBAC;
- device authentication;
- server-side authorization;
- no secrets in repository;
- secure handling of biometric data;
- auditability.

### NFR-002 Privacy

- minimize raw face image retention;
- separate demo and real/school data;
- configurable retention where evidence capture exists;
- document consent/governance assumptions for real deployment.

### NFR-003 Reliability

- idempotent attendance submission;
- duplicate/retry tolerance;
- raw-event preservation;
- explicit service error states;
- timezone-safe timestamps.

### NFR-004 Performance

Target interactive dashboard experience and fast terminal feedback. Exact latency SLOs will be established during implementation and measured rather than guessed.

### NFR-005 Maintainability

- domain rules isolated from UI;
- typed API/contracts;
- migrations and schema versioning;
- testable service boundaries;
- documented decisions.

### NFR-006 Demo safety

- recruiter/demo mode must not expose production credentials or real student biometrics;
- demo data can be reset/seeded reproducibly;
- temporary face enrollment should expire/delete by default.

---

## 8. MVP scope

The MVP should include:

1. authentication + roles;
2. academic year/class/student data;
3. RFID/face enrollment metadata;
4. schedule/session engine;
5. regular arrival/departure sessions;
6. Dhuha/Dzuhur/Ashar sessions;
7. one-off special events;
8. simulator through canonical device API;
9. attendance domain engine;
10. teacher Sakit/Izin/Alpa confirmation;
11. reporting and export baseline;
12. device/event/audit logs;
13. portfolio-quality dashboard/terminal UI;
14. tests for critical rules.

Physical hardware integration is not required to complete MVP, but the protocol and adapter boundary must already exist.

---

## 9. Post-MVP candidates

- actual Arduino serial bridge;
- ESP32/ESP32-CAM network integration;
- richer device fleet management;
- student/parent portal;
- notifications;
- offline device queue/sync;
- multi-school tenancy;
- advanced analytics;
- configurable report designer;
- production face-service scaling.

---

## 10. Out of scope unless explicitly approved

- payroll;
- grading/LMS;
- payment/billing;
- unrestricted 1:N facial surveillance;
- hidden demo shortcuts that bypass backend rules;
- hard-coded school calendar assumptions.

---

## 11. Release acceptance summary

A release candidate is acceptable when:

- simulator success/failure cases pass through the same attendance engine;
- face mismatch never produces valid attendance;
- targeted schedule eligibility is correct;
- special events operate outside the default calendar where configured;
- teacher confirmation updates school-day absence classification with audit;
- reports reconcile against canonical records;
- role boundaries are tested;
- documentation and `WORK.md` reflect the shipped behavior.
