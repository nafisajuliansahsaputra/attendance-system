# Current Work State

**Last updated:** 2026-09-03  
**Current phase:** Product foundation / pre-implementation  
**Coding status:** Not started by design

This file is the handoff point for the next working session. Read it after `AGENTS.md` and `docs/00-SOURCE-OF-TRUTH.md`.

---

## 1. What is already locked

The following product facts are accepted and should not be re-litigated unless the owner explicitly changes them:

- This is a rebuild/modernization of the owner's 2025 P5 SMK attendance project.
- The original concept used RFID + camera face verification + LEDs + buzzer.
- Current development should not require purchasing physical hardware.
- The software must remain genuinely compatible with future real hardware.
- Simulator and real hardware are adapters/clients of the same backend contract.
- RFID identifies the expected student.
- Face verification is 1:1 against the RFID owner.
- Success = green LED + one short beep.
- Face mismatch = red LED + rapid repeated beeps.
- The system records multiple attendance sessions, not only school entry/exit.
- Initial session families: arrival, departure, Dhuha, Dzuhur, Ashar, ceremonies, school activities/custom events.
- Dhuha targeting varies by grade/class and day and must be configurable.
- Special events such as 17 August can require attendance outside normal school-day patterns.
- Friday-cleaning and future school activities are supported through generic custom sessions.
- The system automatically knows valid attendance, lateness, or no valid attendance.
- It must not decide Sakit/Izin/Alpa automatically.
- Homeroom teacher confirms Sakit/Izin/Alpa.
- Reports must support weekly, monthly, semester, annual/academic-year, and custom ranges.
- Raw device/verification events and canonical attendance records remain separate.

---

## 2. Documentation completed

- [x] `README.md`
- [x] `AGENTS.md`
- [x] `docs/00-SOURCE-OF-TRUTH.md`
- [x] `docs/01-PRD.md`
- [x] `docs/02-USER-FLOWS.md`
- [x] `docs/03-ARCHITECTURE.md`
- [x] `docs/04-DOMAIN-AND-DATA.md`
- [x] `docs/05-DEVICE-PROTOCOL-AND-SIMULATOR.md`
- [x] `docs/06-SECURITY-PRIVACY.md`
- [x] `docs/07-ROADMAP-TODO.md`
- [x] `docs/08-WORKING-AGREEMENTS.md`
- [x] `docs/09-DECISION-LOG.md`
- [x] `SKILLS.md`
- [x] `WORK.md`

---

## 3. Next task — Decision Sprint before coding

Do **not** scaffold the application yet. The next conversation should resolve the minimum decisions that affect implementation architecture and UX.

Recommended discussion order:

### A. Product identity / UI

- final project/product name;
- whether UI language is Indonesian, English, bilingual, or role/demo dependent;
- visual direction and portfolio presentation;
- route/information architecture.

### B. School attendance policy for demo data

- example school start time;
- late threshold;
- departure window;
- Dhuha demo schedule by grade/class;
- Dzuhur time window;
- Ashar time window;
- ordinary school days;
- whether missing departure affects daily status.

These can be realistic demo values and configurable later; they must not become hidden code assumptions.

### C. Activity/reporting policy

- how prayer/activity report denominator treats a student confirmed Sakit/Izin that day;
- whether missed prayer/activity by a student who was otherwise at school is shown simply as missed/not recorded;
- special-event modes to expose in MVP;
- report template style required for homeroom use.

### D. Human workflow

- exact Admin vs Wali Kelas permissions;
- whether Operator is included in MVP;
- whether Sakit/Izin needs note or evidence attachment;
- who may correct an already recorded attendance and how approval works.

### E. Technical lock

- Next.js/TypeScript confirmation;
- PostgreSQL/Supabase confirmation;
- repo layout: monorepo vs app-first;
- face service implementation choice;
- demo deployment target;
- biometric retention/demo deletion behavior;
- report/export libraries.

After these are agreed:

1. update Source of Truth open decisions;
2. add Accepted ADRs;
3. mark Phase 1 decisions in roadmap;
4. create route map/wireframe spec;
5. only then scaffold code.

---

## 4. Current proposed stack — not fully accepted yet

```text
Web:            Next.js + TypeScript + Tailwind CSS
Database/Auth:  PostgreSQL, Supabase preferred candidate
Face Service:   Python + FastAPI + selected verification model
Device Bridge:  Python for future Arduino USB/serial
ESP32 Path:     Direct versioned HTTPS Device API
Reporting:      Server-side aggregation + XLSX/CSV + PDF/print
Testing:        Unit + Integration + Contract + E2E
```

Do not pin library versions until implementation begins and current compatibility is verified.

---

## 5. Initial implementation sequence after Decision Sprint

When Phase 1 is locked, the recommended first code sequence is:

1. repository/app scaffold;
2. environment + CI + tests;
3. database/academic domain;
4. authentication/RBAC;
5. session/schedule engine as testable backend logic;
6. attendance engine;
7. Device API v1;
8. simulator;
9. face service;
10. teacher confirmation workflows;
11. reports;
12. UI polish/demo;
13. security/QA/release.

Do not start from the dashboard just because it is visually attractive.

---

## 6. Current open decisions

These are intentionally unresolved:

- [ ] Brand/product name.
- [ ] UI visual system.
- [ ] UI language strategy.
- [ ] Final management routes/navigation.
- [ ] Exact arrival/late/departure demo rules.
- [ ] Exact Dhuha/Dzuhur/Ashar demo schedule.
- [ ] Missing-departure policy.
- [ ] Sakit/Izin impact on prayer/activity denominator.
- [ ] Evidence attachment requirements.
- [ ] Attendance manual-correction policy.
- [ ] MVP Operator role.
- [ ] Repo layout.
- [ ] Final DB/Auth provider.
- [ ] Face verification library/model.
- [ ] Face threshold calibration method.
- [ ] Biometric raw-image retention.
- [ ] Demo isolation/deployment topology.
- [ ] Report export templates/libraries.
- [ ] Overlapping active-session routing policy.

---

## 7. Build guardrail

If the next task asks for code that depends on one of the unresolved decisions above, resolve/document that decision first instead of embedding an invisible assumption.

If the task does **not** depend on an unresolved decision, implementation can proceed according to the Source of Truth and roadmap.
