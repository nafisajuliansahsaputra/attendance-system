# Engineering Working Agreements

**Purpose:** Prevent drift, accidental rewrites, and architecture shortcuts during implementation.

---

## 1. Documentation-first rule

If requested behavior changes a product rule, update documentation before or in the same change as code.

Priority references:

1. `docs/00-SOURCE-OF-TRUTH.md`
2. `docs/09-DECISION-LOG.md`
3. `docs/01-PRD.md`
4. architecture/domain/device/security docs

Do not let code silently become the product specification.

---

## 2. Build order

Prefer this sequence:

1. define/confirm rule;
2. model domain behavior;
3. write tests for critical rule;
4. implement backend/domain path;
5. persist correctly;
6. expose API/contract;
7. build UI;
8. validate end-to-end;
9. update roadmap/work state.

Do not build polished screens first and invent backend semantics afterward.

---

## 3. Minimal-change discipline

When fixing or revising an existing feature:

- inspect the actual current repository/source first;
- preserve unrelated behavior and architecture;
- avoid opportunistic refactors unless they directly enable the requested change;
- do not rename/move large areas casually;
- explain architecture-changing refactors in the Decision Log.

---

## 4. Assistant collaboration mode

When ChatGPT/Codex provides code changes to the user:

- prefer **complete ready-to-replace contents for each touched source file** rather than fragment-only patch instructions, unless the user explicitly asks for a diff/patch;
- base fixes on the actual current repository files, not remembered snapshots;
- do not ask the user to manually search for tiny snippets when a full-file replacement is practical;
- never claim a change is compatible without checking the relevant current files/contracts.

Repository writes performed directly by an authorized tool may use normal commits/PRs, but the same minimal-change rule applies.

---

## 5. Branch and commit conventions

Recommended:

- `main` = stable/reviewed baseline;
- `feat/<short-name>` = feature work;
- `fix/<short-name>` = bug fix;
- `docs/<short-name>` = documentation-only work;
- `chore/<short-name>` = tooling/maintenance.

Commit examples:

```text
feat(attendance): add session eligibility resolver
fix(device): make RFID submissions idempotent
docs(product): clarify homeroom absence confirmation
refactor(reporting): isolate attendance aggregation service
```

For solo development, small clean commits are preferred over one giant commit.

---

## 6. Code organization rules

- Keep domain/business rules framework-light where practical.
- Put external service calls behind interfaces/adapters.
- Keep database access out of presentation components.
- Do not duplicate attendance calculations across screens.
- Define shared status enums/contracts once.
- Do not use magic strings for domain outcomes.
- Do not hard-code school policy values that belong in configuration.
- Avoid hidden demo-only branches in production domain logic.

---

## 7. API rules

- validate all inputs;
- return machine-readable error/result codes;
- version device-facing contracts;
- keep human and device authentication separate;
- support idempotency on event creation;
- do not return sensitive fields unnecessarily;
- document breaking changes.

---

## 8. Database rules

- all schema changes use migrations;
- never manually depend on undocumented production table edits;
- use foreign keys/constraints for core integrity where practical;
- preserve historical class/enrollment context;
- keep raw device/security events append-oriented;
- canonical attendance must be uniquely constrained/idempotent;
- demo seeds use fictional data only.

---

## 9. Time rules

- persist UTC timestamps;
- convert and evaluate school schedules using institution timezone;
- never rely on host machine timezone implicitly;
- tests must include boundary timestamps around open/late/close cutoffs.

---

## 10. Testing strategy

### Unit tests

For pure domain behavior:

- eligibility;
- late thresholds;
- schedule override;
- status derivation;
- report aggregation.

### Integration tests

For:

- database constraints;
- authorization;
- device API;
- face-service interface;
- reporting queries.

### Contract tests

For:

- device protocol version;
- simulator/hardware parity;
- machine-readable feedback.

### E2E tests

For critical user journeys:

- successful attendance;
- face mismatch;
- teacher absence confirmation;
- Dhuha targeted attendance;
- special event;
- report generation.

---

## 11. Critical regression suite

These should eventually be permanent regression tests:

1. Face mismatch never creates valid attendance.
2. A non-target student is never counted absent from a targeted Dhuha session.
3. Late valid arrival is accepted and marked late.
4. Sakit/Izin/Alpa cannot appear without authorized confirmation.
5. Duplicate/retry cannot create duplicate canonical attendance.
6. Special events can operate outside normal school days.
7. Teacher cannot modify another class without permission.
8. Simulator follows the Device API instead of direct database writes.
9. Report totals reconcile with canonical records.
10. Changing current student class does not rewrite historical report context.

---

## 12. UI standards

- loading, empty, error, success, disabled states are intentional;
- destructive/privileged actions use clear confirmation UX;
- mobile and desktop behavior are considered from component design, not bolted on later;
- accessibility basics: keyboard navigation, labels, focus states, contrast, reduced-motion awareness;
- simulator hardware feedback must remain understandable even when audio is unavailable.

---

## 13. Security standards

- no `.env` secrets committed;
- secret/example configuration separated;
- server-side authorization is mandatory;
- no face templates in public assets;
- no raw biometric data in logs;
- demo dataset isolated;
- validate file/image uploads;
- privileged attendance corrections are audited.

---

## 14. Definition of Done

A feature is Done only if relevant items below are satisfied:

- requirement is linked/understood;
- domain behavior implemented;
- server authorization correct;
- migration/data behavior correct;
- loading/error/empty states handled;
- critical tests added/updated;
- audit behavior added where required;
- simulator/device behavior aligned where relevant;
- documentation updated;
- lint/typecheck/test/build pass;
- `WORK.md`/roadmap updated if milestone status changed.

---

## 15. Definition of Ready

A feature is ready to build when:

- its intended user outcome is known;
- governing Source of Truth rule is known;
- unresolved school policy that changes behavior has been decided;
- acceptance criteria exist;
- dependencies/data ownership are clear.

If these are not true, discuss/record the decision instead of guessing in code.
