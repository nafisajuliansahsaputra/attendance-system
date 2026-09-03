# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Database foundation / Phase 2  
**Coding status:** Active; web foundation and canonical database schema verified

This file is the handoff point for the next working session. Read it after `AGENTS.md` and `docs/00-SOURCE-OF-TRUTH.md`.

---

## 1. What is already locked

Product facts remain governed by `docs/00-SOURCE-OF-TRUTH.md`. Technical implementation decisions accepted on 2026-09-03:

- Main app: Next.js App Router + TypeScript + React + Tailwind CSS.
- Database: PostgreSQL on a **dedicated Supabase project for Attendance System**.
- Supabase organization: `natsx portfolio`.
- Supabase region: Singapore (`ap-southeast-1`).
- The Attendance System Supabase project is separate from Spall Spill database/Auth/Storage/keys.
- Repository starts app-first at the root; service boundaries remain explicit.
- Future face verification remains a separate Python/FastAPI boundary.
- Future Arduino USB devices use a bridge/adapter; network-capable devices may call the versioned HTTPS Device API.
- Simulator is an adapter/fixture resolver and may not bypass the canonical attendance decision engine.

---

## 2. Web/application foundation completed

- [x] Next.js/TypeScript project scaffold at repository root.
- [x] Tailwind CSS setup.
- [x] ESLint + TypeScript + Vitest scripts.
- [x] CI workflow for lint, typecheck, tests, and production build.
- [x] Direct dependencies pinned and `package-lock.json` committed for reproducible `npm ci` installs.
- [x] `/api/health` endpoint.
- [x] Pure canonical attendance decision engine.
- [x] Explicit hardware feedback mapping.
- [x] Unit coverage for accepted, late, face mismatch, unknown RFID, not eligible, duplicate, and no-session outcomes.
- [x] Versioned device-contract types started in `src/contracts/device-v1.ts`.
- [x] Recruiter terminal simulator UI.
- [x] Demo API validates requests and routes scenarios through the canonical engine.
- [x] Browser-generated buzzer feedback: one beep on success, rapid repeated beeps on face mismatch.
- [x] Application-level attendance persistence boundary added.
- [x] Simulator now routes through the same application service that future database/device adapters will use.
- [x] Persistence-boundary tests cover accepted and rejected attempts.
- [x] Foundation CI verified: install, lint, typecheck, unit tests, production build.

---

## 3. Supabase/database foundation completed

Dedicated project status: **ACTIVE_HEALTHY**.

Canonical database schema now exists live and is mirrored in repository migrations.

Implemented tables:

- `institutions`
- `academic_years`
- `terms`
- `grade_levels`
- `departments`
- `classes`
- `profiles`
- `homeroom_assignments`
- `students`
- `student_enrollments`
- `rfid_credentials`
- `face_profiles`
- `attendance_session_templates`
- `attendance_schedule_rules`
- `attendance_session_occurrences`
- `session_participants`
- `devices`
- `device_events`
- `verification_attempts`
- `attendance_records`
- `school_day_attendance`
- `attendance_confirmations`
- `audit_logs`

Database rules implemented:

- [x] historical student enrollment is separate from stable student identity;
- [x] active RFID UID uniqueness;
- [x] one active face profile per student;
- [x] generic session templates/schedules/occurrences rather than fixed Dhuha/Dzuhur/Ashar columns;
- [x] raw device events are separate from canonical attendance records;
- [x] verification attempts are separately auditable;
- [x] Sakit/Izin/Alpa confirmation history is separate from automated attendance facts;
- [x] updated-at triggers;
- [x] foreign-key indexes added for expected growth/query paths;
- [x] RLS enabled on every exposed public table;
- [x] `anon` and `authenticated` table privileges revoked for the current server-authority phase;
- [x] no privileged secret stored in GitHub;
- [x] security advisor warning for mutable function search path fixed.

Migration history:

1. `initial_attendance_domain`
2. `harden_updated_at_function`
3. `add_foreign_key_indexes`

Repository mirror:

- `supabase/migrations/20260903102755_initial_attendance_domain.sql`
- `supabase/migrations/20260903102840_harden_updated_at_function.sql`
- `supabase/migrations/20260903103000_add_foreign_key_indexes.sql`

---

## 4. Important implementation truth

The current demo does **not** claim to perform real biometric recognition yet.

Demo scenarios deterministically resolve RFID/session/face context, then invoke the canonical attendance engine. This is intentional. Real face verification will replace only the face-resolution adapter after the biometric model, enrollment flow, threshold calibration, and retention policy are approved.

The live Supabase schema exists, but the recruiter simulator is still **ephemeral** by design. The server-side Supabase secret key has not been placed in source control, and must never be. The next persistence step is to wire a server-only Supabase adapter using secure deployment/local environment variables.

---

## 5. Next implementation slice

Recommended order:

1. Add server-only Supabase configuration/adapter using `SUPABASE_URL` + `SUPABASE_SECRET_KEY` from environment only.
2. Add demo seed dataset with clearly fictional students and configurable school/session rules.
3. Implement database-backed RFID resolution.
4. Implement deterministic active-session + participant eligibility resolver with tests.
5. Implement idempotent raw-event + verification + canonical attendance persistence.
6. Make simulator optionally use database-backed mode while preserving an isolated recruiter reset path.
7. Add Supabase Auth + RBAC for System Admin and Wali Kelas.
8. Implement school-day pending-confirmation workflow for Sakit/Izin/Alpa.
9. Build first class attendance/reconciliation view.
10. Continue toward reporting and real face verification after their pending product decisions are locked.

---

## 6. Still-open product decisions

These do not block the current database foundation but must be decided before the dependent feature is finalized:

- [ ] Final brand/product name and final UI visual system.
- [ ] Final UI language strategy.
- [ ] Exact school arrival/late/departure rules.
- [ ] Exact Dhuha/Dzuhur/Ashar demo schedules.
- [ ] Missing-departure policy.
- [ ] Sakit/Izin impact on prayer/activity denominator.
- [ ] Evidence attachment requirements.
- [ ] Attendance manual-correction policy.
- [ ] MVP Operator role.
- [ ] Exact face verification library/model and threshold calibration.
- [ ] Biometric raw-image retention.
- [ ] Demo isolation/deployment topology.
- [ ] Report export templates/libraries.
- [ ] Overlapping active-session routing policy.

---

## 7. Build guardrail

Do not make a dashboard, simulator, hardware client, or database trigger the independent source of attendance truth. Every accepted/rejected outcome must remain explainable by canonical domain rules, and future real hardware must be able to reach those rules through an adapter without rewriting them.
