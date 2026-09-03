# Security & Privacy Baseline

**Status:** V1 implemented baseline / not a claim of production-school approval  
**Source of truth:** `docs/00-SOURCE-OF-TRUTH.md`  
**Last updated:** 2026-09-03

Attendance System handles student identity, attendance history, RFID credentials, staff authentication, device credentials, and biometric templates. Security/privacy are product requirements, not post-build polish.

---

## 1. Data classification

### Restricted / highest sensitivity

- face embeddings/templates;
- staff authentication tokens/passwords;
- Supabase privileged secret;
- device plaintext secrets;
- face-service secret;
- privileged security/audit data.

### Sensitive personal/operational

- student identity/NIS;
- class/enrollment history;
- attendance history;
- Sakit/Izin/Alpa confirmations/notes;
- RFID owner mapping;
- rejected verification metadata.

### Not canonical stored data in V1

- raw enrollment JPEG;
- raw verification JPEG/base64.

These samples are processed in request memory and must not be inserted into Supabase canonical/audit/device payloads.

---

## 2. V1 biometric minimization

V1 intentionally stores derived templates rather than raw face photos.

Enrollment path:

```text
browser camera JPEG
→ protected Next.js server route
→ private face-service /v1/extract
→ embedding + fingerprint + model/version/quality
→ server-only face_profile
```

Verification path:

```text
device JPEG
→ protected Device API
→ private face-service /v1/verify
→ result/score/quality
→ verification metadata + canonical attendance decision
```

The service does not write input JPEG bytes to disk/database. Application logs/audit/device payloads must not include image base64 or embeddings.

If a later release chooses to retain verification images as evidence, that requires a new explicit purpose, retention/deletion schedule, access policy, and ADR. It is not V1 behavior.

---

## 3. 1:1 verification only

Canonical flow:

```text
RFID owner known → compare live face against that one expected student
```

V1 does not require continuous surveillance or unrestricted school-wide 1:N face identity search.

---

## 4. Liveness limitation

**V1 does not implement presentation-attack detection / liveness.**

It performs facial similarity + quality checks only. `livenessChecked=false` is explicit in face-service/device responses.

Consequences:

- do not market or document V1 as resistant to printed-photo/video replay attacks;
- adding liveness requires its own evaluated model/interaction, threat tests, latency/error policy, and privacy review;
- a real institutional high-assurance rollout should not treat similarity-only verification as complete anti-proxy security.

---

## 5. Human authentication / authorization

- Supabase Auth establishes signed-in staff identity.
- Canonical `profiles` own role.
- `homeroom_assignments` own teacher class scope.
- user-editable Auth metadata is not authorization truth.
- there is no public staff sign-up in V1.
- first staff bootstrap must be System Admin; subsequent provisioning requires active System Admin authority.
- browser code never receives the Supabase secret key.

Roles:

- System Admin — management authority subject to audit/security constraints.
- Homeroom Teacher — assigned class attendance/reconciliation/report scope.
- Operator — device monitoring, not unrestricted student/staff/schedule mutation.
- Recruiter visitor — public ephemeral simulator only; no real staff/student administration.

---

## 6. Device authentication

Devices have credentials independent from human users.

V1 controls:

- device UUID;
- explicit protocol version;
- Bearer device secret over HTTPS;
- SHA-256 secret hash stored in DB, plaintext held only by device/bridge;
- disable/revoke state;
- secret rotation;
- timestamp clock-skew/replay tolerance;
- request IDs/idempotency;
- short-lived face verification transactions.

A device cannot submit authoritative student/class/session truth; the server derives those values.

Potential future hardening: request signing, per-device asymmetric keys, mTLS, on-prem allowlists, deployment-edge rate limiting.

---

## 7. Face service security

- service is intended to be private/server-side;
- `/v1/extract` and `/v1/verify` require `X-Face-Service-Key`;
- secret comes from environment only;
- API docs/openapi are disabled in the service;
- raw images are memory-only;
- embedding/model/version compatibility is checked;
- model files are pinned and SHA-256 verified before use;
- CI actually loads the pinned models through OpenCV.

The health endpoint is non-sensitive and reports model readiness + explicit liveness capability state.

---

## 8. Biometric storage controls

`face_profiles` stores server-side:

- student binding;
- ACTIVE/REVOKED lifecycle;
- model name/version;
- embedding;
- embedding dimensions;
- template fingerprint;
- enrollment quality;
- actor/timestamps.

Controls:

- no direct browser table access;
- ordinary admin directory responses expose only status/model metadata, not embeddings;
- re-enrollment revokes/version-controls previous ACTIVE template;
- raw face image is not canonical stored data.

For real-school deployment, platform encryption-at-rest plus organizational access/backup/deletion policies must be reviewed explicitly.

---

## 9. RFID integrity

RFID UID alone is not proof of identity.

Controls:

