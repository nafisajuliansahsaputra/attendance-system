# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Staff Auth/RBAC + derived reporting / Phase 3  
**Coding status:** Active; attendance orchestration, staff authorization, homeroom reconciliation, secure provisioning, and class reports implemented

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

---

## 2. Attendance engine/device path completed

- [x] Next.js/TypeScript/Tailwind scaffold and reproducible lockfile.
- [x] CI: install, lint, typecheck, unit tests, production build.
- [x] Canonical attendance decision engine and original LED/buzzer semantics.
- [x] Versioned device contract boundary.
- [x] Public recruiter terminal simulator using canonical decision logic.
- [x] Ephemeral demo persistence by default.
- [x] Server-only Supabase configuration and privileged RPC transport.
- [x] Database RFID/student/enrollment/session/eligibility context resolver.
- [x] Replaceable face-verifier boundary.
- [x] Raw scan orchestration: context resolve → face verify → canonical engine → persistence.
- [x] Atomic/idempotent attendance persistence.
- [x] Fail-closed overlapping-session guard.
- [x] Regression coverage for accepted/late/mismatch/unknown/not-eligible/duplicate/no-session and orchestration behavior.

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
- [x] `/dashboard`, `/teacher`, `/admin` protected; `/terminal` remains public.
- [x] Server guard uses verified Auth `sub` only as identity bridge.
- [x] Roles/classes resolved from canonical application database, not user metadata.
- [x] Internal email/password login, sign-out, unauthorized/profile-missing states.
- [x] SYSTEM_ADMIN/OPERATOR dashboard shell.
- [x] Authorization context validation tests, including rejection of unknown roles.

Database authorization RPCs:

- `get_user_authorization_context`
- `get_homeroom_attendance_snapshot`
- `confirm_school_day_status`

All are service-role-only; `anon` and `authenticated` cannot call them directly.

---

## 4. Homeroom reconciliation completed

`/teacher` now supports:

- authorized class selector;
- date selector;
- Hadir / Terlambat / Perlu Konfirmasi / S-I-A summary;
- historical roster;
- canonical arrival timestamp/status;
- Sakit/Izin/Alpa actions only when attendance was required and no valid arrival exists;
- optional teacher note;
- confirmation history + audit logging.

Critical rule: valid machine arrival attendance cannot be converted to Sakit/Izin/Alpa through the normal homeroom workflow.

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
- `npm run staff:provision:env` (loads `.env.local` through Node 22 `--env-file`)
- `docs/11-STAFF-PROVISIONING.md`

The script:

1. creates the Supabase Auth user server-side;
2. links canonical staff profile/assignment through the provisioning RPC;
3. deletes the newly-created Auth user if profile provisioning fails, avoiding orphan accounts.

**No real staff account has been created yet.** That remains intentional because no real staff email/password/server secret has been supplied as a secure runtime environment. Credentials must never be hardcoded or committed.

---

## 6. Derived report engine completed

Live server-only RPC: `get_class_attendance_report(actor, class, start_date, end_date)`.

Properties:

- verifies active actor role and class scope;
- accepts arbitrary date range up to 550 days;
- computes school attendance from required `SCHOOL_ARRIVAL` student-days;
- uses canonical attendance + final teacher confirmation;
- returns per-student totals for:
  - required days
  - present
  - late
  - sakit
  - izin
  - alpa
  - pending
- returns class totals;
- separately returns raw session participation by type (`scheduledParticipations` vs `attendedParticipations`).

Important policy separation:

Prayer/activity participation currently stays raw. No Dhuha/Dzuhur/Ashar attendance percentage is generated until the still-open Sakit/Izin denominator policy is decided.

UI:

- `/teacher/reports`
- authorized class selector;
- custom date range;
- presets: 7 days, current month, current calendar year;
- class summary cards;
- per-student table;
- raw session participation cards;
- homeroom navigation between daily attendance and reports.

Seed factual verification for class X on 2026-09-03:

- 2 active students;
- 2 required SCHOOL_ARRIVAL student-days;
- SCHOOL_ARRIVAL: 2 scheduled participations, 0 attended in clean seed;
- DHUHA: 2 scheduled participations, 0 attended in clean seed.

The zero attended values are expected because the fictional seed does not pre-insert canonical attendance scans.

---

## 7. Supabase live state

Dedicated project status: **ACTIVE_HEALTHY**.

Public domain schema still contains 23 canonical tables. All public tables remain RLS-enabled and browser table access remains default-deny.

Live migration history:

1. `initial_attendance_domain`
2. `harden_updated_at_function`
3. `add_foreign_key_indexes`
4. `persist_resolved_attendance_attempt_rpc`
5. `resolve_attendance_context_rpc`
6. `homeroom_authorization_workflow`
7. `staff_provisioning_and_class_reports`
8. `restrict_initial_staff_bootstrap`

Permissions verified for provisioning/reporting:

- `anon` → no execute;
- `authenticated` → no direct execute;
- `service_role` → execute allowed.

Security advisor after current migrations has no warning-level issue; informational `RLS enabled no policy` notices are expected because browser access is intentionally closed.

---

## 8. Reproducible fictional seed

`supabase/seed.sql` contains synthetic portfolio data only:

- `SMK Cakrawala Digital (Fiktif)`;
- academic year 2026/2027;
- X RPL 1 and XI RPL 1;
- four fictional students and RFID credentials;
- demo face references only;
- arrival, class-X Dhuha, and 17 August ceremony fixtures;
- participant rows and simulator device.

No real school/student biometric data is present.

---

## 9. Verification gates

Auth/RBAC slice completed CI successfully.

The subsequent provisioning/report slice was verified through:

- successful DB migrations;
- service-role/anon/authenticated permission checks;
- seed report fact query;
- strict report parser tests;
- successful lint/typecheck/unit-test/production-build gate on the implementation chain before the final documentation/script-only commits.

After any new code changes, rerun the normal GitHub CI before declaring the next implementation slice complete.

---

## 10. Next implementation slice

Recommended order:

1. When secure credentials are available outside GitHub, provision the first SYSTEM_ADMIN and run true login → profile → `/dashboard` E2E.
2. Provision a fictional/demo Homeroom Teacher through the System Admin flow only if a secure non-hardcoded credential strategy is chosen for portfolio testing.
3. Add academic semester and academic-year report presets (the underlying arbitrary-range report already supports them).
4. Implement schedule-occurrence materialization from recurrence rules so normal weeks/months/years do not depend on hand-seeded occurrences.
5. Add versioned device authentication before a real hardware endpoint is exposed.
6. Build a protected hardware/device scan API around the existing raw scan orchestration service.
7. Add Excel/PDF report exports only after export format/template is selected.
8. Add admin UI for students/classes/schedules/staff provisioning.
9. Keep public recruiter terminal ephemeral unless isolated database sandbox/reset semantics are implemented.
10. Continue to real face verification only after model, threshold calibration, liveness/quality, and biometric retention decisions are locked.

---

## 11. Still-open product decisions

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
- [ ] Biometric raw-image/template retention.
- [ ] Database-backed recruiter sandbox isolation details.
- [ ] Report export template/library.
- [ ] Final overlapping-session routing priority.

---

## 12. Build guardrail

Keep these authorities separate:

- Supabase Auth → identity;
- application profiles/assignments → authorization;
- RFID + face + session engine → attendance truth;
- homeroom confirmation → reason for a missing required school arrival;
- canonical records + confirmations → reports.

No browser metadata, UI counter, convenience RPC, or hardware client may replace those authorities.
