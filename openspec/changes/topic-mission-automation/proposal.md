# Proposal: topic-mission-automation

## Why

Daily Writing Friends cohorts run weekly topic presentations, but presenter selection is currently manual — admins pick presenters ad-hoc and send reminders individually. This creates coordination overhead, inconsistent turn-taking, and missed reminders. Automating round-robin selection with in-app registration and notifications removes the manual burden and makes the process transparent and fair for all board members.

## What Changes

- **New**: `topic_missions` database table — per-board pool of registered topic entries (user, topic, order index, status)
- **New**: Round-robin presenter auto-selection — advances to the next member in pool order, triggered on schedule or by admin action
- **New**: Topic registration page — in-app page (`/board/:boardId/topic`) where board members submit a topic to the pool
- **New**: Friday banner — board page displays an upcoming-presenter banner every Friday, linking to the topic registration page
- **New**: Presenter assignment notification — system notification dispatched to the selected presenter when their turn is assigned
- **New**: Admin topic mission panel — admin app page to view the pool, reorder entries, manually advance the queue, and reset

## Capabilities

### New Capabilities

- `topic-mission-pool` — Core pool data model: `topic_missions` table schema, RLS policies, round-robin selection rule, CRUD API layer
- `topic-registration` — In-app topic registration page for board members; form to submit a topic entry to the pool
- `topic-friday-banner` — Friday-conditional banner component on the board page; displays the upcoming presenter and links to the registration page
- `topic-presenter-notification` — Automated notification sent to the selected presenter on assignment; new `NotificationType.TOPIC_PRESENTER_ASSIGNED`; dispatched via Supabase edge function
- `topic-mission-admin` — Admin panel page to manage the per-board topic mission pool (view, reorder, advance, reset)

### Modified Capabilities

None — this is a fully additive feature.

## Impact

- **Database**: New `topic_missions` table; new migration + RLS policies; no changes to existing tables
- **apps/web**: New `topic` feature directory (`apps/web/src/topic/`); `BoardPage` modified to show Friday banner
- **apps/admin**: New topic mission management page under `apps/admin/src/`
- **supabase/functions**: New or extended Deno edge function for presenter notification dispatch
- **Notification model**: `NotificationType` enum extended with `TOPIC_PRESENTER_ASSIGNED`
- **No breaking changes** to existing APIs, routes, or DB schema
