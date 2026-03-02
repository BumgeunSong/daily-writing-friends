# Verification Workflow

This document defines the testing philosophy, structure, and process
to follow after implementation is complete in an OpenSpec workflow.
Tool-specific configuration is defined separately in `VERIFICATION_CONFIG.md`.

---

## Philosophy

Tests are not a separate phase — they are part of implementation.
The goal is not 100% coverage, but **high-value tests that catch real bugs**.

Each test layer serves a distinct purpose. Layers should not overlap.
When a bug is caught at a lower layer, it should not need to be caught again at a higher layer.

---

## The 4-Layer Test Pyramid

```
         ▲
        /4\       E2E + Real Local DB
       /───\      DB-dependent scenarios only
      / 3   \     E2E + Network Passthrough
     /───────\    Full UI flows, external services mocked
    / 2       \   Integration
   /───────────\  Boundary contracts between two layers
  / 1           \ Unit
 /───────────────\Pure logic, no dependencies
```

### Layer 1 — Unit
**Objective:** Verify that isolated business logic is correct.
Focus on functions with branching conditions, edge cases, and boundary values.
No external dependencies. No framework. No DB.

### Layer 2 — Integration
**Objective:** Verify that two connected layers honor their contract.
Test one boundary at a time: API↔DB, or Component↔API.
External services are mocked at the code level. Everything else is real.

### Layer 3 — E2E with Network Passthrough
**Objective:** Verify complete UI flows from the user's perspective.
Internal APIs use real dev server responses (passthrough).
Only external services (OAuth, push notifications, email, payment) are mocked at the network level.
Use Model-Based GUI Testing (MBT) to derive test paths from specs.

### Layer 4 — E2E with Local DB
**Objective:** Verify scenarios where DB behavior directly affects correctness.
Use only for: RLS policy validation, DB triggers, data integrity, schema constraints.
Not for all E2E paths — only the subset that cannot be verified without a real DB.

> Never test against staging or production DB.

---

## When to Write Tests

### In `design.md`
Add a **Testability Notes** section that identifies what needs testing before any code is written.
For each piece of logic, decide: which layer, and why.
This ensures the implementation is designed to be testable from the start.

### In `tasks.md`
Add a Tests section alongside implementation tasks.
Tests are **completion criteria**, not optional extras.
Every implementation task that involves business logic or a layer boundary
must have a corresponding test task.

### During `implement`
Write tests alongside code, not after.
- Unit and Integration tests: written with each function or API handler
- E2E Network Passthrough: written after the UI component is complete
- E2E Local DB: written after the full flow is connected end-to-end

---

## Model-Based GUI Testing (MBT)

MBT is the approach used for all E2E tests (Layer 3 and 4).

### Concept
The UI is modeled as a state machine derived from `specs/`.
States represent distinct UI conditions. Transitions represent user actions.
Test paths are generated from this model to achieve **Transition Coverage**:
every transition must be executed at least once.

### Process
1. Read `specs/` → extract states and transitions → save as state model
2. Apply Transition Coverage → generate test paths
3. Execute each path using a browser automation tool
4. Verify that each transition arrives at the expected state

### Mocking in MBT
Default: **Passthrough** — internal APIs use real dev server.
Exceptions:
- External services: always mocked at the network level
- Forced failure scenarios: mock specific endpoints to return error responses

Mock responses for repeated use are stored in `verify/fixtures/`.
Scenario-specific mock sets are stored in `verify/scenarios/`.

---

## dev3000 Integration

dev3000 runs alongside the dev server during the verify phase.
It captures a unified, timestamped timeline of everything happening in the app:
server logs, browser console, network requests, and automatic screenshots.

**Role in the verification workflow:**

- **During E2E execution:** dev3000 records the full timeline of each test path.
  If a transition fails, the timeline shows *why* — not just *that* it failed.
- **Failure diagnosis:** When agent-browser reports a failed assertion,
  dev3000's timeline provides the evidence: which API call failed,
  what the server logged, what JS error occurred.
- **Fix loop:** After a failure is identified, dev3000's context is passed
  to the coding agent so fixes are based on evidence, not guesswork.

dev3000 is started before E2E tests begin and remains running throughout.
Its logs are referenced in `verify/verify_report.md` for any failed test.

---

## Verify Phase Execution Order

```
1. Unit            → fastest feedback, run first
2. Integration     → run only if Unit passes
3. E2E Network Passthrough (MBT) → run only if Integration passes
4. E2E Local DB    → run only if Layer 3 passes, DB-dependent scenarios only
```

Stop and report at the first layer that has failures.
Do not proceed to the next layer until failures are resolved.

---

## Artifacts

```
verify/
  state_model.json      ← extracted from specs/, source of truth for E2E
  test_paths.json       ← generated paths from state model (Transition Coverage)
  fixtures/             ← reusable mock responses (external services)
  scenarios/            ← scenario-specific mock sets
  verify_report.md      ← execution results and failure evidence
```

### verify_report.md structure

```
## Summary
| Layer | Total | Passed | Failed |
| Unit        | ... | ... | ... |
| Integration | ... | ... | ... |
| E2E Mock    | ... | ... | ... |
| E2E LocalDB | ... | ... | ... |

## Failures
For each failure:
- Test name and layer
- Expected vs actual
- Relevant dev3000 timeline excerpt

## Unverified Specs
Any spec requirement not covered by the test suite.
```

If failures exist, add fix tasks back to `tasks.md` before closing verify phase.

---

## Key Principles

1. Tests are written during implement, not after
2. Design.md must identify test targets before coding starts
3. Each layer has a distinct purpose — do not duplicate coverage across layers
4. Passthrough by default — never mock internal APIs in E2E
5. External services are always mocked in all layers
6. E2E Local DB is for DB-dependent scenarios only, not all paths
7. The state model derived from specs is the source of truth for E2E
8. dev3000 provides failure evidence — every E2E failure must reference its timeline
