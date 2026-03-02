## Context

<!-- Background and current state -->

## Goals / Non-Goals

**Goals:**
<!-- What this design aims to achieve -->

**Non-Goals:**
<!-- What is explicitly out of scope -->

## Decisions

<!-- Key design decisions and rationale -->

## Risks / Trade-offs

<!-- Known risks and trade-offs -->

## Testability Notes

<!-- Identify what needs testing BEFORE any code is written.
     For each piece of logic, decide which layer and why. -->

### Unit (Layer 1)
<!-- Pure logic with branching, edge cases, boundary values. No dependencies. -->

### Integration (Layer 2)
<!-- Boundary contracts: API↔DB, Component↔API. One boundary at a time. -->

### E2E Network Passthrough (Layer 3)
<!-- Full UI flows. Internal APIs use real dev server. External services mocked. -->

### E2E Local DB (Layer 4)
<!-- Only DB-dependent scenarios: RLS, triggers, data integrity, schema constraints. -->
