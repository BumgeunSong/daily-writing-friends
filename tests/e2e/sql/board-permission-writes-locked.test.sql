-- SQL tests for migration 20260823010000_lock_board_permission_writes.
--
-- Run with:
--   docker exec -i supabase_db_DailyWritingFriends \
--     psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < tests/e2e/sql/board-permission-writes-locked.test.sql
--
-- The board-scoped read gate trusts user_board_permissions completely. These
-- tests pin the other half of that trust: a signed-in user must not be able to
-- write their own way into a board.

BEGIN;

INSERT INTO auth.users (id, instance_id, email, aud, role, email_confirmed_at, created_at, updated_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-outsider-writer@example.com', 'authenticated', 'authenticated', now(), now(), now()),
  ('d0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-board-member@example.com',    'authenticated', 'authenticated', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, real_name, nickname)
VALUES
  ('d0000000-0000-0000-0000-000000000001'::uuid, 'Outsider', 'outsider'),
  ('d0000000-0000-0000-0000-000000000002'::uuid, 'Member',   'member');

INSERT INTO public.boards (id, title, cohort) VALUES ('locked-board', 'Cohort 12', 12);

INSERT INTO public.user_board_permissions (user_id, board_id, permission)
VALUES ('d0000000-0000-0000-0000-000000000002'::uuid, 'locked-board', 'write');

INSERT INTO public.posts (id, board_id, author_id, author_name, title, content, visibility)
VALUES ('post-locked', 'locked-board', 'd0000000-0000-0000-0000-000000000002'::uuid, 'Member', 'Members only', 'body', 'public');

SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- The gate holds before any tampering.
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.posts_feed WHERE board_id = 'locked-board';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'outsider could already read the board before tampering: % row(s)', v_count;
  END IF;
END $$;

-- The bypass: granting yourself the board. Must be rejected outright.
DO $$
BEGIN
  INSERT INTO public.user_board_permissions (user_id, board_id, permission)
  VALUES ('d0000000-0000-0000-0000-000000000001'::uuid, 'locked-board', 'write');
  RAISE EXCEPTION 'expected RLS to reject a self-granted board permission';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

-- Escalating an existing row is the same bypass by another route. The outsider
-- has no row to escalate, so this asserts UPDATE is closed for the member's row
-- too (the old policy allowed updating any row whose user_id matched, and a
-- user_id can be pointed at a different board).
DO $$
BEGIN
  UPDATE public.user_board_permissions
     SET board_id = 'locked-board'
   WHERE user_id = 'd0000000-0000-0000-0000-000000000001'::uuid;
  IF FOUND THEN
    RAISE EXCEPTION 'expected UPDATE on user_board_permissions to be denied';
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

-- Revoking someone else's access must also be impossible.
DO $$
BEGIN
  DELETE FROM public.user_board_permissions WHERE board_id = 'locked-board';
  IF FOUND THEN
    RAISE EXCEPTION 'expected DELETE on user_board_permissions to be denied';
  END IF;
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

-- The gate still holds after every attempt.
DO $$
DECLARE v_count bigint;
BEGIN
  SELECT count(*) INTO v_count FROM public.posts_feed WHERE board_id = 'locked-board';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'BYPASS: outsider read the board after tampering: % row(s)', v_count;
  END IF;
END $$;

-- Signup still works: joining the waiting list stays open, and it grants no reads.
DO $$
DECLARE v_count bigint;
BEGIN
  INSERT INTO public.board_waiting_users (board_id, user_id)
  VALUES ('locked-board', 'd0000000-0000-0000-0000-000000000001'::uuid);

  SELECT count(*) INTO v_count FROM public.posts_feed WHERE board_id = 'locked-board';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'waiting-list membership must not grant reads: % row(s)', v_count;
  END IF;
END $$;

RESET role;

-- service_role remains the grant path the admin approval route depends on.
SET LOCAL role service_role;
INSERT INTO public.user_board_permissions (user_id, board_id, permission)
VALUES ('d0000000-0000-0000-0000-000000000001'::uuid, 'locked-board', 'read');
RESET role;

-- And an approved user reads the board for real.
DO $$
DECLARE v_count bigint;
BEGIN
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  SELECT count(*) INTO v_count FROM public.posts_feed WHERE board_id = 'locked-board';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'approved user should read 1 post but read %', v_count;
  END IF;
END $$;

RESET role;

ROLLBACK;
