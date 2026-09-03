# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Schedule + Device API v1 + reporting + admin identity management / Phase 4  
**Coding status:** Active; core attendance, RBAC, homeroom reconciliation, derived reporting, exports, academic presets, schedule materialization, protected device stage 1, and admin student/RFID management implemented

This file is the handoff point for the next working session. Read it after `AGENTS.md` and `docs/00-SOURCE-OF-TRUTH.md`.

---

## 1. Locked implementation direction

- Main app: Next.js App Router + TypeScript + React + Tailwind CSS.
- Database: PostgreSQL on a dedicated Supabase project for Attendance System.
- Supabase organization: `natsx portfolio`.
- Supabase region: Singapore (`ap-southeast-1`).
- Attendance System is isolated from Spall Spill database/Auth/Storage/keys.
- Simulator and future physical devices must reach the same canonical attendance engine.
- Overlapping unresolved sessions fail closed.
- Supabase Auth proves staff identity; `profiles` and `homeroom_assignments` own authorization.
- Direct browser table access stays closed in the current server-authoritative architecture.
- There is no public staff sign-up in the MVP.
- The first application staff profile must be `SYSTEM_ADMIN`; later provisioning requires an existing active System Admin actor.
- Device clients never declare authoritative student/class/session truth; those are resolved server-side.
- Device credentials are independent from human staff credentials.
- Schedule occurrences must be materialized from configuration so a day with zero scans can still become a required attendance day.
- Admin credential replacement must preserve historical credential/audit data rather than deleting prior identity records.

---

## 2. Attendance engine completed

- [x] Next.js/TypeScript/Tailwind scaffold and reproducible lockfile.
- [x] CI: install, lint, typecheck, unit tests, production build.
- [x] Canonical attendance decision engine and original LED/buzzer semantics.
- [x] Public recruiter terminal simulator using canonical decision logic.
- [x] Ephemeral demo persistence by default.
- [x] Server-only Supabase configuration and privileged RPC transport.
- [x] Database RFID/student/enrollment/session/eligibility context resolver.
- [x] Replaceable face-verifier boundary.
- [x] Raw scan orchestration: context resolve → face verify → canonical engine → persistence.
- [x] Atomic/idempotent attendance persistence.
- [x] Explicit `NOT_REQUIRED` biometric audit state for sessions that do not require face verification.
- [x] Fail-closed overlapping-session guard.
- [x] Regression coverage for accepted/late/mismatch/unknown/not-eligible/duplicate/no-session and orchestration behavior.

The real face model/service is still intentionally not implemented. The boundary exists, but no fake production biometric verification is claimed.

---

## 3. Staff Auth/RBAC completed

Pinned Auth dependencies:

- `@supabase/ssr` 0.12.5
- `@supabase/supabase-js` 2.114.0
- Node 22+

Implemented:

- [x] Supabase browser Auth client using publishable key only.
- [x] Supabase server Auth client using cookies.
- [x] Next.js `proxy.ts` session refresh for protected staff routes.
- [x] `/dashboard` and nested admin tools protected; `/teacher` protected; `/terminal` remains public.
- [x] Server guard uses verified Auth `sub` only as identity bridge.
- [x] Roles/classes resolved from canonical application database, not user metadata.
- [x] Internal email/password login, sign-out, unauthorized/profile-missing states.
- [x] SYSTEM_ADMIN/OPERATOR dashboard shell.
- [x] Authorization context validation tests, including rejection of unknown roles.

Privileged server-only RPCs now include:

- `get_user_authorization_context`
- `get_homeroom_attendance_snapshot`
- `confirm_school_day_status`
- `provision_staff_profile`
- `get_class_attendance_report`
- `get_reporting_period_presets`
- `get_admin_student_directory`
- `assign_student_rfid`

`anon` and `authenticated` do not receive direct execute permission for these privileged application RPCs.

---

## 4. Homeroom reconciliation completed

`/teacher` supports:

- authorized class selector;
- date selector;
- Hadir / Terlambat / Perlu Konfirmasi / S-I-A summary;
- historical roster;
- canonical arrival timestamp/status;
- Sakit/Izin/Alpa actions only when attendance was required and no valid arrival exists;
- optional teacher note;
- confirmation history + audit logging.

