# Phase 8: Firebase Auth → Supabase Auth Migration

**Date**: 2026-02-22
**Status**: Design approved
**Branch**: TBD (to be created from `migration/phase7-remove-firestore`)
**Urgency**: HIGH — RLS disabled + anon key exposed in browser = full DB access

---

## Motivation

1. **Security**: RLS policies use `auth.uid()` but no Supabase auth session exists. RLS was hotfix-disabled, leaving the database unprotected behind the browser-exposed anon key.
2. **Migration completion**: Firebase Auth is the last Firebase dependency blocking full removal.
3. **Testability**: Supabase Auth supports email/password login, enabling automated browser testing (Playwright MCP).

## Current State

- Firebase Auth handles all authentication (Google OAuth only, 103 users)
- Supabase client uses anon key with no auth session (`persistSession: false` in production)
- `users.id` = Firebase UID (TEXT primary key)
- 15 FK columns across 12 tables reference `users(id)`
- RLS policies exist in migration `20260222000000` but are **disabled** (hotfix)
- Admin app uses Supabase service role key (bypasses RLS)

## Design

### Phase 8A: Pre-create Auth Accounts & Remap IDs

**No user impact. Can be done while app is running.**

#### Step 1: Pre-create Supabase Auth accounts

```typescript
for (const user of firebaseUsers) {
  const { data } = await supabase.auth.admin.createUser({
    email: user.email,
    email_confirm: true,
    user_metadata: { full_name: user.realName }
  });
  mappings.push({ firebase_uid: user.id, supabase_uuid: data.user.id });
}
```

#### Step 2: Validate before migration

- Compare Firebase Auth emails vs Supabase pre-created emails (catch email changes)
- Check for orphan FK values (user_id not in mapping → will crash UUID cast)
- Check for empty strings in user ID columns
- Check for views referencing affected columns

#### Step 3: SQL migration (single transaction, ~30 seconds)

Operation order within the transaction:
1. Create `uid_mapping` table and populate
2. Disable all triggers on affected tables
3. Drop RLS policies
4. Drop FK constraints
5. Drop indexes on affected columns
6. UPDATE all FK columns using mapping table (FK columns first, then PK)
7. ALTER COLUMN types from TEXT to UUID
8. Recreate indexes
9. Re-add FK constraints
10. Re-enable triggers
11. Run verification queries (row counts, orphan check, type check)
12. COMMIT

#### Tables & columns affected (15 FK columns + 1 PK)

| Table | Column | Type |
|-------|--------|------|
| `users` | `id` (PK) | TEXT → UUID |
| `users` | `known_buddy_uid` | TEXT → UUID |
| `posts` | `author_id` | TEXT → UUID |
| `comments` | `user_id` | TEXT → UUID |
| `replies` | `user_id` | TEXT → UUID |
| `likes` | `user_id` | TEXT → UUID |
| `reactions` | `user_id` | TEXT → UUID |
| `notifications` | `recipient_id` | TEXT → UUID |
| `notifications` | `actor_id` | TEXT → UUID |
| `drafts` | `user_id` | TEXT → UUID |
| `user_board_permissions` | `user_id` | TEXT → UUID |
| `board_waiting_users` | `user_id` | TEXT → UUID |
| `blocks` | `blocker_id` | TEXT → UUID |
| `blocks` | `blocked_id` | TEXT → UUID |
| `reviews` | `reviewer_id` | TEXT → UUID |

### Phase 8B: Switch Client Auth (maintenance window ~5 minutes)

**User-facing change. All users must re-login.**

#### Prerequisites
- Configure Google OAuth provider in Supabase Dashboard (Auth > Providers > Google)
- Use same Google Cloud OAuth client ID, add Supabase callback redirect URI
- Configure Site URL and Redirect URLs in Supabase Auth settings

#### Client code changes (~10 files)

| File | Change |
|------|--------|
| `src/firebase/auth.ts` | Replace with Supabase auth functions (`signInWithOAuth`, `signOut`) |
| `src/shared/hooks/useAuth.tsx` | `onAuthStateChanged` → `supabase.auth.onAuthStateChange` |
| `src/shared/api/supabaseClient.ts` | Enable `persistSession: true`, `autoRefreshToken: true` in production |
| `src/shared/utils/getCurrentUserId.ts` | `user.uid` → `user.id` |
| `src/shared/utils/authUtils.ts` | Replace Firebase `getCurrentUser()` with Supabase equivalent |
| `src/login/hooks/useGoogleLoginWithRedirect.ts` | Firebase popup → Supabase redirect OAuth flow |
| `src/shared/components/auth/RouteGuards.tsx` | Update auth check |
| `src/shared/components/auth/RootRedirect.tsx` | Update auth check |
| `src/user/components/UserSettingPage.tsx` | `signOut(auth)` → `supabase.auth.signOut()` |
| `src/user/api/user.ts` | `createUserIfNotExists`: use `user.id` (UUID), `user_metadata.full_name` |

#### Key difference: OAuth flow
- Firebase: popup-based (`signInWithPopup`)
- Supabase: redirect-based (`signInWithOAuth({ provider: 'google' })`)
- User is redirected to Google, then back to the app
- Supabase client auto-extracts session from URL on return

#### Deployment sequence
1. Enable maintenance banner
2. Deploy new client code
3. Clear CDN cache if needed
4. Disable maintenance banner
5. Users re-login with Google (Supabase matches by email → links to pre-created account)

### Phase 8C: Re-enable RLS

1. Re-create RLS policies with native UUID comparison (`auth.uid() = author_id`, no `::text` cast)
2. Include proper policies for sensitive tables:
   - `drafts`: SELECT restricted to owner (not public)
   - `notifications`: SELECT restricted to recipient
   - `users`: SELECT restricted for PII fields (email, phone)

### Phase 8D: Cleanup

1. Remove Firebase Auth SDK imports (`firebase/auth`)
2. Delete `src/firebase.ts` and `src/firebase/auth.ts`
3. Update admin app to read from Supabase (resolves #467)
4. Remove Google OAuth redirect URI from Firebase project
5. Keep Firebase project active for 2-week rollback window
6. Note: Firebase Storage migration is OUT OF SCOPE (tracked separately)
7. Note: `Timestamp` dependency (#466) must be resolved before removing `firebase/firestore`

## Rollback Strategy

- `uid_mapping` table preserved for reverse mapping
- Firebase Auth project kept active for 2 weeks
- Rollback procedure: revert client deploy → run reverse UUID→TEXT migration → re-enable Firebase Auth
- Data written after migration needs reverse mapping via `uid_mapping`

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Orphan FK values crash UUID cast | Critical | Pre-migration validation queries |
| Triggers corrupt counters during UPDATE | High | Disable triggers before migration |
| User email changed since Firebase signup | Medium | Email verification report before cutover |
| OAuth redirect misconfiguration | High | Test on local Supabase first |
| Cached old client code after deploy | Medium | Cache-busting headers, maintenance window |
| Firebase Storage still needed | Low | Out of scope, tracked separately |

## Post-migration Verification

```sql
-- Row counts unchanged
-- No orphan FK references
-- All ID columns are UUID type
-- FK constraints exist
-- RLS policies exist and functional
-- Triggers re-enabled
-- VACUUM ANALYZE on all affected tables
```

## Open Questions

- [ ] Can we reuse the same Google Cloud OAuth client ID for Supabase?
- [ ] Does the admin app use Firebase Auth for admin login? (affects Phase 8D)
