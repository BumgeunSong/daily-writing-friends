## Review Summary

**Status**: Ready (after Round 2 revisions). Architectural choices stand; UX gaps closed; alternatives that were not evaluated in the plan are now documented as accepted trade-offs.
**Iteration**: 2 of max 2

## Findings

### Critical

1. **Scope vs urgency mismatch — bundling hotfix with full API buildout.** Both `objectives-challenger` and `alternatives-explorer` flagged that the proposal commits to 16 routes, audit logging, Upstash rate limiting, and JWKS verification as one deliverable, while framing this as "HIGH urgency, every page broken." A minimal hotfix (single proxy route, or moving only the broken mutation server-side) would unblock production in hours.
   - **Disposition**: Accepted as trade-off. Plan rev. 2 is already in hand and is the design we ship. Splitting into a "hotfix + later refactor" is an option but the design doc's full scope is fairly small (16 thin routes, not a new service), and shipping twice would double review/deploy overhead. The compensating change (below) is to **move all mutations into Phase 1** so production is fully restored on first deploy.

2. **Server Components / Server Actions alternative not evaluated.** `objectives-challenger` argued these are simpler than building a 16-endpoint REST API: server components run on the server already, no `Authorization: Bearer` plumbing needed, no `api-client.ts`, no `types/admin-api.ts` contract layer.
   - **Disposition**: Accepted as documented trade-off. Route Handlers were chosen for a stable HTTP surface that's easy to test with `curl`, easy to rate-limit and audit-log uniformly, and that survives a future split of the admin app from Next.js. Server Actions would couple every mutation to a specific React tree. Proposal updated to make this rationale explicit.

3. **Phase 1 disabled-write UX is invisible.** `user-advocate` and `objectives-challenger` both flagged that "board create + app-config writes read-only until Phase 2" gives admins no signal — they will tap the buttons and assume the app is still broken.
   - **Disposition**: Resolved by Round 2 revision: **all mutations move into Phase 1**. There is no longer a feature gap. Phase 2 becomes "harden + cleanup" only.

### Important

4. **Loading state / flash-of-admin-content on `GET /api/admin/me`.** `user-advocate` noted no spec for what renders during the round-trip.
   - **Disposition**: Resolved. Proposal now requires a guarded loading skeleton; `isAdmin === undefined` must not render admin shell content.

5. **Token retry — second 401 has no documented fallback.** `user-advocate` noted that after `getIdToken(true)` retry, a second 401 leaves the user in an undefined state.
   - **Disposition**: Resolved. Proposal now requires the api-client to surface a redirect-to-sign-in on second 401.

6. **403 vs 401 collapsed into "auth error".** `user-advocate` flagged that an admin removed from `ADMIN_EMAILS` gets the same UX as an expired token — they will assume the app is broken.
   - **Disposition**: Resolved. Proposal now requires distinct 403 messaging: "Your account does not have admin access."

7. **Rate-limit UX absent.** `user-advocate` noted batch user-approval workflows could realistically trip 60 req/min, and silent 429 looks like another breakage.
   - **Disposition**: Resolved. Proposal now requires explicit "rate-limited, retry shortly" surfacing on 429.

8. **`@upstash/ratelimit` over-engineered for 2 admins.** `objectives-challenger` and `alternatives-explorer` both flagged this. An in-memory counter (per serverless instance) would provide adequate abuse detection at this scale.
   - **Disposition**: Accepted as deliberate trade-off. The plan's reasoning — that a stolen 1h Firebase ID token has wide blast radius across 16 endpoints — applies regardless of admin count, and Upstash is one Vercel integration click. Audit log alone is reactive (you see the abuse after); rate limit is proactive. Documented in the proposal Impact section.

