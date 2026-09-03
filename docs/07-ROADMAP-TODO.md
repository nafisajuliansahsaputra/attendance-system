# Roadmap & TODO

**Status:** V1 software implementation complete; next work is user E2E defects and explicit post-V1 hardening.  
**Planning rule:** do not add speculative features before the user test.  
**Last reconciled:** 2026-09-03

Legend:

- [x] Implemented for V1
- [ ] Intentionally pending / deferred

---

## Phase 0 — Product/engineering foundation

- [x] Source of Truth
- [x] PRD
- [x] user/device flows
- [x] architecture
- [x] domain/data model
- [x] device/simulator contract
- [x] security/privacy baseline
- [x] engineering agreements
- [x] decision log
- [x] skills/capability map
- [x] persistent `WORK.md` handoff

---

## Phase 1 — Technical decisions

- [x] Next.js/TypeScript/React/Tailwind stack
- [x] app-first repository layout
- [x] dedicated Supabase database/Auth project
- [x] server-authoritative RBAC model
- [x] local Python/FastAPI face-service boundary
- [x] OpenCV YuNet + SFace V1 implementation choice
- [x] raw biometric image policy: memory-only, no canonical storage
- [x] CSV + Print/Save-as-PDF V1 export approach
- [x] versioned Device API v1
- [ ] final brand/visual identity polish
- [ ] exact production attendance cutoffs
- [ ] final prayer/activity denominator policy
- [ ] final manual-correction/evidence policy
- [ ] final production deployment topology

---

## Phase 2 — Repository & quality baseline

- [x] Next application workspace
- [x] strict TypeScript/typecheck
- [x] ESLint
- [x] environment contract examples
- [x] reproducible npm lockfile / `npm ci`
- [x] Supabase migration workflow
- [x] fictional seed workflow
- [x] Vitest suite
- [x] pytest face-service suite
- [x] GitHub CI for Node install/lint/typecheck/tests/build
- [x] GitHub CI for Python install/compile/tests/model checksum/model load
- [x] DB transaction smoke tests for critical Stage 2 paths
- [x] local V1 testing runbook
- [ ] browser automation/E2E suite using a provisioned Auth account
- [ ] dedicated dependency-vulnerability scanner/release bot

Browser E2E is intentionally performed next with the user's real local credentials/camera because no real staff credential or biometric is committed to the repository.

---

## Phase 3 — Identity, school structure, RBAC

- [x] Supabase Auth
- [x] SYSTEM_ADMIN
- [x] HOMEROOM_TEACHER
- [x] OPERATOR monitoring scope
- [x] academic-year/term/grade/class domain
- [x] historical student enrollment
- [x] Homeroom Teacher assignments
- [x] student directory/search
- [x] RFID assignment/replacement/history
- [x] face-profile lifecycle and camera enrollment
- [x] server-side class-scope authorization
- [x] guarded staff provisioning
- [x] last-admin/self-disable protection
- [x] audit evidence for critical privileged workflows
- [x] historical class transfer without overlapping enrollment ranges
- [ ] full general-purpose academic-structure CRUD UI
- [ ] general student create/archive profile UI beyond current identity-management scope

---

## Phase 4 — Schedule & attendance domain engine

- [x] generic session templates
- [x] recurrence rules (supported fail-closed subset)
- [x] occurrence materialization
- [x] historical participant snapshots
- [x] all/grade/class/department/selected-student DB targets
- [x] NORMAL / ADDITIVE / REPLACE_NORMAL / CANCEL_NORMAL
- [x] arrival/departure/Dhuha/Dzuhur/Ashar/ceremony/activity/custom model
- [x] lateness logic
- [x] duplicate rule
- [x] pending school absence state
- [x] proactive zero-scan-day materialization from teacher/report reads
- [x] fail-closed overlapping-session behavior
- [x] schedule history protection when canonical attendance exists
- [ ] final production priority policy for truly overlapping sessions
- [ ] final missing-departure effect on school-day status

Critical tested behaviors include non-target Dhuha, special schedules, late acceptance, duplicate protection, recurrence parsing, and historical participant resolution.

---

## Phase 5 — Device API & simulator

- [x] device registry
- [x] independent device authentication
- [x] secret hash/rotation
- [x] protocol v1 headers/contracts
- [x] clock-skew/replay guard
- [x] heartbeat/last-seen
- [x] Stage 1 RFID endpoint
- [x] short-lived verification transactions
- [x] Stage 2 face endpoint
- [x] transaction replay state
- [x] atomic/idempotent finalization
- [x] machine-readable physical feedback
- [x] raw device events
- [x] device admin/Operator monitoring UI
- [x] recruiter terminal simulator
- [x] success/mismatch/unknown/not-eligible/late/duplicate/no-session scenarios
- [ ] physical Arduino/ESP32 client/bridge validation
- [ ] deployment-edge device rate limiting / asymmetric request signing

