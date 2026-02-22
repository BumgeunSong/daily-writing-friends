# Phase 8: Firebase Auth → Supabase Auth — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Firebase Auth with Supabase Auth so RLS policies work and the Firebase dependency can be removed.

**Architecture:** Pre-create Supabase Auth accounts for all 103 users, remap `users.id` from Firebase UID (TEXT) to Supabase UUID in a single SQL transaction, then switch the client from Firebase Auth SDK to Supabase Auth. RLS is re-enabled after the client is deployed.

**Tech Stack:** Supabase Auth (Google OAuth), Supabase JS v2, React, TypeScript

**Design doc:** `docs/plans/2026-02-22-supabase-auth-migration-design.md`

---

## Task 1: Pre-create Supabase Auth Accounts

**Files:**
- Create: `scripts/migration/create-supabase-auth-users.ts`

**Step 1: Write the migration script**

```typescript
// scripts/migration/create-supabase-auth-users.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface UidMapping {
  firebase_uid: string;
  supabase_uuid: string;
  email: string;
}

async function main() {
  // 1. Fetch all users from Supabase users table
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, real_name');

  if (error) throw error;
  if (!users?.length) throw new Error('No users found');

  console.log(`Found ${users.length} users to migrate`);

  // 2. Check for users without email (can't create auth account)
  const noEmail = users.filter(u => !u.email);
  if (noEmail.length > 0) {
    console.error('Users without email:', noEmail.map(u => u.id));
    throw new Error(`${noEmail.length} users have no email — cannot create auth accounts`);
  }

  // 3. Check for duplicate emails
  const emails = users.map(u => u.email);
  const dupes = emails.filter((e, i) => emails.indexOf(e) !== i);
  if (dupes.length > 0) {
    console.error('Duplicate emails:', dupes);
    throw new Error(`${dupes.length} duplicate emails found`);
  }

  // 4. Create Supabase Auth accounts
  const mappings: UidMapping[] = [];
  const errors: Array<{ firebase_uid: string; email: string; error: string }> = [];

  for (const user of users) {
    // Check if auth user already exists for this email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === user.email);

    if (existing) {
      console.log(`  Auth account already exists for ${user.email} → ${existing.id}`);
      mappings.push({
        firebase_uid: user.id,
        supabase_uuid: existing.id,
        email: user.email,
      });
      continue;
    }

    const { data, error: createError } = await supabase.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: { full_name: user.real_name },
    });

    if (createError) {
      console.error(`  FAILED: ${user.email} — ${createError.message}`);
      errors.push({ firebase_uid: user.id, email: user.email, error: createError.message });
      continue;
    }

    console.log(`  Created: ${user.email} → ${data.user.id}`);
    mappings.push({
      firebase_uid: user.id,
      supabase_uuid: data.user.id,
      email: user.email,
    });
  }

  // 5. Save mappings
  const outputPath = path.join(__dirname, '../../data/uid-mappings.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
  console.log(`\nSaved ${mappings.length} mappings to ${outputPath}`);

  if (errors.length > 0) {
    console.error(`\n${errors.length} ERRORS:`);
    errors.forEach(e => console.error(`  ${e.email}: ${e.error}`));
    process.exit(1);
  }

  // 6. Generate SQL INSERT for uid_mapping table
  const sqlPath = path.join(__dirname, '../../data/uid-mapping-inserts.sql');
  const sqlLines = mappings.map(m =>
    `('${m.firebase_uid}', '${m.supabase_uuid}')`
  );
  const sql = `INSERT INTO uid_mapping (firebase_uid, supabase_uuid) VALUES\n${sqlLines.join(',\n')};\n`;
  fs.writeFileSync(sqlPath, sql);
  console.log(`Generated SQL insert at ${sqlPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

**Step 2: Run the script**

```bash
cd /Users/bumgeunsong/coding/tutorial/DailyWritingFriends
npx tsx scripts/migration/create-supabase-auth-users.ts
```

Expected: `Saved 103 mappings to data/uid-mappings.json`

**Step 3: Verify**

- Check `data/uid-mappings.json` has 103 entries
- Check `data/uid-mapping-inserts.sql` looks correct
- Verify in Supabase Dashboard > Authentication > Users that 103 users exist

**Step 4: Commit**

```bash
git add scripts/migration/create-supabase-auth-users.ts
git commit -m "feat: script to create Supabase Auth accounts for existing users"
```

---

## Task 2: Pre-migration Validation

**Files:**
- Create: `scripts/migration/validate-uid-migration.ts`

**Step 1: Write the validation script**

```typescript
// scripts/migration/validate-uid-migration.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface UidMapping {
  firebase_uid: string;
  supabase_uuid: string;
  email: string;
}

async function main() {
  const mappings: UidMapping[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../data/uid-mappings.json'), 'utf-8')
  );
  const firebaseUids = new Set(mappings.map(m => m.firebase_uid));

  console.log(`Loaded ${mappings.length} mappings\n`);

  // Check each table for orphan user_id values
  const tables = [
    { table: 'posts', column: 'author_id' },
    { table: 'comments', column: 'user_id' },
    { table: 'replies', column: 'user_id' },
    { table: 'likes', column: 'user_id' },
    { table: 'reactions', column: 'user_id' },
    { table: 'notifications', column: 'recipient_id' },
    { table: 'notifications', column: 'actor_id' },
    { table: 'drafts', column: 'user_id' },
    { table: 'user_board_permissions', column: 'user_id' },
    { table: 'board_waiting_users', column: 'user_id' },
    { table: 'blocks', column: 'blocker_id' },
    { table: 'blocks', column: 'blocked_id' },
    { table: 'users', column: 'known_buddy_uid' },
    { table: 'reviews', column: 'reviewer_id' },
  ];

  let hasErrors = false;

  for (const { table, column } of tables) {
    const { data, error } = await supabase
      .from(table)
      .select(column)
      .not(column, 'is', null);

    if (error) {
      console.error(`  ERROR querying ${table}.${column}: ${error.message}`);
      hasErrors = true;
      continue;
    }

    const values = data.map((row: Record<string, string>) => row[column]);
    const orphans = values.filter((v: string) => !firebaseUids.has(v));
    const empties = values.filter((v: string) => v === '');

    if (orphans.length > 0) {
      console.error(`  ORPHAN: ${table}.${column} has ${orphans.length} values not in mapping:`);
      orphans.slice(0, 5).forEach((v: string) => console.error(`    "${v}"`));
      hasErrors = true;
    }
    if (empties.length > 0) {
      console.error(`  EMPTY: ${table}.${column} has ${empties.length} empty strings`);
      hasErrors = true;
    }

    console.log(`  ✓ ${table}.${column}: ${values.length} values, ${orphans.length} orphans, ${empties.length} empty`);
  }

  // Row counts (for post-migration comparison)
  console.log('\n--- Row counts (save for post-migration verification) ---');
  const countTables = ['users', 'posts', 'comments', 'replies', 'likes', 'reactions',
    'notifications', 'drafts', 'blocks', 'user_board_permissions', 'board_waiting_users', 'reviews'];
  for (const t of countTables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t}: ${count}`);
  }

  if (hasErrors) {
    console.error('\n❌ VALIDATION FAILED — fix orphans/empties before proceeding');
    process.exit(1);
  } else {
    console.log('\n✅ All validations passed — safe to proceed with migration');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
```

**Step 2: Run the validation**

```bash
npx tsx scripts/migration/validate-uid-migration.ts
```

Expected: `✅ All validations passed` with row counts printed.

**Step 3: If orphans are found**, decide whether to:
- Delete orphan rows (if they reference deleted users)
- Add missing users to the mapping

**Step 4: Commit**

```bash
git add scripts/migration/validate-uid-migration.ts
git commit -m "feat: pre-migration validation for UID remap"
```

---

## Task 3: SQL Migration — Remap UIDs from TEXT to UUID

**Files:**
- Create: `supabase/migrations/20260223000000_remap_uids_to_uuid.sql`

**Step 1: Write the migration**

This migration must be run **manually** — NOT via `supabase db push`. It uses the INSERT data generated in Task 1. The migration below uses placeholder values; replace the INSERT block with contents of `data/uid-mapping-inserts.sql`.

```sql
-- Phase 8A: Remap user IDs from Firebase UID (TEXT) to Supabase Auth UUID
-- Run during maintenance window. Takes ~30 seconds for ~40k rows.

BEGIN;

-- =============================================
-- 0. Create mapping table
-- =============================================
CREATE TABLE IF NOT EXISTS uid_mapping (
  firebase_uid TEXT PRIMARY KEY,
  supabase_uuid UUID NOT NULL UNIQUE
);

-- INSERT mappings here (paste from data/uid-mapping-inserts.sql)
-- INSERT INTO uid_mapping (firebase_uid, supabase_uuid) VALUES
-- ('firebase_uid_1', 'uuid-1'),
-- ('firebase_uid_2', 'uuid-2');

-- =============================================
-- 1. Disable triggers (prevent counter corruption during mass UPDATE)
-- =============================================
ALTER TABLE posts DISABLE TRIGGER ALL;
ALTER TABLE comments DISABLE TRIGGER ALL;
ALTER TABLE replies DISABLE TRIGGER ALL;
ALTER TABLE likes DISABLE TRIGGER ALL;
ALTER TABLE reactions DISABLE TRIGGER ALL;
ALTER TABLE notifications DISABLE TRIGGER ALL;

-- =============================================
-- 2. Drop RLS policies (they reference column types)
-- =============================================
-- Already disabled via hotfix, but drop definitions to avoid issues with type change
-- (These will be recreated in Task 7 after client auth is working)

-- =============================================
-- 3. Drop FK constraints
-- =============================================
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE replies DROP CONSTRAINT IF EXISTS replies_user_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_user_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_actor_id_fkey;
ALTER TABLE drafts DROP CONSTRAINT IF EXISTS drafts_user_id_fkey;
ALTER TABLE user_board_permissions DROP CONSTRAINT IF EXISTS user_board_permissions_user_id_fkey;
ALTER TABLE board_waiting_users DROP CONSTRAINT IF EXISTS board_waiting_users_user_id_fkey;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_known_buddy_uid_fkey;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;

-- =============================================
-- 4. Drop indexes on affected columns
-- =============================================
DROP INDEX IF EXISTS idx_posts_author_created;
DROP INDEX IF EXISTS idx_comments_user_created;
DROP INDEX IF EXISTS idx_replies_user_created;
DROP INDEX IF EXISTS idx_notifications_recipient_created;
DROP INDEX IF EXISTS idx_likes_user;
DROP INDEX IF EXISTS idx_permissions_user;
DROP INDEX IF EXISTS idx_board_waiting_users_user;
DROP INDEX IF EXISTS idx_reactions_user;
DROP INDEX IF EXISTS idx_drafts_user_board;
DROP INDEX IF EXISTS idx_blocks_blocker;
DROP INDEX IF EXISTS idx_blocks_blocked;
DROP INDEX IF EXISTS idx_reviews_reviewer;

-- Also drop unique constraints that include user columns
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_user_id_key;
ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_blocked_id_key;
ALTER TABLE user_board_permissions DROP CONSTRAINT IF EXISTS user_board_permissions_user_id_board_id_key;
ALTER TABLE board_waiting_users DROP CONSTRAINT IF EXISTS board_waiting_users_board_id_user_id_key;
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_board_id_reviewer_id_key;
-- reactions unique indexes
DROP INDEX IF EXISTS idx_reactions_comment_user;
DROP INDEX IF EXISTS idx_reactions_reply_user;

-- =============================================
-- 5. UPDATE all FK columns (before altering types)
-- =============================================
UPDATE posts SET author_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE posts.author_id = m.firebase_uid;

UPDATE comments SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE comments.user_id = m.firebase_uid;

UPDATE replies SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE replies.user_id = m.firebase_uid;

UPDATE likes SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE likes.user_id = m.firebase_uid;

UPDATE reactions SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE reactions.user_id = m.firebase_uid;

UPDATE notifications SET recipient_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE notifications.recipient_id = m.firebase_uid;

UPDATE notifications SET actor_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE notifications.actor_id = m.firebase_uid;

UPDATE drafts SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE drafts.user_id = m.firebase_uid;

UPDATE user_board_permissions SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE user_board_permissions.user_id = m.firebase_uid;

UPDATE board_waiting_users SET user_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE board_waiting_users.user_id = m.firebase_uid;

UPDATE blocks SET blocker_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE blocks.blocker_id = m.firebase_uid;

UPDATE blocks SET blocked_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE blocks.blocked_id = m.firebase_uid;

UPDATE users SET known_buddy_uid = m.supabase_uuid::text
  FROM uid_mapping m WHERE users.known_buddy_uid = m.firebase_uid;

UPDATE reviews SET reviewer_id = m.supabase_uuid::text
  FROM uid_mapping m WHERE reviews.reviewer_id = m.firebase_uid;

-- PK last
UPDATE users SET id = m.supabase_uuid::text
  FROM uid_mapping m WHERE users.id = m.firebase_uid;

-- =============================================
-- 6. ALTER COLUMN types from TEXT to UUID
-- =============================================
ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE users ALTER COLUMN known_buddy_uid TYPE UUID USING known_buddy_uid::uuid;
ALTER TABLE posts ALTER COLUMN author_id TYPE UUID USING author_id::uuid;
ALTER TABLE comments ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE replies ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE likes ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE reactions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE notifications ALTER COLUMN recipient_id TYPE UUID USING recipient_id::uuid;
ALTER TABLE notifications ALTER COLUMN actor_id TYPE UUID USING actor_id::uuid;
ALTER TABLE drafts ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE user_board_permissions ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE board_waiting_users ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
ALTER TABLE blocks ALTER COLUMN blocker_id TYPE UUID USING blocker_id::uuid;
ALTER TABLE blocks ALTER COLUMN blocked_id TYPE UUID USING blocked_id::uuid;
ALTER TABLE reviews ALTER COLUMN reviewer_id TYPE UUID USING reviewer_id::uuid;

-- =============================================
-- 7. Recreate indexes
-- =============================================
CREATE INDEX idx_posts_author_created ON posts (author_id, created_at DESC);
CREATE INDEX idx_comments_user_created ON comments (user_id, created_at DESC);
CREATE INDEX idx_replies_user_created ON replies (user_id, created_at DESC);
CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_likes_user ON likes (user_id);
CREATE INDEX idx_permissions_user ON user_board_permissions (user_id);
CREATE INDEX idx_board_waiting_users_user ON board_waiting_users (user_id);
CREATE INDEX idx_reactions_user ON reactions (user_id);
CREATE INDEX idx_drafts_user_board ON drafts (user_id, board_id, saved_at DESC);
CREATE INDEX idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks (blocked_id);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id);

