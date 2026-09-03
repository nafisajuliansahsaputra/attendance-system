# Project Skills & Capability Map

This file defines the engineering competencies required to build and review the project correctly. It is also a guide for AI/coding agents: do not treat this as a generic CRUD website.

---

## 1. Product / domain modeling

Required capabilities:

- translate school attendance policy into explicit domain rules;
- distinguish raw scanner events from canonical attendance facts;
- model recurring schedules, special events, target participants, and calendar overrides;
- design human-confirmed absence classifications;
- avoid silently hard-coding unresolved school policy.

Primary references:

- `docs/00-SOURCE-OF-TRUTH.md`
- `docs/01-PRD.md`
- `docs/04-DOMAIN-AND-DATA.md`

---

## 2. Frontend engineering

Required capabilities:

- Next.js/React + TypeScript;
- accessible responsive application UI;
- admin/dashboard information architecture;
- state handling for terminal flows;
- camera permission/capture UX;
- tables, filters, drill-down reports;
- loading/empty/error states;
- portfolio-quality simulator interactions without bypassing backend rules.

Important principle:

The frontend renders and requests domain actions; it does not define attendance truth.

---

## 3. Backend / domain engineering

Required capabilities:

- typed API design;
- service/domain boundaries;
- schedule resolution;
- session eligibility;
- idempotent attendance commands;
- transactional canonical record creation;
- role/scoped authorization;
- audit logging;
- explicit error classification.

Critical skills:

- concurrency-safe duplicate prevention;
- time-window logic;
- institutional timezone handling;
- historical enrollment preservation.

---

## 4. Database engineering

Required capabilities:

- PostgreSQL relational modeling;
- schema migrations;
- foreign-key and uniqueness constraints;
- append-oriented event tables;
- report-friendly canonical records;
- indexes and query profiling;
- seed datasets for deterministic demo/testing.

Avoid:

- storing monthly/yearly totals as manually edited truth;
- fixed Dhuha/Dzuhur/Ashar columns that block custom sessions;
- mutable current-class fields as the only historical class reference.

---

## 5. Scheduling / calendar engineering

Required capabilities:

- recurring schedule rules;
- concrete occurrence generation/resolution;
- holiday cancellation;
- additive/replacing special dates;
- participant targeting;
- overlapping-session disambiguation;
- academic-year/semester ranges.

Test calendar boundary behavior deliberately.

---

## 6. IoT / device integration

Required capabilities:

- RFID UID event handling;
- serial communication concepts;
- Arduino-style local bridge architecture;
- ESP32 HTTPS/client integration concepts;
- device identity/authentication;
- device heartbeat/health;
- protocol versioning;
- hardware feedback mapping.

Original interaction semantics to preserve:

- accepted → green LED + one short beep;
- face mismatch → red LED + rapid repeated beeps.

---

## 7. Computer vision / face verification

Required capabilities:

- face detection vs face verification distinction;
- 1:1 embedding comparison;
- enrollment quality controls;
- verification threshold calibration;
- false accept / false reject awareness;
- model/version metadata;
- secure biometric template handling;
- service-failure distinction from identity mismatch.

Do not replace actual verification semantics with a random confidence number purely for UI effect.

---

## 8. Security engineering

Required capabilities:

- session/user authentication;
- RBAC and horizontal authorization;
- device authentication;
- replay/idempotency protections;
- secret management;
- secure file/image upload;
- biometric minimization and retention;
- demo/production isolation;
- immutable/audited privileged changes.

Reference: `docs/06-SECURITY-PRIVACY.md`.

---

## 9. Reporting / analytics engineering

Required capabilities:

- period aggregation;
- school-day vs activity-session separation;
- class/student filtering;
- reconciliation to canonical source records;
- Excel/CSV export;
- printable/PDF report generation;
- historical class context;
- performance considerations for annual reports.

---

## 10. Testing / QA

Required capabilities:

- unit testing domain rules;
- integration testing persistence/API;
- contract testing simulator/device protocol;
- end-to-end browser tests;
- authorization tests;
- timezone/calendar edge cases;
- deterministic seeded data;
- regression testing after schedule/report changes.

Primary rule:

A polished simulator animation is not proof that the system works. Tests must verify backend effects and invariants.

---

## 11. DevOps / delivery

Required capabilities:

- environment configuration;
- CI for lint/type/test/build;
- migrations during deployment;
- secure secret injection;
- structured logs;
- health checks;
- backup/recovery planning for a real deployment;
- deployment separation for portfolio demo vs real school data.

---

## 12. Documentation / decision discipline

Required capabilities:

- maintain Source of Truth;
- record ADRs for material decisions;
- update roadmap/work state;
- document API/device contract changes;
- avoid undocumented behavior changes.

For every implementation session, read:

1. `AGENTS.md`
2. `docs/00-SOURCE-OF-TRUTH.md`
3. `WORK.md`
4. the relevant feature documents.

---

## 13. Skill-by-phase map

| Phase | Primary skills |
|---|---|
| Foundation | Product modeling, documentation |
| Scaffold | Next.js/TS, PostgreSQL, CI |
| Identity/RBAC | Auth, database, security |
| Schedule engine | Domain modeling, time/calendar, tests |
| Device API | Backend, protocol, IoT, security |
| Face verification | Python/CV, privacy, service design |
| Management UI | React/Next.js, UX, accessibility |
| Reporting | SQL/aggregation, export/PDF |
| QA/release | E2E, security, observability, performance |
| Physical integration | Arduino/ESP32, serial/network protocol |

---

## 14. Review rule

If a proposed implementation requires expertise outside the current phase, do not shortcut it with fake behavior. Either:

- implement the real boundary correctly;
- use an explicit adapter/mock while preserving the contract; or
- keep the feature marked incomplete.

The system should be portfolio-friendly **because the engineering is credible**, not because the UI hides missing architecture.
