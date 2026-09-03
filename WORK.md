# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Database-backed attendance foundation / Phase 2  
**Coding status:** Active; web, database schema, and persistence contract verified

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

---

## 2. Application foundation completed

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
- [x] Persistence payload mapping tests.
- [x] Latest CI slice passes install, lint, typecheck, unit tests, and production build.

---

## 3. Supabase/database foundation completed

Dedicated project status: **ACTIVE_HEALTHY**.

The live database contains 23 canonical tables covering institution/academic structure, users/roles, students/enrollments, RFID, face-profile references, session scheduling, participants, devices, raw events, verification attempts, canonical attendance, school-day status, teacher confirmations, and audit logs.

Security/data rules already implemented:

- [x] historical enrollment separate from student identity;
- [x] active RFID UID uniqueness;
- [x] one active face profile per student;
- [x] generic attendance session model;
- [x] raw device events separate from canonical attendance;
- [x] verification attempts separately auditable;
- [x] Sakit/Izin/Alpa confirmation history separated from automated facts;
- [x] RLS enabled on every public table;
- [x] current browser roles default-deny (`anon`/`authenticated` table privileges revoked);
- [x] updated-at function search path hardened;
- [x] foreign-key indexes added;
- [x] no privileged key committed to GitHub;
- [x] security advisor has no warning-level finding introduced by the persistence RPC.

Live migration history:

1. `initial_attendance_domain`
2. `harden_updated_at_function`
3. `add_foreign_key_indexes`
4. `persist_resolved_attendance_attempt_rpc`

The fourth migration adds an atomic, idempotent `persist_resolved_attendance_attempt` RPC. It records the final device event and verification attempt, and creates canonical attendance only when the application/domain outcome was accepted. It validates basic cross-institution/device integrity but does not independently decide whether attendance should be accepted.

Repository migrations mirror the live schema under `supabase/migrations/`.

---

## 4. Important truth about current runtime

The recruiter simulator still uses the **ephemeral adapter by default**. This is intentional: fake demo IDs are not inserted into the production-shaped database.

A real Supabase persistence adapter now exists, but it only becomes active when a real database-backed resolver provides actual institution/device/student/session UUIDs and the backend runtime has `SUPABASE_URL` + `SUPABASE_SECRET_KEY` configured securely.

Real biometric recognition is also not implemented yet. Demo face results are deterministic fixtures that still pass through the canonical attendance engine.

---

## 5. Next implementation slice

1. Add a reproducible fictional demo seed dataset.
2. Implement database-backed RFID lookup/resolution.
3. Implement active-session resolution from occurrences and participant eligibility.
4. Add resolver tests for normal arrival, Dhuha targeting, special events, no-session, and non-eligible students.
5. Register a real simulator device row and switch an isolated database demo mode to real UUID-backed fixtures.
6. Verify the atomic persistence RPC end-to-end against seeded data, including idempotent replay.
7. Add Supabase Auth + RBAC for System Admin and Wali Kelas.
8. Implement school-day pending confirmation for Sakit/Izin/Alpa.
9. Build the first wali-kelas attendance/reconciliation view.
10. Then continue to reporting and real biometric integration.

---

## 6. Still-open product decisions

- [ ] Final brand/product name and UI visual system.
- [ ] UI language strategy.
- [ ] Exact school arrival/late/departure production rules.
- [ ] Exact Dhuha/Dzuhur/Ashar demo schedules.
- [ ] Missing-departure policy.
- [ ] Sakit/Izin impact on prayer/activity denominator.
- [ ] Evidence attachment requirements.
- [ ] Manual-correction policy.
- [ ] MVP Operator role.
- [ ] Face verification model and threshold calibration.
- [ ] Biometric raw-image retention.
- [ ] Demo isolation/deployment topology.
- [ ] Report export templates/libraries.
- [ ] Overlapping active-session routing policy.

---

## 7. Build guardrail

Do not make the dashboard, simulator, hardware client, database trigger, or persistence RPC the independent source of attendance truth. Acceptance/rejection remains an application-domain decision. Persistence records that decision safely and future physical hardware must be able to use the same path through an adapter.