-- Recreate unique constraints
ALTER TABLE likes ADD CONSTRAINT likes_post_id_user_id_key UNIQUE (post_id, user_id);
ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_blocked_id_key UNIQUE (blocker_id, blocked_id);
ALTER TABLE user_board_permissions ADD CONSTRAINT user_board_permissions_user_id_board_id_key UNIQUE (user_id, board_id);
ALTER TABLE board_waiting_users ADD CONSTRAINT board_waiting_users_board_id_user_id_key UNIQUE (board_id, user_id);
ALTER TABLE reviews ADD CONSTRAINT reviews_board_id_reviewer_id_key UNIQUE (board_id, reviewer_id);
CREATE UNIQUE INDEX idx_reactions_comment_user ON reactions (comment_id, user_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX idx_reactions_reply_user ON reactions (reply_id, user_id) WHERE reply_id IS NOT NULL;

-- =============================================
-- 8. Re-add FK constraints
-- =============================================
ALTER TABLE users ADD CONSTRAINT users_known_buddy_uid_fkey
  FOREIGN KEY (known_buddy_uid) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE replies ADD CONSTRAINT replies_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reactions ADD CONSTRAINT reactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_recipient_id_fkey
  FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT notifications_actor_id_fkey
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE drafts ADD CONSTRAINT drafts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_board_permissions ADD CONSTRAINT user_board_permissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE board_waiting_users ADD CONSTRAINT board_waiting_users_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE blocks ADD CONSTRAINT blocks_blocker_id_fkey
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE blocks ADD CONSTRAINT blocks_blocked_id_fkey
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD CONSTRAINT reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE;

-- =============================================
-- 9. Re-enable triggers
-- =============================================
ALTER TABLE posts ENABLE TRIGGER ALL;
ALTER TABLE comments ENABLE TRIGGER ALL;
ALTER TABLE replies ENABLE TRIGGER ALL;
ALTER TABLE likes ENABLE TRIGGER ALL;
ALTER TABLE reactions ENABLE TRIGGER ALL;
ALTER TABLE notifications ENABLE TRIGGER ALL;

-- =============================================
-- 10. Verification queries (check before COMMIT)
-- =============================================

-- Row counts
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'posts', count(*) FROM posts
UNION ALL SELECT 'comments', count(*) FROM comments
UNION ALL SELECT 'replies', count(*) FROM replies
UNION ALL SELECT 'likes', count(*) FROM likes
UNION ALL SELECT 'reactions', count(*) FROM reactions
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'drafts', count(*) FROM drafts
UNION ALL SELECT 'blocks', count(*) FROM blocks;

-- Column types (should all be 'uuid')
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE (column_name IN ('author_id', 'user_id', 'recipient_id', 'actor_id',
       'blocker_id', 'blocked_id', 'known_buddy_uid', 'reviewer_id')
       OR (table_name = 'users' AND column_name = 'id'))
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- FK constraints exist
SELECT conname FROM pg_constraint
WHERE contype = 'f' AND confrelid = 'public.users'::regclass;

COMMIT;

-- Post-commit: clean up dead tuples
VACUUM ANALYZE users;
VACUUM ANALYZE posts;
VACUUM ANALYZE comments;
VACUUM ANALYZE replies;
VACUUM ANALYZE likes;
VACUUM ANALYZE reactions;
VACUUM ANALYZE notifications;
VACUUM ANALYZE drafts;
VACUUM ANALYZE blocks;
```

**Step 2: Test on local Supabase first**

```bash
npm run supabase:reset  # Reset local DB with seed data
# Then run the migration against local
```

**Step 3: Run on production** during maintenance window (paste into SQL Editor)

**Step 4: Commit**

```bash
git add supabase/migrations/20260223000000_remap_uids_to_uuid.sql
git commit -m "feat: SQL migration to remap user IDs from TEXT to UUID"
```

---

## Task 4: Configure Google OAuth in Supabase (Manual)

**No code changes. Dashboard configuration only.**

**Step 1: Get Google OAuth credentials**

- Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Credentials
- Find the existing OAuth 2.0 Client ID used by Firebase
- Note the Client ID and Client Secret

**Step 2: Add Supabase redirect URI to Google**

Add this as an authorized redirect URI:
```
https://mbnuuctaptbxytiiwxet.supabase.co/auth/v1/callback
```

**Step 3: Configure Supabase Auth**

In Supabase Dashboard → Authentication → Providers → Google:
- Enable Google provider
- Paste Client ID and Client Secret

In Supabase Dashboard → Authentication → URL Configuration:
- Site URL: your production URL (e.g., `https://daily-writing-friends.vercel.app`)
- Redirect URLs: add your production URL and any staging URLs

**Step 4: Test locally**

- Start local Supabase
- Configure Google provider in local dashboard (http://localhost:54323)
- Verify OAuth flow works in dev

---

## Task 5: Update Supabase Client — Enable Auth Session

**Files:**
- Modify: `src/shared/api/supabaseClient.ts`

**Step 1: Enable persistent auth sessions in production**

Change the production auth config from disabled to enabled:

```typescript
// src/shared/api/supabaseClient.ts
// BEFORE (lines 42-53):
supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: isLocal
    ? { autoRefreshToken: true, persistSession: true }
    : { autoRefreshToken: false, persistSession: false },
});

// AFTER:
supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

**Step 2: Commit**

```bash
git add src/shared/api/supabaseClient.ts
git commit -m "feat: enable Supabase auth session persistence in production"
```

---

## Task 6: Replace Firebase Auth with Supabase Auth

**Files:**
- Create: `src/shared/auth/supabaseAuth.ts` (replaces `src/firebase/auth.ts`)
- Modify: `src/shared/hooks/useAuth.tsx`
- Modify: `src/shared/utils/authUtils.ts`
- Modify: `src/shared/utils/getCurrentUserId.ts`
- Modify: `src/login/hooks/useGoogleLoginWithRedirect.ts`
- Modify: `src/user/components/UserSettingPage.tsx`
- Modify: `src/user/api/user.ts`
- Modify: `src/shared/components/DebugInfo.tsx`

### Step 1: Create Supabase auth module

```typescript
// src/shared/auth/supabaseAuth.ts
import { getSupabaseClient } from '@/shared/api/supabaseClient';

/**
 * Sign in with Google OAuth via Supabase
 * Uses redirect flow (not popup)
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();

  // Detect Kakao in-app browser and redirect to external browser
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('kakaotalk')) {
    const currentUrl = window.location.href;
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    throw new Error('카카오톡 인앱 브라우저에서는 로그인할 수 없습니다. 외부 브라우저로 이동합니다.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;
  // User is redirected to Google, then back to the app.
  // Supabase client auto-extracts session from URL hash on return.
}

/**
 * Sign out the current user
 */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Sign in with email/password (local testing only)
 */
export async function signInWithTestCredentials(
  email: string,
  password: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
```

### Step 2: Rewrite useAuth hook

```typescript
// src/shared/hooks/useAuth.tsx
import React, { useContext, useState, useEffect, createContext } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { setSentryUser } from '@/sentry';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  redirectPathAfterLogin: string | null;
  setRedirectPathAfterLogin: (path: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  redirectPathAfterLogin: null,
  setRedirectPathAfterLogin: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectPathAfterLogin, setRedirectPathAfterLogin] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      syncUserContext(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      syncUserContext(user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = { currentUser, loading, redirectPathAfterLogin, setRedirectPathAfterLogin };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function syncUserContext(user: User | null) {
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify({
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.full_name ?? null,
    }));
    setSentryUser({
      uid: user.id,
      email: user.email,
      displayName: user.user_metadata?.full_name,
    });
  } else {
    localStorage.removeItem('currentUser');
    setSentryUser(null);
  }
}
```

### Step 3: Update getCurrentUserId

```typescript
// src/shared/utils/getCurrentUserId.ts
interface StoredUser {
  id: string;
  email?: string;
  displayName?: string;
}

function parseStoredUser(): StoredUser | null {
  try {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      return JSON.parse(storedUser);
    }
  } catch (error) {
    console.error('Failed to parse stored user:', error);
  }
  return null;
}

export function getCurrentUserIdFromStorage(): string | null {
  const user = parseStoredUser();
  return user?.id || null;
}

export function getCurrentUserEmailFromStorage(): string | null {
  const user = parseStoredUser();
  return user?.email || null;
}

export function getCurrentUserFromStorage(): { uid: string; email?: string; displayName?: string } | null {
  const user = parseStoredUser();
  if (user?.id) {
    return {
      uid: user.id,  // Keep 'uid' key for backward compat with consumers
      email: user.email,
      displayName: user.displayName,
    };
  }
  return null;
}
```

### Step 4: Update authUtils

```typescript
// src/shared/utils/authUtils.ts
import { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/shared/api/supabaseClient';

/**
 * Get the current authenticated user (for use in route loaders)
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}
```

### Step 5: Update useGoogleLoginWithRedirect

```typescript
// src/login/hooks/useGoogleLoginWithRedirect.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle } from '@/shared/auth/supabaseAuth';
import { getLoginRedirectPath } from '@/login/utils/loginUtils';
import { useAuth } from '@/shared/hooks/useAuth';
import { useIsCurrentUserActive } from './useIsCurrentUserActive';

interface UseGoogleLoginWithRedirectReturn {
  handleLogin: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export function useGoogleLoginWithRedirect(): UseGoogleLoginWithRedirectReturn {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { currentUser } = useAuth();
  const { isCurrentUserActive, isLoading: isCheckingActiveStatus } = useIsCurrentUserActive();

  // After OAuth redirect returns, user will be set by onAuthStateChange.
  // Navigate once active status is determined.
  useEffect(() => {
    if (!currentUser || isCheckingActiveStatus) return;

    const redirectPath = getLoginRedirectPath(isCurrentUserActive ?? false);
    navigate(redirectPath);
  }, [currentUser, isCurrentUserActive, isCheckingActiveStatus, navigate]);

  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
      // User is redirected to Google — page unloads here.
      // On return, useAuth picks up the session automatically.
    } catch (err) {
      const errorMessage = err instanceof Error ? err : new Error('Google login failed');
      console.error('Error during Google sign-in:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  return { handleLogin, isLoading, error };
}
```

### Step 6: Update UserSettingPage sign-out

In `src/user/components/UserSettingPage.tsx`, replace:
```typescript
// BEFORE:
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';
// ... inside handleLogout:
await signOut(auth);

// AFTER:
import { signOutUser } from '@/shared/auth/supabaseAuth';
// ... inside handleLogout:
await signOutUser();
```

### Step 7: Update createUserIfNotExists

In `src/user/api/user.ts`, update the function signature and field mapping:
```typescript
// BEFORE:
import { User as FirebaseUser } from 'firebase/auth';
export async function createUserIfNotExists(user: FirebaseUser): Promise<void> {
  const existing = await fetchUser(user.uid);
  // ...
  uid: user.uid,
  realName: user.displayName,
  nickname: user.displayName,
  email: user.email,
  profilePhotoURL: user.photoURL,

// AFTER:
import { User as SupabaseUser } from '@supabase/supabase-js';
export async function createUserIfNotExists(user: SupabaseUser): Promise<void> {
  const existing = await fetchUser(user.id);
  // ...
  uid: user.id,
  realName: user.user_metadata?.full_name ?? null,
  nickname: user.user_metadata?.full_name ?? null,
  email: user.email ?? null,
  profilePhotoURL: user.user_metadata?.avatar_url ?? null,
```

### Step 8: Update DebugInfo

In `src/shared/components/DebugInfo.tsx`, replace Firebase auth references:
```typescript
// BEFORE:
import { auth } from '@/firebase';
import { User as FirebaseUser } from 'firebase/auth';
// ... auth.onAuthStateChanged(...)

// AFTER:
import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { User } from '@supabase/supabase-js';
// ... getSupabaseClient().auth.onAuthStateChange(...)
// user.uid → user.id
// user.displayName → user.user_metadata?.full_name
```

### Step 9: Commit

```bash
git add src/shared/auth/supabaseAuth.ts src/shared/hooks/useAuth.tsx \
  src/shared/utils/authUtils.ts src/shared/utils/getCurrentUserId.ts \
  src/login/hooks/useGoogleLoginWithRedirect.ts \
  src/user/components/UserSettingPage.tsx src/user/api/user.ts \
  src/shared/components/DebugInfo.tsx
git commit -m "feat: replace Firebase Auth with Supabase Auth"
```

---

## Task 7: Re-enable RLS Policies

**Files:**
- Create: `supabase/migrations/20260223000001_reenable_rls.sql`

**Step 1: Write the migration**

```sql
-- Re-enable RLS with Supabase Auth UUID-native policies

-- Posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public posts are viewable by everyone"
  ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);

-- Comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

-- Replies
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies are viewable by everyone"
  ON replies FOR SELECT USING (true);
CREATE POLICY "Users can insert their own replies"
  ON replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own replies"
  ON replies FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies"
  ON replies FOR DELETE USING (auth.uid() = user_id);

-- Likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own likes"
  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE USING (auth.uid() = user_id);

-- Reactions
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions are viewable by everyone"
  ON reactions FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reactions"
  ON reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions"
  ON reactions FOR DELETE USING (auth.uid() = user_id);

-- Notifications (users can only see their own)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);

-- Drafts (users can only access their own)
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own drafts"
  ON drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own drafts"
  ON drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own drafts"
  ON drafts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own drafts"
  ON drafts FOR DELETE USING (auth.uid() = user_id);
```

Note: No `::text` cast needed — `auth.uid()` returns UUID, columns are now UUID.

**Step 2: Apply** after verifying client auth works in production.

**Step 3: Commit**

```bash
git add supabase/migrations/20260223000001_reenable_rls.sql
git commit -m "feat: re-enable RLS with UUID-native auth.uid() policies"
```

---

## Task 8: Clean Up Firebase Auth Imports

**Files:**
- Delete: `src/firebase/auth.ts`
- Modify: `src/firebase.ts` — remove auth exports
- Modify: any remaining files importing from `firebase/auth` or `@/firebase` for auth

**Step 1: Search for remaining Firebase auth imports**

```bash
grep -rn "firebase/auth\|from '@/firebase'" src/ --include="*.ts" --include="*.tsx"
```

**Step 2: Remove or replace** each import found.

**Step 3: Delete `src/firebase/auth.ts`**

**Step 4: Clean `src/firebase.ts`** — remove `getAuth`, `GoogleAuthProvider`, auth wrappers. Keep only what's needed for Firebase Storage and other remaining services.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Firebase Auth SDK imports"
```

---

## Task 9: Update LLM Testing Docs

**Files:**
- Modify: `docs/LLM_TESTING.md`

**Step 1: Update the auth section**

The testing workflow now uses Supabase Auth directly — no workaround needed:

```markdown
### Authentication

Claude authenticates via Playwright MCP's `browser_evaluate`:

```javascript
const { createClient } = await import('@supabase/supabase-js');
const sb = createClient('http://localhost:54321', '<anon-key>');
await sb.auth.signInWithPassword({ email: 'test@test.local', password: 'test1234' });
```

Then refresh the page — the app picks up the Supabase session.
```

Remove any Firebase-specific workaround notes.

**Step 2: Commit**

```bash
git add docs/LLM_TESTING.md
git commit -m "docs: update LLM testing to use Supabase Auth directly"
```

---

## Execution Order & Dependencies

```
Task 1 (create auth accounts) → Task 2 (validate) → Task 3 (SQL migration)
                                                           ↓
Task 4 (configure OAuth) ──────────────────────────→ Task 6 (client code)
                                                           ↓
Task 5 (enable auth session) ──────────────────────→ Task 6
                                                           ↓
                                                     Task 7 (re-enable RLS)
                                                           ↓
                                                     Task 8 (cleanup)
                                                           ↓
                                                     Task 9 (docs)
```

Tasks 1-3 can be done pre-deployment (no user impact).
Tasks 4-6 require a maintenance window.
Tasks 7-9 can be done after verifying auth works.

---

## Deployment Checklist

- [ ] Task 1: Supabase Auth accounts created (103 users)
- [ ] Task 2: Validation passes (0 orphans, 0 empty strings)
- [ ] Task 3: UID remap SQL tested on local Supabase
- [ ] Task 4: Google OAuth configured in Supabase Dashboard
- [ ] **MAINTENANCE WINDOW START**
- [ ] Task 3: Run UID remap SQL on production
- [ ] Task 5+6: Deploy client code changes
- [ ] Verify: At least one user can login via Google
- [ ] **MAINTENANCE WINDOW END**
- [ ] Task 7: Apply RLS migration
- [ ] Task 8: Clean up Firebase auth imports
- [ ] Task 9: Update docs
- [ ] Monitor for 2 weeks, then archive Firebase project
