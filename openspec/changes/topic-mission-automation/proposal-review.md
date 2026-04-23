# Proposal Review: topic-mission-automation

## Objectives Challenger

### 1. Schedule trigger implies nonexistent infrastructure — **Important** (Round 1, resolved)
The original proposal mentioned "triggered on schedule" for round-robin advancement, but no scheduling infrastructure (pg_cron, external cron) exists in the Supabase stack. Building this would significantly inflate scope for a feature that can work with admin-triggered advancement.

**Resolution:** Updated proposal to admin-triggered-only advancement. Scheduling can be added later if demand justifies the infrastructure investment.

### 2. "Round-robin" vs. reorderable queue — **Minor**
The original used "round-robin" but also allowed admin reordering, which contradicts fixed circular ordering. It's really a managed queue with wrap-around.

**Resolution:** Terminology changed to "queue-based" throughout. Wrap-around behavior on pool exhaustion is now explicitly defined.

## Alternatives Explorer

### 1. Friday-specific banner is fragile — **Important** (Round 1, resolved)
Hardcoding Friday as the banner display day couples the feature to a specific cohort schedule. If presentation day changes, the banner breaks silently.

**Resolution:** Proposal now surfaces this as an open question — event-driven (show when presenter is assigned) vs. day-based. Event-driven is recommended as simpler and more flexible. Decision deferred to design phase.

### 2. Separate page vs. modal for registration — **Minor**
A dedicated `/board/:boardId/topic` page adds a navigation hop. A modal or bottom sheet on the board page would reduce friction. However, a separate page is more discoverable and linkable (e.g., from notifications).

**Resolution:** Noted as open question in proposal. Both are viable; trade-off is discoverability vs. friction.

## User Advocate

### 1. Undefined journey for unregistered members assigned as presenter — **Critical** (Round 1, resolved)
The original proposal didn't specify whether registration is required before assignment or if members can be assigned first. This is a core UX gap — assigning someone who hasn't registered a topic creates confusion.

**Resolution:** Proposal now states registration is required before pool entry. The banner links unregistered members to the registration page.

### 2. Pool exhaustion behavior undefined — **Important** (Round 1, resolved)
No mention of what happens when all members have presented. Users and admins need predictable behavior.

**Resolution:** Proposal defines wrap-around behavior — queue cycles back to the beginning with a visual indicator in the admin panel.

### 3. Notification lacks actionable deep link — **Minor**
Original notification description didn't specify where the notification leads the user.

**Resolution:** Deep link to board page added to notification spec.

## Scope Analyst

### 1. Hidden scheduling infrastructure dependency — **Important** (Round 1, resolved)
The "triggered on schedule" language implied pg_cron or equivalent, which is a significant undocumented dependency.

**Resolution:** Eliminated. Admin-triggered only.

### 2. Status lifecycle undefined — **Important** (Round 1, resolved)
The original listed table fields parenthetically without defining the status state machine. This would surface as design-phase ambiguity.

**Resolution:** Status lifecycle explicitly defined: `pending → assigned → completed → skipped`.

### 3. RLS policy scope not mentioned — **Minor**
Board members should only see their own board's pool; admin needs cross-board access via service role. Standard pattern but worth noting.

**Resolution:** Noted in capability description for `topic-mission-pool`.

## Summary

| Perspective | Critical | Important | Minor |
|---|---|---|---|
| Objectives Challenger | 0 | 1 (resolved) | 1 |
| Alternatives Explorer | 0 | 1 (resolved) | 1 |
| User Advocate | 1 (resolved) | 1 (resolved) | 1 |
| Scope Analyst | 0 | 2 (resolved) | 1 |
| **Total** | **1 (resolved)** | **5 (resolved)** | **4** |

All Critical and Important findings were addressed in the proposal update (Round 1 → Round 2). Remaining Minor items are appropriate for the design phase.

## Accepted Trade-offs

1. **Admin-only trigger** — No automatic scheduling. Simpler to build but requires admin action each week. Can add scheduling later.
2. **Registration required before pool entry** — Members who don't register can't be assigned. This is intentional to avoid assigning unprepared presenters.
3. **Open questions deferred to design** — Banner timing (event-driven vs. day-based) and registration UX (page vs. modal) left open for the design phase to decide with fuller context.
