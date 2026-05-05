# Donator Badge — Design

**Date**: 2026-05-05
**Status**: Validated, ready for stacked implementation

## Problem

Users who donate to Daily Writing Friends through Fairy (`fairy.hada.io/@daily-writing-friends`) currently leave no trace inside the app. We want to acknowledge their support quietly: a small badge next to their name on PostCard headers and on their profile page, active for 30 days from each donation.

## Goals

- Receive Fairy `payment.completed` webhooks reliably and idempotently.
- Map each donation to a DWF user account.
- Display a quiet, warm badge for active donators without tracking cron jobs.
- Keep donor PII (email, message, amount) off the public surface.

## Non-goals

- Tiered badges (gold/silver) by amount.
- Donation amount or count visible to other users.
- Refund or cancellation handling beyond Fairy's own retry semantics.

## Architecture

```
DWF Settings → Fairy URL with ?payload={"dwf_user_id":"<uuid>"}
                                         │
                                         ▼
                           Fairy → POST /fairy-webhook
                                         │  (HMAC SHA256, X-Fairy-Signature)
                                         ▼
                  Supabase Edge Function (Deno)
                    1. Verify signature on raw body
                    2. ON CONFLICT idempotency by paymentId
                    3. Resolve user: dwf_user_id → email fallback
                    4. INSERT into donations
                                         │
                                         ▼
                  Supabase: donations + donator_status view
                                         │
                                         ▼
                  React Query batch fetch → <DonatorBadge /> on
                  PostCardHeader and UserPage profile header
```

### Hosting decision: Supabase Edge Function

The webhook lives next to the data. Service role key bypasses RLS for inserts. The endpoint meets every Fairy preflight rule: HTTPS, port 443, public host, no redirects.

### Why no expiration cron

Active state is computed at query time: `donated_at + 30 days > now()`. Badges expire on their own. No background job, no stale flags.

## Data model

### Migration: `supabase/migrations/<ts>_donations.sql`

```sql
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  payment_id text not null unique,
  user_id uuid references public.users(id),
  amount_krw integer not null check (amount_krw > 0),
  donated_at timestamptz not null,
  fairy_name text,
  fairy_email text not null,
  fairy_message text,
  source text not null,
  raw_payload jsonb not null,
  match_method text check (match_method in ('dwf_user_id','email') or match_method is null),
  created_at timestamptz not null default now()
);

create index donations_user_active_idx
  on public.donations (user_id, donated_at desc)
  where user_id is not null;

create index donations_unmatched_idx
  on public.donations (created_at desc)
  where user_id is null;

create or replace view public.donator_status as
  select
    user_id,
    max(donated_at) as latest_donated_at,
    max(donated_at) + interval '30 days' as active_until,
    count(*) as donation_count
  from public.donations
  where user_id is not null and source <> 'test'
  group by user_id;

alter table public.donations enable row level security;
-- No client policies. Service role bypasses RLS for both Edge Function writes and
-- Next.js admin route reads. The donator_status view exposes only sanitized fields:

grant select on public.donator_status to authenticated, anon;
```

### Why this shape

- **Append-only event log.** One row per Fairy payment. No mutation after insert. Aligns with the project's existing event-sourcing pattern (`functions/src/eventSourcing/`).
- **`payment_id UNIQUE` is the idempotency key.** Fairy retries up to 3 times within a few seconds. `INSERT ... ON CONFLICT DO NOTHING` makes retries safe in a single statement.
- **`donator_status` view excludes test webhooks** (`source <> 'test'`) but keeps them in the table for forensics.
- **PII isolation.** The public view drops `fairy_email`, `fairy_message`, `fairy_name`, `amount_krw`. Clients only see user_id and timing.
- **Admin reads bypass RLS** through Next.js server routes that already hold the service role key (`apps/admin/src/lib/server/auth.ts` enforces the email allowlist).

## User matching

1. **Primary — `payload.dwf_user_id`.** Settings page builds a personalized donate URL: `https://fairy.hada.io/@daily-writing-friends?payload=<URL-encoded JSON>` where the JSON is `{"dwf_user_id":"<user-uuid>"}`. Fairy preserves this and returns it in `data.payload`.
2. **Fallback — `fairyEmail` ↔ `users.email`.** Case-insensitive match. Covers users who lose the personalized link.
3. **Unmatched.** Donation row is still saved with `user_id = NULL`. Admin can reconcile later via the admin dashboard. Money is always recorded.

## Webhook receiver

### File: `supabase/functions/fairy-webhook/index.ts`

Full code is in Section 3 of the brainstorming session (preserved in conversation history). Key correctness points:

