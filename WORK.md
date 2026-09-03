# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Database-backed attendance resolution / Phase 2  
**Coding status:** Active; seed, context resolution, persistence, and CI verified

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
- [x] Database context resolver interface.
- [x] Supabase RFID/student/session/eligibility context adapter.
- [x] Context-to-canonical-attempt mapper.
- [x] Fail-closed multiple-session selection guard.
- [x] Context/persistence mapping tests.
- [x] Latest CI passes install, lint, typecheck, unit tests, and production build.

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
- [x] server RPCs executable only by `service_role`;
- [x] updated-at function search path hardened;
- [x] foreign-key indexes added;
- [x] no privileged key committed to GitHub;
- [x] security advisor shows no warning-level issue introduced by current RPCs.

Live migration history now includes:

1. `initial_attendance_domain`
2. `harden_updated_at_function`
3. `add_foreign_key_indexes`
4. `persist_resolved_attendance_attempt_rpc`
5. `resolve_attendance_context_rpc`

### Atomic persistence RPC

`persist_resolved_attendance_attempt` records the final device event and verification attempt, and creates canonical attendance only when the application/domain outcome was accepted. It is idempotent for request replay.

Verified as `service_role` inside a transaction:

- two calls with the same `request_id` → one device event;
- one verification attempt;
- one attendance record;
- replay returns the same stored identities;
- test transaction rolled back, leaving no leaked test event.

### Database context resolver RPC

`resolve_attendance_context` resolves:

- normalized RFID UID;
- registered student identity;
- historical active enrollment/class for the institution-local school date;
- active face-profile reference;
- session candidates whose actual occurrence windows contain the scan time;
- participant eligibility;
- duplicate attendance state.

Verified seed cases:

- eligible class-X arrival;
- class-X-only Dhuha rejects a class-XI student as not eligible;
- unknown RFID remains unregistered;
- after an accepted record exists, a subsequent context resolution reports `duplicate = true`.

---

## 4. Reproducible fictional demo seed

`supabase/seed.sql` now contains synthetic portfolio data only:

- fictional institution `SMK Cakrawala Digital (Fiktif)`;
- academic year 2026/2027;
- grade X and XI;
- fictional RPL classes;
- four fictional students;
- four synthetic RFID UIDs;
- demo-only face profile references (no real biometric image/template);
- arrival, class-X Dhuha, and 17 August ceremony fixtures;
- materialized session participants;
- one active simulator device.

Current seed verification:

- 1 institution;
- 4 students;
- 4 active RFID credentials;
- 3 session occurrences;
- 10 participant rows;
- 0 leaked end-to-end test events.

The schedule values are explicitly fixture data, not claims about a real school.

---

## 5. Important truth about current runtime

The public recruiter terminal still uses the **ephemeral adapter by default**. This is intentional.

The real database resolver and persistence adapter exist, but public DB-mode is not enabled yet because recruiter clicks would otherwise mutate canonical demo attendance and quickly turn successful scenarios into duplicates. Demo isolation/reset semantics must be designed first.

Real biometric recognition is also not implemented yet. Demo face results remain deterministic fixtures, while database face-profile rows contain only synthetic references.

---

## 6. Next implementation slice

1. Define demo-vs-production data isolation/reset strategy.
2. Build a raw scan orchestration service: device/RFID context → face verifier boundary → canonical engine → persistence.
3. Add a deterministic face-verifier adapter for the database-backed sandbox only.
4. Add an isolated DB-backed simulator path without exposing the Supabase secret or mutating production-like data indefinitely.
5. Add Supabase Auth + RBAC for System Admin and Wali Kelas.
6. Implement school-day pending confirmation for Sakit/Izin/Alpa.
7. Build the first wali-kelas attendance/reconciliation view.
8. Add schedule-occurrence materialization from configured rules rather than relying only on pre-seeded occurrences.
9. Continue to reports/exports.
10. Continue to real biometric integration only after model/threshold/retention decisions are locked.

---

## 7. Still-open product decisions

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
- [ ] Final overlapping-session priority/device routing policy.

---

## 8. Build guardrail

Do not make the dashboard, simulator, hardware client, database trigger, resolver RPC, or persistence RPC the independent source of attendance truth. Resolution gathers trusted context; the application-domain engine decides acceptance/rejection; persistence records that decision safely. Future physical hardware must use the same path through an adapter.