9. **Supabase Auth migration cost is understated.** `alternatives-explorer` argued the "throwaway code" is closer to 150–200 lines across 18+ files (every route handler's `requireAdmin` preamble + `api-client.ts` retry logic + `verify-token.ts` + `auth.ts`), not the "few dozen lines" in the design doc.
   - **Disposition**: Accepted as documented trade-off. The plan's deferral rationale (no third admin yet, no shared session needs with web app) still holds. The cost is honestly a few hundred lines, not a few dozen — but those lines are mechanical replacements during the eventual migration, not blocking design work. Proposal Impact section updated.

10. **`POST /api/admin/users/by-ids` is a read using POST.** `objectives-challenger` flagged that audit/rate-limit logic keying on POST verb would incorrectly treat this as a mutation.
    - **Disposition**: Resolved. Proposal explicitly notes that audit/rate-limit gates key on intent (mutation vs read), not HTTP verb.

11. **Approve/reject idempotency unspecified.** `user-advocate` raised that a network drop after server-side success but before client response could cause a double-approve on retry.
    - **Disposition**: Resolved. Proposal now requires approve/reject to be idempotent on the server side.

### Minor

12. **ESLint rule overlap with `import 'server-only'`.** Distinct guards for distinct paths (`@/lib/supabase` vs `@/lib/server/supabase`). Both kept; rationale clarified in proposal.

13. **Anon key + admin RLS rejection under-argued.** `alternatives-explorer` argued one RLS policy per admin-touched table could replace the whole API layer. Accepted trade-off: the plan's rejection rationale (RLS migration `20260301000000_reenable_rls.sql` explicitly excluded admin operations; admin app is on Firebase Auth, not Supabase Auth, so `auth.jwt()` claims are not available without first migrating auth). Documented.

## Key Questions Raised

- Why not Server Components / Server Actions? *(Answered: stable HTTP surface, uniform audit + rate-limit, decouples from React tree.)*
- Can the rate limiter be in-memory instead of Upstash? *(Answered: yes, but Upstash survives serverless cold-start state loss and the 1h token blast-radius justifies the investment regardless of admin count.)*
- How long is the gap between Phase 1 and Phase 2? *(Resolved: by moving all mutations into Phase 1, there is no feature gap. Phase 2 is now cleanup-only.)*
- What happens on a second 401 after retry? *(Resolved: surface to user; redirect to sign-in.)*

## Alternatives Considered

| Alternative | Outcome |
|---|---|
| Restore `NEXT_PUBLIC_SUPABASE_URL` prefix only (anon key on client) | Rejected in plan — the SERVICE_ROLE key is what's missing, and exposing service_role to the browser is the original incident. |
| Anon key + admin RLS policies | Rejected — admin uses Firebase Auth, so `auth.jwt()` claims aren't natively available; would require Supabase Auth migration first. |
| Server Components / Server Actions | Considered, rejected — Route Handlers chosen for stable HTTP surface, uniform middleware, framework decoupling. |
| Single-route catch-all proxy as hotfix, then full design later | Considered, rejected — bundling is acceptable here because Phase 1 (now expanded) restores all functionality on first deploy. |
| In-memory rate limiter instead of Upstash | Considered, rejected — Upstash survives cold-starts; 1h Firebase ID token blast-radius justifies durable counters. |
| One-shot Supabase Auth migration in this change | Considered, deferred — costs (Google OAuth config, redirect URI, session handling, admin user remap) exceed the throwaway JWT layer cost in the near term. Trigger to revisit documented in plan. |

## Accepted Trade-offs

- **Throwaway JWT verification layer**: ~150–200 lines (not "30") will need rewriting when Supabase Auth migration eventually happens. Accepted because deferral keeps the urgent fix narrow.
- **Upstash dependency for 2-admin scale**: pays for proactive abuse detection across 16 endpoints; alternative (audit-log only) is reactive.
- **No Server Components/Actions**: pays for HTTP-surface stability and uniform middleware in exchange for ~16 thin route files.

## Revision History

- **Round 1 (2026-05-02)**: Three reviewers (objectives-challenger, alternatives-explorer, user-advocate) raised 11 findings spanning scope, alternatives, and UX gaps. Critical issues: scope-vs-urgency, missing Server Components evaluation, invisible Phase 1 disabled state.
- **Round 2 (2026-05-02)**: Proposal revised. All mutations moved into Phase 1 (no feature gap). UX specs added: loading skeleton on `/api/admin/me`, distinct 401/403 messaging, rate-limit-error messaging, second-401 redirect. Idempotency required for approve/reject. Server Components rationale documented. Trade-offs explicit for Upstash, JWT layer size, and bundled scope.