- active UID unique within institution;
- maximum one ACTIVE credential per student;
- protected attendance flows can require face verification;
- ownership/replacement is audited;
- old card becomes historical REPLACED/REVOKED state rather than disappearing.

---

## 10. Attendance integrity

### Server authority

Client/device cannot directly assert `attendance = valid`.

### Atomicity and idempotency

Critical verification finalization records audit + verification + canonical attendance transactionally. Retry/replay cannot create a second canonical attendance.

### Audit separation

Rejected/mismatch/duplicate/raw device events remain separate from accepted canonical attendance.

### Teacher authority boundary

Homeroom Teacher may classify a genuine missing required school arrival as Sakit/Izin/Alpa but cannot override an existing valid arrival through the normal flow.

---

## 11. Database/browser security

- public application tables have RLS enabled;
- V1 browser table access is intentionally default-deny;
- privileged application RPCs run through server/service-role paths;
- service-role credentials never enter browser bundles;
- input validation is performed at application and DB boundaries;
- cross-class teacher authorization is validated server-side;
- corrections/administrative mutations write audit history where implemented.

Latest Supabase security advisor has no warning/error finding. Its INFO `RLS enabled no policy` notices are expected for this server-authoritative default-deny design.

---

## 12. Reporting/export safety

Attendance reports are sensitive.

V1 controls:

- protected report routes;
- authorization scope enforced before report query;
- no-store behavior on sensitive CSV response;
- Excel-compatible CSV escapes spreadsheet-formula prefixes (`=`, `+`, `-`, `@`);
- print/PDF view requires authenticated authorized access.

---

## 13. Demo isolation

Public `/terminal` is deterministic + ephemeral. It must not contaminate shared canonical attendance or expose privileged credentials.

Seeded school/student/RFID information is fictional portfolio data.

A real production/demo deployment may later use stronger tenant/project isolation and rate limiting, but V1 never mixes real institutional data into the recruiter fixture flow by design.

---

## 14. Logging rules

Safe/expected:

- request ID;
- device ID;
- normalized event/error type;
- non-secret record IDs;
- timing/latency;
- model/version;
- verification score/threshold where authorized and useful.

Never log/store in general logs:

- passwords;
- access/refresh tokens;
- Supabase privileged keys;
- device plaintext secret;
- face-service secret;
- raw face JPEG/base64;
- biometric embedding;
- whole student records without a specific need.

---

## 15. Threat cases

Core cases that must remain regression/user-test targets:

1. Student A card + Student B face → FACE_MISMATCH, zero attendance.
2. Correct card + correct face → exactly one attendance.
3. Successful request replay → no duplicate attendance.
4. Unknown/revoked RFID → no attendance.
5. Non-target session → no attendance and not an absence for that session.
6. No face / low-quality sample → retry/error, not mismatch alarm.
7. Expired verification transaction → cannot finalize.
8. Device credential revoked/invalid → API rejected.
9. Device tries to assert another student/session → server ignores/does not accept client identity as truth.
10. Teacher accesses another class → authorization rejects.
11. Operator attempts admin mutation → authorization rejects.
12. Valid arrival then teacher tries S/I/A → rejected.
13. Face-service unavailable → no accepted attendance through face-required path.
14. Oversized/malformed face sample → rejected before canonical attendance.
15. Raw base64/embedding does not appear in normal audit/device payloads.
16. Printed-photo/video spoofing → **not claimed solved by V1**; this is a known security gap until liveness is added.

---

## 16. Automated security/integrity evidence

Verified during V1 implementation:

- Node lint/typecheck/unit tests/production build;
- Python contract tests;
- pinned model SHA-256 verification;
- OpenCV runtime model initialization;
- Supabase security advisor check;
- covering FK indexes added where advisor identified gaps;
- live DB MATCH smoke: one event + one verification + one attendance + idempotent replay;
- live DB MISMATCH smoke: FACE_REJECTED + zero attendance;
- DB smoke transactions rolled back after verification.

Automated evidence is not a substitute for the user's real camera/login/device E2E or a formal penetration/privacy assessment.

---

## 17. Real-school governance before production

Portfolio/V1 software readiness does not automatically authorize real school deployment.

Before enrolling actual students, establish:

- legal/privacy basis and required notice/consent;
- biometric retention/deletion policy;
- access approvals;
- incident response;
- backup/restore security;
- student-leaving deletion/revocation procedure;
- anti-spoof/liveness policy if the system is relied on to resist presentation attacks;
- camera/site-specific verification calibration;
- deployment monitoring, rate limits, TLS/network architecture, backups and recovery.

---

## 18. Security status wording

Correct V1 wording:

> "RFID + real 1:1 face similarity verification with private derived templates, idempotent device transactions, RBAC, audit separation, and explicit no-liveness limitation."

Incorrect wording until later hardening:

> "Production-grade anti-spoof biometric attendance" or "impossible to cheat with a photo/video."

The user-facing functional test procedure is `docs/13-V1-TESTING-RUNBOOK.md`.
