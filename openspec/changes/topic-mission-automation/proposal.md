# Proposal: topic-mission-automation

## Why

Daily Writing Friends cohorts run weekly topic presentations, but presenter selection is currently manual — admins pick presenters ad-hoc and send reminders individually. This creates coordination overhead, inconsistent turn-taking, and missed reminders. Automating queue-based selection with in-app registration and notifications removes the manual burden and makes the process transparent and fair for all board members.

## What Changes

- **New**: `topic_missions` database table — per-board queue of registered topic entries (user, topic, order index, status with lifecycle: `pending → assigned → completed → skipped`)
- **New**: Queue-based presenter selection — admin advances to the next member in queue order; no automatic scheduling (avoids need for pg_cron infrastructure that doesn't exist in the current stack)
- **New**: Topic registration page — in-app page (`/board/:boardId/topic`) where board members submit a topic to join the queue; registration is required before a member can be assigned as presenter
- **New**: Presenter banner — board page displays an upcoming-presenter banner when a presenter is assigned, linking to the topic registration page for unregistered members
- **New**: Presenter assignment notification — system notification dispatched to the selected presenter when their turn is assigned, with deep link to the board page
- **New**: Admin topic mission panel — admin app page to view the queue, reorder entries, manually advance to next presenter, skip members, and reset the queue
- **New**: Pool exhaustion behavior — when all members have presented, the queue cycles back to the beginning (wrap-around), with visual indicator in admin panel

## Capabilities

### New Capabilities

- `topic-mission-pool` — Core queue data model: `topic_missions` table schema with status lifecycle (`pending → assigned → completed → skipped`), RLS policies (board members see own board's pool; service role for admin), queue advancement logic, CRUD API layer
- `topic-registration` — In-app topic registration page for board members; form to submit a topic entry to the queue; registration required before pool entry
- `topic-presenter-banner` — Banner component on the board page; shown when a presenter is currently assigned; displays the upcoming presenter and links to the registration page for unregistered members
- `topic-presenter-notification` — Notification sent to the selected presenter on assignment; new `NotificationType` value `topic_presenter_assigned` (string union, matching existing pattern in `notificationMessages.ts`); dispatched via Supabase edge function; includes deep link to board
- `topic-mission-admin` — Admin panel page to manage the per-board topic mission queue (view, reorder, advance, skip, reset); shows wrap-around indicator when queue cycles

### Modified Capabilities

None — this is a fully additive feature.

## Impact

- **Database**: New `topic_missions` table with status lifecycle; new migration + RLS policies; no changes to existing tables
- **apps/web**: New `topic` feature directory (`apps/web/src/topic/`); `BoardPage` modified to show presenter banner
- **apps/admin**: New topic mission management page under `apps/admin/src/`
- **supabase/functions**: Edge function for presenter notification dispatch (extends `create-notification` pattern with new `topic_presenter_assigned` type in `notificationMessages.ts`)
- **Notification model**: `NotificationType` string union extended with `topic_presenter_assigned`
- **No scheduling infrastructure required** — advancement is admin-triggered only
- **No breaking changes** to existing APIs, routes, or DB schema

## Open Questions

- Should the banner display be day-based (e.g., only Fridays) or event-driven (shown whenever a presenter is assigned)? Event-driven is simpler and more flexible.
- Should topic registration be a separate page or a modal/bottom sheet on the board page? A separate page is proposed for discoverability, but a modal reduces navigation.
