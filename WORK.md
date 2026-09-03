# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Staff Auth/RBAC + homeroom reconciliation / Phase 3  
**Coding status:** Active; attendance orchestration, server-authoritative staff access, and first homeroom workflow verified

This file is the handoff point for the next working session. Read it after `AGENTS.md` and `docs/00-SOURCE-OF-TRUTH.md`.

---

## 1. Locked implementation direction

- Main app: Next.js App Router + TypeScript + React + Tailwind CSS.
- Database: PostgreSQL on a dedicated Supabase project for Attendance System.
- Supabase organization: `natsx portfolio`.
- Supabase region: Singapore (`ap-southeast-1`).
- Attendance System is isolated from Spall Spill database/Auth/Storage/keys.
- Repository is app-first at the root with explicit domain/application/infrastructure boundaries.
- Future face verification stays behind a Python/FastAPI boundary.
- Future Arduino USB uses an adapter/bridge; network-capable hardware can use the versioned HTTPS Device API.
- Simulator and real hardware must reach the same canonical attendance engine.
- Overlapping unresolved sessions fail closed; no arbitrary first-row routing.
- Supabase Auth proves staff identity; canonical application tables own role and class authorization.
- Direct browser table access remains closed in the current architecture.
- No public staff sign-up in the current MVP; accounts are provisioned internally.

---

## 2. Attendance application foundation completed

- [x] Next.js/TypeScript/Tailwind scaffold.
- [x] Reproducible `npm ci` installs with committed lockfile.
- [x] CI for lint, typecheck, unit tests, and production build.
- [x] `/api/health`.
- [x] Canonical attendance decision engine.
- [x] Hardware feedback semantics for success and face mismatch.
- [x] Unit coverage for accepted, late, face mismatch, unknown RFID, not eligible, duplicate, and no-session outcomes.
- [x] Versioned device-contract types started.
- [x] Recruiter terminal simulator.
- [x] Demo API routed through the canonical engine.
- [x] Browser buzzer simulation.
- [x] Application-level persistence interface.
- [x] Ephemeral demo persistence adapter.
- [x] Server-only Supabase configuration contract.
- [x] Privileged Supabase RPC transport using environment-only `SUPABASE_SECRET_KEY`.
- [x] Supabase attendance persistence adapter.
- [x] Database context resolver interface.
- [x] Supabase RFID/student/session/eligibility context adapter.
- [x] Context-to-canonical-attempt mapper.
- [x] Fail-closed multiple-session selection guard.
- [x] Replaceable `FaceVerifier` boundary.
- [x] Deterministic demo face-verifier adapter for future sandbox use.
- [x] Raw scan orchestration service: resolve → face verify → canonical engine → persist.
- [x] Orchestration tests for accepted scan, unknown RFID short-circuit, and face mismatch audit persistence.

---

## 3. Staff Auth/RBAC completed in code

Dependencies are pinned and locked:

- `@supabase/ssr` 0.12.5
- `@supabase/supabase-js` 2.114.0
- Node runtime baseline raised to 22+

Implemented:

- [x] Supabase browser Auth client using publishable key only.
- [x] Supabase server Auth client using request cookies.
- [x] Next.js `proxy.ts` session refresh for protected staff routes.
- [x] Protected route prefixes: `/dashboard`, `/teacher`, `/admin`.
- [x] Public `/terminal` remains recruiter-accessible without staff login.
- [x] Server guard verifies Supabase Auth claims, then uses only `sub` as identity.
- [x] Role/class authorization comes from database `profiles` + `homeroom_assignments`, not user metadata.
- [x] Internal email/password login page; no public sign-up.
- [x] Sign-out route.
- [x] Unauthorized/profile-missing states.
- [x] SYSTEM_ADMIN/OPERATOR dashboard shell.
- [x] Strict Zod validation for authorization context.
- [x] Regression test rejects unknown `SUPERUSER` role.
- [x] Temporary writable lockfile workflow removed after lock synchronization; normal CI is read-only again.

Important runtime truth: **there is no real staff Auth account/profile provisioned yet**. The Auth and RBAC code is ready, but an initial staff user must be created through a secure provisioning path before interactive login can be tested end-to-end.

---

## 4. Homeroom workflow completed

Live server-only database functions now include:

### `get_user_authorization_context`

- active application profile required;
- institution-local school date;
- SYSTEM_ADMIN receives institution classes;
- HOMEROOM_TEACHER receives only classes assigned for that academic year/date;
- unknown user returns no authorization context.

### `get_homeroom_attendance_snapshot`

- verifies actor profile and institution;
- verifies class scope for homeroom teacher;
- lists the historical enrolled roster for the requested class/date;
- derives valid school-arrival presence from canonical attendance records;
- exposes `PRESENT_ON_TIME`, `PRESENT_LATE`, `NOT_SCHEDULED`, `PENDING_CONFIRMATION`, or persisted absence state;
- never invents Sakit/Izin/Alpa.

