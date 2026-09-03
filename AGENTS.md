# AGENTS.md — Mandatory Build Context

This file is for ChatGPT, Codex, coding agents, and human contributors. Read this file and `docs/00-SOURCE-OF-TRUTH.md` **before making any implementation change**.

## 1. Mission

Build a hardware-ready school attendance platform that rebuilds and modernizes the owner's 2025 P5 SMK project. The original concept used RFID, a camera module with face verification, LEDs, and a buzzer. The current repository may be developed without physical hardware, but the application must remain directly integrable with real Arduino/ESP32-class hardware later.

## 2. Non-negotiable product facts

1. RFID is the identity lookup step.
2. Face matching is **1:1 verification against the RFID card owner**, not unrestricted 1:N facial identification.
3. A verified attendance should map to green LED + one short beep on real hardware.
4. A face mismatch/rejected verification should map to red LED + rapid repeated beeps on real hardware.
5. The simulator is an adapter/client, not a separate fake product path.
6. Demo events and hardware events must enter the same canonical attendance engine.
7. The system may automatically conclude: on-time/present, late, or no valid attendance recorded. It must **not automatically classify a school absence as Sakit, Izin, or Alpa**.
8. Sakit/Izin/Alpa are confirmed by the student's homeroom teacher for the relevant school day.
9. Attendance is multi-session, not only arrival/departure.
10. Supported session families include arrival, departure, Dhuha, Dzuhur, Ashar, ceremony/event attendance, Friday-cleaning activities, and future custom sessions.
11. Dhuha schedules are targeted/configurable. Example only: Tuesday Grade 10, Wednesday Grade 11, Thursday Grade 12. Never hard-code these weekdays or grades.
12. Special dates/events can create required attendance outside the normal school-day pattern; e.g. 17 August ceremony requiring arrival and departure attendance.
13. A student who is not targeted/eligible for a session must never be counted as absent from that session.
14. Reports must be automatically derivable for weekly, monthly, semester, academic-year/annual, and custom date ranges.
15. Raw device/verification events and derived attendance records are separate concepts and must remain auditable.

## 3. Architecture constraints

- Keep **device layer**, **domain/backend layer**, and **web interface layer** separated.
- Attendance rules belong in the backend/domain layer, not only in React components or simulator UI.
- Real hardware and demo simulator must share versioned device/API contracts.
- A plain Arduino over USB may use a local bridge/agent. An ESP32-class device may call the Device API over the network. Both should be supported by the architecture without changing attendance business rules.
- Face verification should live behind an explicit service/interface so its implementation can change without rewriting attendance logic.
- Do not store secrets in source control.
- Treat biometric data as sensitive; follow `docs/06-SECURITY-PRIVACY.md`.

## 4. Change discipline

Before implementing a feature:

1. Identify the governing requirement in Source of Truth / PRD.
2. Check the Decision Log for related decisions.
3. Update documentation first if the intended behavior changes.
4. Implement the smallest architecture-consistent change.
5. Add tests for business rules, not only UI behavior.
6. Update `WORK.md` and roadmap status when a milestone changes.

## 5. Drift prevention

Do **not** silently invent or alter school policy. If an unanswered policy is required for implementation, record it in the `Open Decisions` section of the Source of Truth instead of hard-coding an assumption.

Examples of policies that must remain configurable or explicitly decided:

- exact arrival/late cutoffs;
- session time windows;
- Dhuha target schedule;
- which days are school days;
- holiday/calendar overrides;
- whether a special event replaces or adds to the normal schedule;
- prayer/activity reporting denominator rules for students confirmed Sakit/Izin;
- biometric snapshot retention period.

## 6. Completion rule

A feature is not complete merely because the UI displays it. It is complete only when its domain rule, authorization, persistence, error behavior, tests, simulator behavior (when relevant), and documentation are aligned.