---

## Phase 6 — Real face verification

- [x] private FastAPI service
- [x] YuNet face detector
- [x] SFace embedding/1:1 comparison
- [x] official model download
- [x] pinned SHA-256 verification
- [x] CI runtime model initialization
- [x] protected service credential
- [x] browser camera enrollment
- [x] exactly-one-face rule
- [x] face-size/detection-score/blur/brightness quality gates
- [x] versioned template model metadata
- [x] server-only embedding storage
- [x] exact enrolled-model/version guard
- [x] mismatch/no-face/low-quality/service-error distinctions
- [x] raw image non-retention
- [x] MATCH/MISMATCH live DB finalization smoke
- [ ] liveness/presentation-attack detection
- [ ] institution/camera/population-specific threshold calibration
- [ ] formal biometric privacy/consent approval for a real school rollout

**V1 must not claim photo/video anti-spoofing.**

---

## Phase 7 — Management UI

### System Admin

- [x] dashboard/navigation
- [x] students/RFID/class-history workspace
- [x] face enrollment workspace
- [x] schedule management
- [x] device management
- [x] staff provisioning/directory
- [x] access to Homeroom workspace for audit/use
- [ ] dedicated audit-log browser
- [ ] full academic structure editor

### Homeroom Teacher

- [x] assigned-class daily workspace
- [x] date/class selector
- [x] pending absence queue/state
- [x] Sakit/Izin/Alpa confirmation
- [x] valid-arrival override guard
- [x] prayer/activity participation via reports
- [x] class/per-student period report table
- [ ] dedicated student-detail profile/report page

### Operator

- [x] authenticated operations dashboard
- [x] device monitoring
- [x] no unrestricted admin mutation

---

## Phase 8 — Reporting & exports

- [x] daily operational attendance view
- [x] 7-day recap
- [x] current-month recap
- [x] semester recap
- [x] academic-year recap
- [x] custom date range
- [x] per-student rows
- [x] per-class totals
- [x] prayer/activity participation
- [x] special-session participation through generic session report
- [x] lateness totals
- [x] Excel-compatible CSV
- [x] spreadsheet formula-injection protection
- [x] A4 print / Save as PDF
- [x] future-date clipping
- [x] canonical-record-derived totals
- [ ] prayer/activity percentage until Sakit/Izin denominator policy is decided
- [ ] native XLSX/server-generated PDF only if a real administrative template requires it

---

## Phase 9 — Portfolio/demo

- [x] public recruiter terminal route
- [x] virtual RFID scenarios
- [x] canonical green/red LED feedback
- [x] one success beep
- [x] rapid repeated mismatch beep
- [x] clear deterministic demo scenarios
- [x] fictional seed data
- [x] public demo stays ephemeral
- [ ] final visual/brand polish
- [ ] portfolio case-study screenshots/content
- [ ] fully guided no-setup hosted recruiter demo of real camera flow (optional post-test)

---

## Phase 10 — Release verification

Completed automated/review gates:

- [x] authorization boundaries in application/DB design and regression tests
- [x] device auth/revocation boundary
- [x] replay/idempotency tests + live DB smoke
- [x] face payload size/schema/quality handling
- [x] biometric non-retention architecture review
- [x] audit separation
- [x] timezone/calendar rules
- [x] final Source of Truth reconciliation
- [x] final Architecture/Security/Device docs reconciliation
- [x] release README
- [x] V1 user testing runbook
- [x] Supabase security advisor: no WARN/ERROR finding
- [x] Supabase performance advisor: no missing-FK-index finding
- [x] Node CI green
- [x] Python/model-load CI green
- [x] live DB MATCH/MISMATCH transaction smoke green

Intentionally pending after user E2E:

- [ ] defects found during real login/camera/device testing
- [ ] accessibility review/polish
- [ ] performance/load profiling under realistic school traffic
- [ ] production backup/restore/deployment monitoring runbook
- [ ] formal external security/privacy assessment for real institutional deployment

---

## Phase 11 — Future physical hardware integration

Not required for V1 software test-ready status:

- [ ] select/reconstruct exact physical board architecture
- [ ] RFID firmware
- [ ] camera integration
- [ ] green/red LED output adapter
- [ ] buzzer output adapter
- [ ] Arduino serial protocol + Python bridge if Arduino path is used
- [ ] direct ESP32 HTTPS client if ESP32 path is used
- [ ] reconnect/offline queue behavior
- [ ] physical enrollment/device workflow
- [ ] physical field test

### Hardware success criterion

Physical hardware integration must not require rewriting attendance, schedule, face-transaction, teacher-confirmation, or reporting business logic.

---

## Immediate next step

**Stop adding speculative V1 features. Run `docs/13-V1-TESTING-RUNBOOK.md` with the user.**

Only fix observed setup/runtime/product defects or explicitly approved post-V1 scope after that test.
