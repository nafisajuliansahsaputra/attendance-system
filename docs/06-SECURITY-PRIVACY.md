# Security & Privacy Baseline

**Source of truth:** `docs/00-SOURCE-OF-TRUTH.md`

This system handles student identity, attendance history, RFID credentials, and potentially biometric face templates. Security and privacy are therefore product requirements, not post-build polish.

---

## 1. Data classification

### Highly sensitive / restricted

- face embeddings/templates;
- raw face enrollment or verification images if retained;
- device secrets;
- authentication secrets/tokens;
- privileged audit data.

### Sensitive personal/operational

- student identity and NIS;
- class/enrollment history;
- attendance history;
- Sakit/Izin/Alpa confirmations and supporting notes/documents;
- RFID UID mapping;
- rejected verification logs.

### Lower sensitivity

- generic session definitions;
- public demo seed data with fictional identities;
- non-sensitive product documentation.

---

## 2. Privacy principle — data minimization

Collect and retain only what is needed for the attendance purpose.

Preferred biometric design:

- store a derived face template/embedding rather than unnecessary raw enrollment photos;
- send live samples only for the current verification transaction;
- delete temporary raw samples after verification unless an explicitly approved evidence-retention policy requires storage;
- keep demo biometric data ephemeral by default.

Do not add facial data retention merely because storage is technically easy.

---

## 3. 1:1 verification, not broad surveillance

The canonical attendance flow is:

```text
RFID owner known -> compare live face against that one expected student
```

The product does not require continuous camera surveillance or unrestricted school-wide 1:N identity search.

This reduces unnecessary biometric exposure and aligns the face feature with its actual purpose: verifying card ownership.

---

## 4. Authentication boundaries

### Human users

- authenticated web sessions;
- secure password/session handling through the selected auth provider;
- role-based access controls;
- server-side authorization on every privileged mutation.

### Devices

- separate device credentials;
- no reuse of admin/user credentials;
- credential revocation/rotation support;
- device identity checked before processing attendance events.

### Services

Internal service-to-service calls should use protected credentials/network policy appropriate to deployment.

---

## 5. Authorization model

### System Admin

Broad management access, still constrained by audit and sensitive-data handling rules.

### Homeroom Teacher

Can access attendance and required student information only for assigned class scope unless explicitly granted otherwise.

Can confirm Sakit/Izin/Alpa only within authorized scope.

### Operator

Operational/device access should not automatically grant ability to edit students, face data, or school attendance classifications.

### Recruiter/Demo Visitor

No access to real student records. Demo uses fictional/seeded data and temporary biometric enrollment when enabled.

---

## 6. Biometric storage controls

Requirements:

- isolate biometric references from public/browser-readable storage;
- never place biometric templates in client-side static assets;
- use access-controlled storage/database fields;
- encrypt at rest through platform capability and protect access in application policy;
- record face model/template version;
- support revocation/re-enrollment;
- do not expose face embeddings through ordinary API responses.

If raw images are stored, add:

- explicit purpose;
- retention period;
- deletion job/process;
- access policy;
- audit of privileged access.

Retention length is an open decision and must not be silently invented.

---

## 7. RFID security considerations

RFID UID alone is not considered sufficient proof of identity.

Controls:

- unique active UID mapping;
- face verification for protected attendance flows;
- audit changes to RFID ownership;
- support lost/revoked/replaced cards;
- do not rely on obscurity of UID format as security.

---

## 8. Attendance integrity

### Server authority

Client/device cannot directly assert `attendance = valid` as trusted truth.

### Idempotency

Retries/replays must not create duplicate attendance.

### Immutable raw events

Corrections should not erase security-relevant raw events.

### Audit changes

Changes to canonical attendance or Sakit/Izin/Alpa confirmation store:

- before/after value;
- actor;
- timestamp;
- reason when required by final correction policy.

---

## 9. Device API security

Minimum controls:

- HTTPS for network transport;
- device authentication;
- input/schema validation;
- idempotency keys;
- rate limiting;
- payload-size limits for image uploads;
- replay protection strategy;
- short-lived verification transactions;
- no unnecessary student PII in responses;
- explicit protocol versioning.

Potential future strengthening:

- signed requests;
- per-device key pairs;
- mutual TLS in controlled deployments;
- network allowlists for on-prem deployments.

These should be chosen based on deployment rather than added performatively.

---

## 10. Web application security

- use HttpOnly/Secure/SameSite session cookies where applicable;
- CSRF protections appropriate to auth architecture;
- validate all server inputs;
- parameterized database access/ORM;
- prevent horizontal privilege escalation between classes;
- sanitize/escape user-generated notes and file metadata;
- content-security policy where practical;
- restrict file uploads by type/size and store outside executable paths;
- no service-role or device secrets in browser bundles.

---

## 11. Demo isolation

Public portfolio demo must be isolated from real-school data.

Recommended properties:

- separate demo tenant/schema/project or strongly isolated dataset;
- seeded fictional students;
- rate-limited simulator;
- resettable demo state;
- no privileged admin credentials exposed;
- temporary recruiter face enrollment expires automatically;
- demo actions cannot access production device endpoints or secrets.

---

## 12. Logging rules

Safe to log:

- request IDs;
- device IDs;
- normalized event type;
- non-secret record identifiers;
- error classifications;
- timings/latency;
- model/version metadata.

Do not log:

- passwords;
- access tokens;
- device secrets;
- raw face image bytes;
- face embeddings;
- entire sensitive student records without need.

---

## 13. Threat cases to test

Before release, test at minimum:

1. card belongs to Student A, face is Student B;
2. unknown RFID;
3. revoked RFID reused;
4. duplicate/replayed event;
5. forged client attempts to mark attendance directly;
6. teacher attempts to access another class;
7. operator attempts admin-only mutation;
8. public demo attempts to access management data;
9. oversized/malformed image upload;
10. face service unavailable;
11. expired verification transaction reused;
12. device credential revoked;
13. user changes Sakit/Izin/Alpa and audit history remains intact.

---

## 14. Real-school deployment governance

A portfolio demo can prove the technical system, but actual deployment at a school must additionally establish organizational policy for:

- legal/privacy basis for biometric processing;
- student/parent notice or consent where required;
- data retention;
- access approval;
- incident handling;
- biometric deletion when a student leaves;
- backup/restore handling of sensitive data.

These are deployment governance requirements and should not be represented as automatically solved by the software.

---

## 15. Security release gate

Do not call the system production-ready until:

- authorization tests pass;
- device authentication exists;
- secrets are externally managed;
- biometric storage is private;
- demo/real data isolation is verified;
- idempotency/replay controls are tested;
- attendance corrections are audited;
- dependency/security scanning is part of CI or release procedure;
- critical threat cases above have explicit tests or documented mitigations.
