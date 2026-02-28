# Retro: Firebase Auth → Supabase Auth Migration (Phase 8)

**Date:** 2026-02-28
**Scope:** Running migration scripts and SQL locally before production

---

## What happened

### 1. Duplicate email blocked Task 1 script

**Problem:** `create-supabase-auth-users.ts` failed with "1 duplicate emails found" for `isp1195@gmail.com`.

**Root cause:** During a manual test login, the app's `createUserIfNotExists` created a second row in `public.users` with the Supabase UUID (not the original Firebase UID). This produced two rows with the same email.

**Fix:** Deleted the test-created duplicate row, also deleted the test auth user from Supabase Dashboard.

**Lesson:** Always clean up test data after manual OAuth testing. Consider adding a unique constraint on `users.email` to prevent this class of issue.

---

### 2. `supabase db reset` seed failure (pg_net trigger)

**Problem:** `supabase db reset` applies seed data, but notification triggers fire during seeding and crash on `pg_net`'s `http_request_queue` (null URL).

**Root cause:** The notification triggers (created in migration `20260222000000`) call `pg_net` to send HTTP requests. During local seeding, there's no valid webhook URL configured, so the trigger inserts a null URL and violates a NOT NULL constraint. The seed runs in a single batch — one failure rolls back everything.

**Workaround:**
```bash
# Disable user triggers before seeding
docker exec supabase_db_DailyWritingFriends psql -U postgres -d postgres \
  -c "ALTER TABLE notifications DISABLE TRIGGER USER; ..."

# Seed manually
docker exec -i supabase_db_DailyWritingFriends psql -U postgres -d postgres < supabase/seed.sql

# Re-enable triggers
docker exec supabase_db_DailyWritingFriends psql -U postgres -d postgres \
  -c "ALTER TABLE notifications ENABLE TRIGGER USER; ..."
```

**Better fix (TODO):** Add a guard to the notification trigger that checks if the webhook URL is configured before calling `pg_net`. Or add `SET LOCAL` to disable the trigger within seed.sql itself.

---

### 3. `supabase migration up` permission denied on `DISABLE TRIGGER ALL`

**Problem:** `supabase migration up --local` runs as a non-superuser role that can't disable system triggers (FK constraint triggers).

**Root cause:** `DISABLE TRIGGER ALL` includes system triggers (RI_ConstraintTrigger_*) which require superuser. The Supabase CLI runs migrations through a connection pooler or limited role, not the raw `postgres` superuser.

**Fix:** Changed `DISABLE TRIGGER ALL` → `DISABLE TRIGGER USER` in the migration. This is safe because:
- We only need to suppress user-defined triggers (notification/counter triggers)
- FK constraint triggers are dropped in the next step anyway (DROP CONSTRAINT)

**Lesson:** Always use `DISABLE TRIGGER USER` in Supabase migrations, not `DISABLE TRIGGER ALL`.

---

### 4. `ALTER COLUMN TYPE` blocked by RLS policies

**Problem:** `ALTER TABLE posts ALTER COLUMN author_id TYPE UUID` failed with "cannot alter type of a column used in a policy definition".

**Root cause:** RLS policies reference column types. PostgreSQL requires policies to be dropped before altering the referenced column type. The original migration assumed RLS was already disabled via a production hotfix, but local Supabase had active RLS policies from earlier migrations.

**Fix:** Added a step to explicitly drop all 24 RLS policies and disable RLS before the ALTER TYPE step. Policies will be recreated by the separate RLS re-enablement migration.

**Lesson:** Never assume external state (like "RLS was disabled via hotfix"). Migrations should be self-contained — explicitly drop and recreate anything that blocks the operation.

---

### 5. `SET LOCAL` outside transaction warning

**Problem:** `SET LOCAL lock_timeout` produced a warning when run via `supabase migration up` because it wasn't inside an explicit transaction.

**Root cause:** `SET LOCAL` only works inside `BEGIN/COMMIT` blocks. The Supabase CLI may or may not wrap migrations in transactions depending on the command used.

**Fix:** Removed explicit `BEGIN`/`COMMIT` from the migration file (added a comment that `supabase db push` wraps automatically). When running manually via `psql`, we wrap with `-c "BEGIN;" -f migration.sql -c "COMMIT;"`.

**Lesson:** For migrations that need manual execution via psql, always wrap externally rather than embedding `BEGIN`/`COMMIT` in the file.

---

## Local Supabase testing workflow (reference)

For migrations that can't be tested via `supabase db reset` alone:

```bash
# 1. Move the migration aside
mv supabase/migrations/NEW_MIGRATION.sql /tmp/

# 2. Reset DB (applies all other migrations)
npx supabase db reset

# 3. Seed manually (if trigger issues)
docker exec $DB_CONTAINER psql -U postgres -d postgres \
  -c "ALTER TABLE notifications DISABLE TRIGGER USER; ..."
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < supabase/seed.sql
docker exec $DB_CONTAINER psql -U postgres -d postgres \
  -c "ALTER TABLE notifications ENABLE TRIGGER USER; ..."

# 4. Set up any prerequisites (e.g., create auth users)
npx tsx scripts/migration/setup-script.ts

# 5. Restore and apply migration via psql (wrapped in transaction)
mv /tmp/NEW_MIGRATION.sql supabase/migrations/
docker cp supabase/migrations/NEW_MIGRATION.sql $DB_CONTAINER:/tmp/migration.sql
docker exec -i $DB_CONTAINER psql -U postgres -d postgres \
  -v ON_ERROR_STOP=1 -c "BEGIN;" -f /tmp/migration.sql -c "COMMIT;"

# 6. Verify
docker exec $DB_CONTAINER psql -U postgres -d postgres \
  -c "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE ..."
```

The container name follows the pattern: `supabase_db_<ProjectDirName>`

---

## Summary of migration file fixes

| Issue | Before | After |
|---|---|---|
| Trigger disable | `DISABLE TRIGGER ALL` | `DISABLE TRIGGER USER` |
| RLS policies | Assumed dropped externally | Explicitly dropped in migration |
| Transaction wrapper | `BEGIN`/`COMMIT` inside file | Removed (CLI or psql wraps) |
| INSERT data | Placeholder comment | Actual mapping data inlined |
| VACUUM statements | Inside file | Removed (run separately) |
