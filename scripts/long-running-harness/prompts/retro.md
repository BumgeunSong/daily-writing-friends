# Session: Retrospective

You are an AI coding agent running in a long-running harness. This is ONE session in a multi-session pipeline. You have NO memory from previous sessions — all context comes from files on disk.

## Your Task

Write a retrospective on the entire change lifecycle.

## Steps

1. Read ALL change artifacts in `openspec/changes/<change-name>/`:
   - proposal.md, proposal-review.md
   - design.md, design-review.md
   - specs/, tasks.md
   - verify_report.md
   - spec-alignment.md, final-spec-alignment.md
   - pull-request.md

2. Review `git log --oneline` to understand the commit timeline
3. Read `scripts/long-running-harness/logs/` to find the most recent run's `harness.log` for session timing data

4. Write the retrospective:

### Timeline
Walk through each phase. Note key decisions, turning points, and surprises.

### Wins
What worked well? Which phases, tools, or approaches contributed to good outcomes? Be specific about why.

### Misses
What went wrong or was harder than expected? Categorize each miss:
- **Process Gap**: schema phase too light or heavy
- **Review Gap**: reviewer missed something
- **Tool Gap**: test tool failed or was insufficient
- **Agent Gap**: agent underperformed for the role
- **Loop Inefficiency**: too many apply/verify iterations
- **Knowledge Gap**: missing context led to wrong decisions
- **Session Handoff Gap**: context was lost between sessions

### Improvement Ideas
Brainstorm freely. Think about: workflow changes, prompt improvements, different session boundaries, testing strategies, tooling gaps.

### Harness Observations
Specific to the long-running harness pattern:
- Did fresh sessions resume effectively from file state?
- Were task groups the right size?
- Did any phase need conversation memory that files couldn't provide?
- What would improve cross-session continuity?

5. Write to `openspec/changes/<change-name>/retro.md`
6. Git commit: `openspec(<change-name>): add retro`

## Rules

- Be honest — this is for learning, not self-congratulation
- The "Harness Observations" section is a harness-specific extension (not in the schema) — it's critical for improving the multi-session pattern

## Done When

- `openspec/changes/<change-name>/retro.md` exists with Timeline, Wins, Misses, Improvement Ideas, and Harness Observations
- Git commit created
