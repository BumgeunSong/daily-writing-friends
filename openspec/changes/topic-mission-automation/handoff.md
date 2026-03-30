# Handoff: topic-mission-automation — Proposal Review Session

## What was done

Reviewed the proposal from 4 perspectives (Objectives Challenger, Alternatives Explorer, User Advocate, Scope Analyst). Found 1 Critical and 5 Important issues in Round 1, updated `proposal.md` to address all of them, and confirmed resolution in Round 2.

## Files changed

- **Modified**: `openspec/changes/topic-mission-automation/proposal.md` — addressed Critical/Important findings
- **Created**: `openspec/changes/topic-mission-automation/proposal-review.md` — full review with all 4 perspectives
- **Modified**: `openspec/changes/topic-mission-automation/handoff.md` (this file)

## Key decisions

1. **Admin-triggered only** — removed automatic scheduling (pg_cron doesn't exist in the stack). Advancement is manual via admin panel.
2. **Queue, not round-robin** — terminology changed to reflect that admins can reorder. Wrap-around on exhaustion.
3. **Registration required before assignment** — members must register a topic before entering the queue. Prevents assigning unprepared presenters.
4. **Status lifecycle defined** — `pending → assigned → completed → skipped`
5. **NotificationType is a string union**, not an enum — proposal updated to match actual codebase pattern (`notificationMessages.ts`)
6. **Banner timing and registration UX** deferred as open questions to design phase

## Notes for next session

- Two open questions need design-phase decisions: (1) banner timing — event-driven vs. day-based, (2) registration UX — separate page vs. modal
- No scheduling infrastructure exists — if automatic advancement is needed later, pg_cron or an external scheduler must be added
- The `create-notification` edge function pattern in `supabase/functions/` is the template for the new notification
- The `NotificationType` string union in `supabase/functions/_shared/notificationMessages.ts` needs a new `topic_presenter_assigned` value
- `BoardPage.tsx` is the banner injection point — simple component structure, easy to add a conditional banner above the filter tabs