- HMAC SHA256 hex over `req.text()` raw body — never `JSON.stringify(JSON.parse(...))`.
- Constant-time signature compare to defeat timing attacks.
- `--no-verify-jwt` deploy flag: webhooks have no Supabase JWT; the signature is the only auth.
- Test source (`source === 'test'`) returns 200 OK after logging — no DB write.
- DB unique-violation `23505` returns 200; other DB errors return 500 so Fairy retries.

### Deploy

```bash
supabase functions deploy fairy-webhook --no-verify-jwt
supabase secrets set FAIRY_WEBHOOK_SECRET=<from-fairy-dashboard>
```

Webhook URL configured in Fairy:
```
https://<project-ref>.functions.supabase.co/fairy-webhook
```

### Logged fields per request

`event`, `timestamp`, `paymentId`, `amount`, `projectName`, `source`, plus `userId` and `method` after resolution. Signature failures log `{event, timestamp}` and return 401.

## Frontend

### Module: `apps/web/src/donator/`

```
donator/
├── api/donator.ts                # Supabase batch query
├── hooks/useDonatorStatus.ts     # React Query hook
├── components/DonatorBadge.tsx
└── model/DonatorStatus.ts
```

### Batch fetch

Pages with feeds (board, user) call `useDonatorStatusBatch(authorIds)` once and pass `isDonator` down to each PostCard. This avoids N+1 against `donator_status`.

```ts
export function useDonatorStatusBatch(userIds: string[]) {
  return useQuery({
    queryKey: ['donator-status', [...new Set(userIds)].sort()],
    queryFn: () => fetchDonatorStatusBatch(userIds),
    staleTime: 5 * 60 * 1000,
    enabled: userIds.length > 0,
  });
}
```

### Badge — Variant B "Quiet Leaf"

```tsx
import { Sprout } from 'lucide-react';

export function DonatorBadge({ className }: { className?: string }) {
  return (
    <Sprout
      className={cn('size-3.5 shrink-0 text-emerald-500/70 dark:text-emerald-400/80', className)}
      aria-label="후원자"
    />
  );
}
```

**Why Sprout, not Heart or Flame**:
- No pre-loaded UI metaphor (Heart = like, Flame = trending).
- Korean writing community resonance: supporting a writing project is nurturing growth, not a transaction.
- The `/70` opacity makes the badge near-invisible to casual readers but recognizable to the donator. That asymmetry is the warmth.

We avoid `text-destructive`. Red reads as warning in Korean app culture (red-pen association), not gratitude.

### Mounting points

- **PostCardHeader**: inline next to author name, gap-1, after the existing display name span.
- **UserPage profile header**: same pattern, single-user query.

### Settings menu update

The 후원하기 menu shipped in PR #567 uses a static URL. Update it to embed `dwf_user_id` for the logged-in user:

```ts
const donateUrl = useMemo(() => {
  const base = 'https://fairy.hada.io/@daily-writing-friends';
  if (!user?.uid) return base;
  const payload = encodeURIComponent(JSON.stringify({ dwf_user_id: user.uid }));
  return `${base}?payload=${payload}`;
}, [user?.uid]);
```

## PR stacking plan

| PR | Scope | Depends on |
|----|-------|------------|
| 1 | Migration: `donations` table, `donator_status` view, RLS, grants | — |
| 2 | Edge Function `fairy-webhook` deploy | PR 1 |
| 3 | `donator/` feature module + `<DonatorBadge />` | PR 1 (view) |
| 4 | Wire badge into PostCardHeader + UserPage; personalize donate URL in settings | PR 3 |

Each PR is independently reviewable and shippable. PR 2 can be tested end-to-end against the Fairy dashboard's "test send" feature once deployed.

## Test plan

- **Unit (Edge Function)**: signature verification (valid, malformed, wrong secret, timing-safe compare); user resolution priority order; idempotency on duplicate `paymentId`.
- **Integration**: Fairy dashboard → "send test" → expect 200 + log row, no DB row in `donator_status`.
- **Real run**: small ₩1000 donation through DWF settings link → expect badge visible within 5 seconds of webhook delivery.
- **Manual visual QA**: badge in light + dark mode at 360px and desktop widths; no layout shift on the author name row.

## Open questions

- Does Fairy preserve our `payload` exactly, or does it sanitize keys? Spec allows alphanumeric + `. _ : -`, and `dwf_user_id` matches. Should be fine, but verify on first real test.
- Should admin dashboard surface unmatched donations for manual reconciliation? Likely yes in a follow-up PR after we see the volume.

## Future work (out of scope)

- Email notification thanking the user after a donation lands.
- Aggregate "supported by N writers" counter on a public page.
- Recurring donation handling (Fairy's roadmap, not current spec).
