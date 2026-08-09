# Copilot Code Review Instructions

For repository architecture, dependency boundaries, testing commands, and
established conventions, read [AGENTS.md](../AGENTS.md).

## Review standard

Leave a review comment only when you are highly confident that the changed code
introduces a concrete issue that should be addressed before merge. Prefer no
comment over a speculative, stylistic, or low-impact observation.

Each comment must:

- identify the exact changed code and explain the concrete consequence;
- be actionable, with a clear correction or a narrowly defined question;
- be grounded in the pull request diff and nearby repository code; and
- focus on correctness, security, data integrity, reliability, performance
  regressions, test coverage for changed behavior, or an inconsistency that
  creates a maintenance, correctness, or user-experience risk.

Treat consistency with the existing codebase as the default. Before flagging a
pattern, inspect analogous code in the same feature and reuse its conventions.
Do not request changes merely because a valid implementation differs from a
personal preference, a generic best practice, or code outside the pull request.

Do not comment on formatting handled by tools, naming alternatives with no
meaningful effect, optional refactors, subjective readability preferences,
minor optimizations without evidence, or pre-existing issues unrelated to the
changed lines. Do not restate the diff, praise code, or add summary-only
comments.

When confidence is insufficient to establish a concrete impact, remain silent
instead of leaving a tentative comment. Do not report the same underlying issue
more than once.

## Project design principles

Apply the following principles to changed code, but report a violation only
when it creates a concrete, material risk. Do not use this section as a
generic refactoring checklist.

1. **Parse at boundaries.** External data should be parsed into a narrower,
   proven type at the boundary. Flag unchecked assertions, repeated validation,
   or fallback values only when they can admit invalid data or conceal a
   failure. A narrow return type without a corresponding runtime proof is not
   sufficient.
2. **Separate decisions from effects.** Flag business decisions embedded in
   effects, event handlers, or components only when extracting a pure decision
   would materially improve testability or prevent inconsistent behavior.
3. **Make invalid states unrepresentable.** Flag conflicting booleans or prop
   combinations only when they permit a state the UI or domain cannot handle.
4. **Prefer deep, local abstractions.** Flag a wrapper, hook, or helper only
   when its interface adds indirection without hiding meaningful complexity, or
   when a growing options surface demonstrates a wrong abstraction. Do not
   request abstraction merely to remove small duplication.
5. **Prefer removing cases to adding coordination.** Flag added state,
   branching, or cross-module coupling only when it makes the changed behavior
   materially harder to reason about or changes likely to diverge.
6. **Keep each fact authoritative in one place.** Flag copied, manually
   synchronized state, schema, or types only when the copies can diverge and
   the source can be derived safely.
7. **Make failures observable.** Flag error handling that converts a real
   failure into success-shaped data, silently swallows it, or prevents users
   and developers from understanding a meaningful loss of functionality.
8. **Preserve idempotence and concurrency safety.** Flag a mutation or
   interaction when retries, duplicate execution, or interleaving operations
   can produce an incorrect result.
9. **Keep behavior locally explainable.** Flag hidden global dependencies,
   module-level mutable state, or ref-based value bypasses only when they make
   the changed code's behavior depend on non-local, untracked state.

For any comment based on a design principle, name the concrete failure mode
instead of naming the principle alone. Reference the nearest existing pattern
when one supports the finding.
