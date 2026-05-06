-- T.11: backfill correctness against a seeded fixture.
--
-- Validates the four scenarios from spec.md "Backfill marks pre-existing onboarded users":
--   1. user with board permission → onboarding_complete = true
--   2. user in any waiting list   → onboarding_complete = true
--   3. user with phone_number     → onboarding_complete = true
--   4. user with no signal        → onboarding_complete = false
--
-- The migration's backfill UPDATE has already run on db reset; this test stages four
-- new rows whose state mirrors what the backfill would have observed, then re-runs
-- the same UPDATE clause and asserts the resulting flag matches expectation.
--
-- Run with:
--   docker exec -i supabase_db_DailyWritingFriends \
--     psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < tests/e2e/sql/users-backfill.test.sql

BEGIN;

INSERT INTO auth.users (id, instance_id, email, aud, role, email_confirmed_at, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'backfill-permission@example.com', 'authenticated', 'authenticated', now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'backfill-waitlist@example.com',   'authenticated', 'authenticated', now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'backfill-phone@example.com',      'authenticated', 'authenticated', now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'backfill-no-signal@example.com',  'authenticated', 'authenticated', now(), now(), now());

-- Production invariant: permission/waitlist users always have phone_number too.
INSERT INTO public.users (id, real_name, phone_number)
VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Permission Person', '01011112222'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Waitlist Person',   '01033334444'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, 'Phone Person',      '01099998888');

INSERT INTO public.users (id, real_name)
VALUES ('b0000000-0000-0000-0000-000000000004'::uuid, 'No Signal');

-- Insert a fixture board (the seed has no boards by default in CI environments).
INSERT INTO public.boards (id, title, description, created_at)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'fixture-backfill-board', 'fixture', now())
ON CONFLICT (id) DO NOTHING;

-- Insert membership signals for #1 and #2.
INSERT INTO public.user_board_permissions (user_id, board_id, permission)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'read')
ON CONFLICT DO NOTHING;

INSERT INTO public.board_waiting_users (user_id, board_id)
VALUES ('b0000000-0000-0000-0000-000000000002'::uuid, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid)
ON CONFLICT DO NOTHING;

-- Reset onboarding flag for these fixture rows to false so we can re-run the backfill.
UPDATE public.users
   SET onboarding_complete = false
 WHERE id IN (
   'b0000000-0000-0000-0000-000000000001'::uuid,
   'b0000000-0000-0000-0000-000000000002'::uuid,
   'b0000000-0000-0000-0000-000000000003'::uuid,
   'b0000000-0000-0000-0000-000000000004'::uuid
 );

-- Re-apply the same backfill UPDATE used by the migration.
UPDATE public.users SET onboarding_complete = true
WHERE
  id IN (SELECT DISTINCT user_id FROM public.user_board_permissions)
  OR id IN (SELECT DISTINCT user_id FROM public.board_waiting_users)
  OR phone_number IS NOT NULL;

DO $$
DECLARE
  pcount INT;
  wcount INT;
  phcount INT;
  nocount INT;
BEGIN
  SELECT count(*) INTO pcount  FROM public.users WHERE id = 'b0000000-0000-0000-0000-000000000001'::uuid AND onboarding_complete;
  SELECT count(*) INTO wcount  FROM public.users WHERE id = 'b0000000-0000-0000-0000-000000000002'::uuid AND onboarding_complete;
  SELECT count(*) INTO phcount FROM public.users WHERE id = 'b0000000-0000-0000-0000-000000000003'::uuid AND onboarding_complete;
  SELECT count(*) INTO nocount FROM public.users WHERE id = 'b0000000-0000-0000-0000-000000000004'::uuid AND NOT onboarding_complete;

  IF pcount  <> 1 THEN RAISE EXCEPTION 'permission user not backfilled (pcount=%)', pcount; END IF;
  IF wcount  <> 1 THEN RAISE EXCEPTION 'waitlist user not backfilled (wcount=%)', wcount; END IF;
  IF phcount <> 1 THEN RAISE EXCEPTION 'phone user not backfilled (phcount=%)', phcount; END IF;
  IF nocount <> 1 THEN RAISE EXCEPTION 'no-signal user incorrectly backfilled (nocount=%)', nocount; END IF;
END $$;

ROLLBACK;
