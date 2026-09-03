# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Implementation foundation / Phase 1  
**Coding status:** Started; first foundation quality gate verified

This file is the handoff point for the next working session. Read it after `AGENTS.md` and `docs/00-SOURCE-OF-TRUTH.md`.

---

## 1. What is already locked

Product facts remain governed by `docs/00-SOURCE-OF-TRUTH.md`. Technical implementation decisions accepted on 2026-09-03:

- Main app: Next.js App Router + TypeScript + React + Tailwind CSS.
- Database: PostgreSQL on a **dedicated Supabase project for Attendance System**.
- The Attendance System Supabase project must never reuse Spall Spill database/Auth/Storage/keys.
- Repository starts app-first at the root; service boundaries remain explicit.
- Future face verification remains a separate Python/FastAPI boundary.
- Future Arduino USB devices use a bridge/adapter; network-capable devices may call the versioned HTTPS Device API.
- Simulator is an adapter/fixture resolver and may not bypass the canonical attendance decision engine.

---

## 2. Implementation completed in the first foundation slice

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
- [x] Demo API that validates requests and routes scenarios through the canonical engine.
- [x] Browser-generated buzzer feedback: one beep on success, rapid repeated beeps on face mismatch.
- [x] Dedicated database workspace documentation.
- [x] ADR-010/013/014/015 accepted.
- [x] Foundation verified by GitHub Actions: install, lint, typecheck, unit tests, and production build all pass after dependency compatibility correction.

---

## 3. Important implementation truth

The current demo does **not** claim to perform real biometric recognition yet.

Demo scenarios deterministically resolve RFID/session/face context, then invoke the canonical attendance engine. This is intentional. Real face verification will replace only the face-resolution adapter after the biometric model, enrollment flow, threshold calibration, and retention policy are approved.

The current demo also does not persist attendance yet. Database persistence starts after the dedicated Supabase project is created and schema/RLS are implemented.

---

## 4. Supabase status

A separate Supabase project is accepted as architecture, but has **not been created yet**.

Reason: the Supabase project-creation operation requires the owner to explicitly choose which Supabase organization should own the project and acknowledge any applicable project cost.

Once the organization is selected:

1. create `attendance-system` as a separate Supabase project;
2. obtain the project URL and publishable key;
3. add local/deployment secrets without committing them;
4. implement the first schema through reviewed migrations;
5. enable and verify RLS for exposed tables;
6. run Supabase security/performance advisors.

---

## 5. Next implementation slice

Recommended order:

1. Create/connect the dedicated Supabase project after explicit organization selection.
2. Implement academic structure schema: institution, academic year, grades/classes, students, enrollments.
3. Implement RFID credential registry.
4. Implement session definition + occurrence + participant targeting schema.
5. Build deterministic schedule resolver with tests.
6. Add raw event persistence and canonical attendance persistence transaction boundary.
7. Replace demo fixture card/session resolution with repository/service interfaces usable by both demo and device adapters.
8. Add authentication/RBAC for Admin and Wali Kelas.
9. Continue toward real face enrollment/verification only after biometric decisions are accepted.

---

## 6. Still-open product decisions

These do not block the current foundation but must be decided before the feature that depends on them is built:

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

Do not make a dashboard or visual demo the source of attendance truth. Every accepted/rejected outcome must remain explainable by canonical domain rules, and future real hardware must be able to reach those rules through an adapter without rewriting them.