Critical rule: valid machine arrival attendance cannot be converted to Sakit/Izin/Alpa through the normal homeroom workflow.

Before daily homeroom data is resolved, the relevant schedule date is materialized so missing scans do not erase attendance obligations.

---

## 5. Secure staff provisioning completed

Live RPC: `provision_staff_profile`.

Rules:

- actor-less bootstrap is allowed only while `profiles` is empty;
- initial bootstrap must be `SYSTEM_ADMIN`;
- after bootstrap, an active System Admin from the same institution must be supplied as actor;
- Homeroom Teacher requires valid class + academic year and receives a homeroom assignment;
- provisioning writes audit evidence;
- RPC is service-role-only.

Repository tooling:

- `scripts/provision-staff.mjs`
- `npm run staff:provision`
- `npm run staff:provision:env`
- `docs/11-STAFF-PROVISIONING.md`

The script creates the Supabase Auth user, links the canonical application profile, and removes the Auth user again if application provisioning fails.

**No real staff account has been created yet.** Credentials must never be hardcoded or committed.

---

## 6. Schedule occurrence materialization completed

Schedule configuration is no longer dependent on hand-seeded daily occurrence rows.

Live functionality:

- [x] materialize arbitrary date ranges from `attendance_schedule_rules`;
- [x] supported recurrence subset: one-off rules, `FREQ=DAILY`, `FREQ=WEEKLY`, `BYDAY`, `INTERVAL`;
- [x] unsupported RRULE keys/frequencies fail closed instead of being partially interpreted;
- [x] correct weekly interval anchoring even when `starts_on` is mid-week;
- [x] occurrence creation is idempotent per source rule + school date;
- [x] occurrence keeps template/time/target snapshots;
- [x] participant snapshot is resolved from historical enrollment on the occurrence date;
- [x] target support: `ALL_STUDENTS`, `GRADE_LEVELS`, `CLASSES`, `DEPARTMENTS`, `SELECTED_STUDENTS`;
- [x] schedule relationships: `NORMAL`, `ADDITIVE`, `REPLACE_NORMAL`, `CANCEL_NORMAL`;
- [x] replacement/cancellation cannot silently destroy canonical attendance history;
- [x] reports and homeroom reads materialize required ranges before deriving attendance;
- [x] Device API lazily materializes the current device time before resolving sessions.

This is essential for absence truth: even when nobody scans, a required occurrence and participant set can still exist.

---

## 7. Device API v1 stage 1 completed

Implemented routes:

- `POST /api/device/v1/heartbeat`
- `POST /api/device/v1/card-scan`

Device authentication model:

- device identifies itself with its UUID and protocol version;
- random device secret is supplied as Bearer credential over HTTPS;
- database stores only the SHA-256 hash of the secret;
- plaintext device secret is never stored in the repository or database;
- disabled/revoked devices are rejected;
- protocol version mismatch is explicit;
- heartbeat updates device `last_seen_at`.

Repository tooling:

- `scripts/rotate-device-secret.mjs`
- `npm run device:rotate-secret`
- `npm run device:rotate-secret:env`

Stage 1 card flow:

1. authenticate device;
2. validate request timestamp against replay/clock-skew window;
3. materialize schedule around the device event time;
4. resolve RFID owner + historical enrollment + active session + eligibility;
5. fail closed on overlapping unresolved sessions;
6. return a normalized machine-readable stage result.

Possible stage results include:

- `CAPTURE_FACE`
- `ACCEPT_WITHOUT_FACE`
- `UNKNOWN_CARD`
- `NO_ACTIVE_SESSION`
- `NOT_ELIGIBLE`
- `DUPLICATE_ATTENDANCE`
- `FACE_PROFILE_MISSING`

The device does not submit authoritative institution/student/class/session IDs for attendance truth.

---

## 8. Verification transaction boundary completed

Canonical table: `device_verification_transactions`.

Purpose:

- bind Stage 1 RFID identity to the expected student;
- bind device + session occurrence + active face profile;
- prevent Stage 2 from changing the expected person/session;
- expire the transaction quickly;
- preserve idempotency through request identifiers.

Transactions are short-lived and server-only. Browser roles do not have direct table access.

**Stage 2 face sample transport and real 1:1 biometric verification are still pending.** Do not mark them complete until an actual face engine, calibrated threshold, quality/liveness behavior, and retention policy are selected and implemented.