### `confirm_school_day_status`

- accepts only `SAKIT`, `IZIN`, `ALPA`;
- verifies actor class scope;
- requires that school-arrival attendance was actually required;
- rejects confirmation if valid school-arrival attendance exists;
- updates canonical school-day final status;
- appends `attendance_confirmations` history;
- appends `audit_logs` evidence.

Permission verification:

- [x] `anon` cannot execute authorization/snapshot/confirmation RPCs.
- [x] `authenticated` cannot execute those RPCs directly.
- [x] server `service_role` can execute them.
- [x] unknown fake user is denied authorization context.

First `/teacher` workspace now includes:

- authorized-class selector;
- date selector;
- Hadir / Terlambat / Perlu Konfirmasi / S-I-A summary cards;
- historical roster table;
- arrival timestamp;
- status badges;
- Sakit/Izin/Alpa confirmation actions only for pending rows;
- optional note;
- audit-backed confirmation feedback.

---

## 5. Supabase/database foundation

Dedicated project status: **ACTIVE_HEALTHY**.

The database currently contains 23 canonical tables for institution/academic structure, staff profiles/assignments, students/enrollments, RFID, face references, scheduling, participants, devices, raw events, verification attempts, canonical attendance, school-day status, teacher confirmations, and audit logs.

Live migration history includes:

1. `initial_attendance_domain`
2. `harden_updated_at_function`
3. `add_foreign_key_indexes`
4. `persist_resolved_attendance_attempt_rpc`
5. `resolve_attendance_context_rpc`
6. `homeroom_authorization_workflow`

Security posture:

- all public tables RLS-enabled;
- browser table grants remain default-deny;
- privileged RPCs are service-role-only;
- no privileged credential committed;
- security advisor has no warning-level issue from current changes; only informational no-policy notices are expected under current closed browser model.

---

## 6. Reproducible fictional demo seed

`supabase/seed.sql` contains synthetic portfolio data only:

- `SMK Cakrawala Digital (Fiktif)`;
- academic year 2026/2027;
- grade X and XI;
- fictional RPL classes;
- four fictional students + RFID credentials;
- demo face references only;
- arrival, class-X Dhuha, and 17 August ceremony occurrences;
- participants and simulator device.

No real student/school biometric data is present.

---

## 7. Latest verification gate

Latest Auth/RBAC code slice passed:

- [x] dependency install;
- [x] lint;
- [x] TypeScript typecheck;
- [x] unit tests;
- [x] Next.js production build.

CI caught one strict-null claims issue during development; it was fixed before this handoff.

---

## 8. Next implementation slice

Recommended order:

1. Add a secure, reproducible initial staff provisioning/bootstrap workflow without hardcoded credentials.
2. Provision one SYSTEM_ADMIN or HOMEROOM_TEACHER test account when secure credentials can be supplied outside GitHub.
3. Run actual Auth → profile → class-scope → `/teacher` end-to-end test.
4. Build the first derived class attendance report with arbitrary date range, suitable for weekly/monthly/semester/yearly presets.
5. Keep school-attendance summary independent from the still-open prayer/activity denominator policy.
6. Add schedule-occurrence materialization from configured rules instead of relying only on pre-seeded occurrences.
7. Add versioned device authentication before exposing a real hardware endpoint.
8. Add report export after the canonical report query is verified.
9. Keep recruiter terminal ephemeral unless isolated database sandbox/reset semantics are implemented.
10. Continue to real face verification only after model/threshold/retention decisions are locked.

---

## 9. Still-open product decisions

- [ ] Final brand/product name and UI visual system.
- [ ] UI language strategy.
- [ ] Exact school arrival/late/departure production rules.
- [ ] Exact Dhuha/Dzuhur/Ashar demo schedules.
- [ ] Missing-departure policy.
- [ ] Sakit/Izin impact on prayer/activity denominator.
- [ ] Evidence attachment requirements.
- [ ] Manual correction approval model outside normal homeroom confirmation.
- [ ] MVP Operator scope.
- [ ] Face verification model and threshold calibration.
- [ ] Biometric raw-image retention.
- [ ] Database-backed sandbox isolation details.
- [ ] Report export template/library.
- [ ] Final overlapping-session priority/device routing policy.

---

## 10. Build guardrail

Authentication, authorization, attendance truth, and absence reasoning stay separate:

- Supabase Auth proves identity;
- application profiles/assignments authorize role and scope;
- RFID/face/session domain logic decides valid attendance;
- homeroom teacher supplies absence reason only when no valid arrival exists;
- reports derive from canonical records and confirmations.

No UI, browser token metadata, dashboard counter, or database convenience layer may replace those authorities.