---

## 9. Derived report engine completed

Live server-only RPC: `get_class_attendance_report(actor, class, start_date, end_date)`.

Properties:

- verifies active actor role and class scope;
- accepts arbitrary date range up to 550 days;
- materializes the requested schedule range before deriving totals;
- computes formal school attendance from required `SCHOOL_ARRIVAL` student-days;
- uses canonical attendance + final teacher confirmation;
- returns per-student and class totals for required/present/late/sakit/izin/alpa/pending;
- separately returns raw session participation by type.

Prayer/activity participation remains raw. No Dhuha/Dzuhur/Ashar percentage is generated until the Sakit/Izin denominator policy is locked.

UI:

- `/teacher/reports`
- authorized class selector;
- custom date range;
- presets derived from canonical school data: 7 days, current month, started semester(s), active academic year;
- future terms are hidden and current semester/academic-year ranges are clipped to the current school date so future required days are never counted as pending;
- class summary cards;
- per-student table;
- raw session participation cards.

Live reporting-period data currently resolves:

- Academic Year: `2026/2027` (`2026-07-01` → `2027-06-30`)
- Semester Ganjil: `2026-07-01` → `2026-12-31`
- Semester Genap: `2027-01-01` → `2027-06-30`

These are fictional portfolio fixtures and are not claims about a real school schedule.

---

## 10. Report exports implemented

Current no-extra-dependency export strategy:

### Excel-compatible CSV

Protected route:

- `GET /api/reports/class/csv?class=...&from=...&to=...`

Behavior:

- requires authorized Homeroom Teacher/System Admin session;
- reuses the same derived report engine as the UI;
- UTF-8 BOM + semicolon CSV for practical Excel compatibility;
- stable sanitized filename;
- spreadsheet formula injection protection for text beginning with `=`, `+`, `-`, or `@`;
- `no-store` response headers because attendance reports are sensitive.

### Print / Save as PDF

Protected page:

- `/teacher/reports/print?class=...&from=...&to=...`

Behavior:

- reuses the same report engine;
- A4 landscape print stylesheet;
- formal summary, per-student table, session participation, and policy notes;
- browser Print dialog can print physically or Save as PDF.

A native binary `.xlsx` or direct server-generated PDF can be added later if a final library/template requirement justifies another dependency.

---

## 11. Admin student + RFID workspace completed

Protected page:

- `/dashboard/students`

Scope:

- SYSTEM_ADMIN only;
- search by student name, NIS, or active RFID UID;
- filter by active class;
- show active enrollment/class;
- show active RFID UID;
- show active face-profile status/model metadata without exposing the biometric template/reference;
- assign a first RFID card;
- replace an active RFID card;
- preserve the old credential as `REPLACED` rather than deleting it;
- optional replacement note;
- write an audit log for a new RFID assignment.

Database invariant added:

- maximum one `ACTIVE` RFID credential per student;
- active UID remains unique within the institution.

Assignment behavior:

- assigning the same already-active UID to the same student is idempotent/unchanged;
- assigning an active UID that belongs to another student fails with `RFID_UID_IN_USE`;
- replacing a card revokes the previous active credential into `REPLACED` state before inserting the new active credential.

Face-profile writes are intentionally not exposed here yet because Stage 2 biometric enrollment/verification policy is still open.

---

## 12. Supabase live state

Dedicated project status: **ACTIVE_HEALTHY**.

The public domain currently has 24 canonical tables including `device_verification_transactions`. All public tables remain RLS-enabled and browser table access remains default-deny.

Live migration history:

1. `initial_attendance_domain`
2. `harden_updated_at_function`
3. `add_foreign_key_indexes`
4. `persist_resolved_attendance_attempt_rpc`
5. `resolve_attendance_context_rpc`
6. `homeroom_authorization_workflow`
7. `staff_provisioning_and_class_reports`
8. `restrict_initial_staff_bootstrap`
9. `schedule_occurrence_materialization`
10. `device_authentication_and_stage_one`
11. `harden_schedule_recurrence_parser`
12. `index_device_verification_foreign_keys`
13. `reporting_period_presets`
14. `admin_student_directory_and_rfid`

Security posture:

- `anon` → no direct privileged RPC/table access;
- `authenticated` → no direct privileged RPC/table access;
- server/service role → privileged execution through controlled application paths;
- `get_reporting_period_presets`, `get_admin_student_directory`, and `assign_student_rfid` are verified service-role-only;
- RLS `enabled no policy` advisor items remain intentional default-deny behavior;
- verification-transaction foreign keys have covering indexes.

---

## 13. Reproducible fictional seed

`supabase/seed.sql` contains synthetic portfolio data only:

- `SMK Cakrawala Digital (Fiktif)`;
- academic year 2026/2027;
- X RPL 1 and XI RPL 1;
- four fictional students and RFID credentials;
- demo face references only;
- recurring arrival, class-X Dhuha, and one-off 17 August ceremony rules;
- simulator device.

Seeded occurrence fixtures still exist for deterministic historical/demo verification, but normal runtime ranges no longer rely on those fixtures because schedule materialization is implemented.

No real school/student biometric data is present.

---

## 14. Verification gates

Recent implementation chain is green through GitHub CI:

- dependency install ✅
- lint ✅
- TypeScript typecheck ✅
- unit tests ✅
- production build ✅

Current regression coverage includes:

- attendance decision engine;
- orchestration/persistence mapping;
- device stage resolution + timestamp guard;
- schedule/report parser boundaries;
- academic report preset future-date clipping;
- CSV formula-injection protection;
- admin student directory payload parsing.

Database checks completed for:

- schedule materialization behavior;
- participant snapshots;
- reporting-period data;
- device/RPC privileges;
- single-active-RFID-per-student index;
- service-role-only admin/report RPC execution.

After any new code change, the latest `main` CI must be green before declaring that slice complete.

---

## 15. Next implementation slice

Recommended order from the current state:

1. Expand admin management from students/RFID to classes/enrollments and schedule configuration.
2. Add device registry/monitoring UI (status, type, protocol version, last seen, credential rotation workflow) with final Operator permissions decided first.
3. Add protected in-app staff provisioning UI on top of the existing secure provisioning backend.
4. Design the Stage 2 face verification contract in detail: face sample upload/reference, quality failure, liveness policy, model/version, calibrated threshold, transaction consumption, replay behavior.
5. Choose and implement the actual face engine only after the Stage 2/biometric policy is locked.
6. Build a local Arduino/USB serial bridge adapter against Device API v1 when hardware integration work begins.
7. Add native `.xlsx` or server-generated PDF only if the portfolio/real-school export requirement needs more than current CSV + browser PDF.
8. Provision the first real/demo SYSTEM_ADMIN only through secure environment credentials, then run true login → profile → dashboard E2E.
9. Keep public recruiter terminal ephemeral unless isolated database sandbox/reset semantics are implemented.

---

## 16. Still-open product decisions

- [ ] Final brand/product name and UI visual system.
- [ ] UI language strategy.
- [ ] Exact production arrival/late/departure rules.
- [ ] Exact recurring Dhuha/Dzuhur/Ashar production schedules.
- [ ] Missing-departure policy.
- [ ] Sakit/Izin impact on prayer/activity denominator.
- [ ] Evidence attachment requirements.
- [ ] Manual correction approval model outside normal homeroom confirmation.
- [ ] Final Operator scope.
- [ ] Face verification model and calibrated threshold.
- [ ] Face quality/liveness policy.
- [ ] Biometric raw-image/template retention.
- [ ] Stage 2 face sample transport method.
- [ ] Database-backed recruiter sandbox isolation details.
- [ ] Whether native XLSX/direct binary PDF is required beyond CSV + browser PDF.
- [ ] Final overlapping-session routing priority.

---

## 17. Build guardrail

Keep these authorities separate:

- Supabase Auth → human staff identity;
- application profiles/assignments → human authorization;
- device secret + device registry → terminal identity;
- schedule rules → attendance obligation generation;
- participant snapshot → occurrence eligibility truth;
- RFID + face + session engine → attendance truth;
- admin credential management → student identity credentials, never attendance truth;
- homeroom confirmation → reason for a missing required school arrival;
- canonical records + confirmations → reports;
- export views → presentation only, never a new source of attendance truth.

No browser metadata, UI counter, export file, convenience RPC, or hardware client may replace those authorities.
