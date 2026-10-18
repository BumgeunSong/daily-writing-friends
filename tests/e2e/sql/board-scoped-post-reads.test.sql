-- SQL tests for migration 20260823000000_board_scoped_post_reads.
--
-- Run with:
--   docker exec -i supabase_db_DailyWritingFriends \
--     psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < tests/e2e/sql/board-scoped-post-reads.test.sql
--
-- Fixture: two cohort boards. `member` belongs to board-current only; `outsider`
-- belongs to no board and stands in for a fresh applicant who has just finished
-- the signup form. `alum` authored a post in board-past but no longer holds a
-- permission row there.
--
-- Every read below goes through BOTH read paths, because they are gated
-- independently: the `posts` table (RLS) and the `posts_feed` view (its own
-- WHERE clause, since the view bypasses RLS by design).

BEGIN;

INSERT INTO auth.users (id, instance_id, email, aud, role, email_confirmed_at, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-member@example.com',   'authenticated', 'authenticated', now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-outsider@example.com', 'authenticated', 'authenticated', now(), now(), now()),
  ('b0000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-alum@example.com',     'authenticated', 'authenticated', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, real_name, nickname)
VALUES
  ('b0000000-0000-0000-0000-000000000001'::uuid, 'Member',   'member'),
  ('b0000000-0000-0000-0000-000000000002'::uuid, 'Outsider', 'outsider'),
  ('b0000000-0000-0000-0000-000000000003'::uuid, 'Alum',     'alum');

INSERT INTO public.boards (id, title, cohort)
VALUES
  ('board-current', 'Cohort 11', 11),
  ('board-past',    'Cohort 10', 10);

INSERT INTO public.user_board_permissions (user_id, board_id, permission)
VALUES ('b0000000-0000-0000-0000-000000000001'::uuid, 'board-current', 'write');

INSERT INTO public.posts (id, board_id, author_id, author_name, title, content, visibility)
VALUES
  ('post-current-public',  'board-current', 'b0000000-0000-0000-0000-000000000001'::uuid, 'Member', 'Current public',  'body', 'public'),
  ('post-past-public',     'board-past',    'b0000000-0000-0000-0000-000000000003'::uuid, 'Alum',   'Past public',     'body', 'public'),
  ('post-past-private',    'board-past',    'b0000000-0000-0000-0000-000000000003'::uuid, 'Alum',   'Past private',    'body', 'private');

INSERT INTO public.comments (id, post_id, user_id, user_name, content)
VALUES ('comment-past', 'post-past-public', 'b0000000-0000-0000-0000-000000000003'::uuid, 'Alum', 'past comment');

-- Helper: run a count under a given identity and assert it.
CREATE OR REPLACE FUNCTION pg_temp.assert_count(p_label TEXT, p_sql TEXT, p_expected BIGINT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_actual BIGINT;
BEGIN
  EXECUTE p_sql INTO v_actual;
  IF v_actual IS DISTINCT FROM p_expected THEN
    RAISE EXCEPTION '% : expected % row(s) but got %', p_label, p_expected, v_actual;
  END IF;
END $$;

-- ---------------------------------------------------------------
-- Outsider: the reported case. A signed-up but unapproved applicant.
-- ---------------------------------------------------------------
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}';

SELECT pg_temp.assert_count(
  'outsider must not read posts of a board they do not belong to (posts)',
  $q$SELECT count(*) FROM public.posts WHERE board_id = 'board-past'$q$, 0);

SELECT pg_temp.assert_count(
  'outsider must not read the feed of a board they do not belong to (posts_feed)',
  $q$SELECT count(*) FROM public.posts_feed WHERE board_id = 'board-past'$q$, 0);

SELECT pg_temp.assert_count(
  'outsider must not read the in-progress board either',
  $q$SELECT count(*) FROM public.posts_feed WHERE board_id = 'board-current'$q$, 0);

SELECT pg_temp.assert_count(
  'outsider must not read comments on an inaccessible board',
  $q$SELECT count(*) FROM public.comments WHERE post_id = 'post-past-public'$q$, 0);

-- ---------------------------------------------------------------
-- Anonymous callers hold the shipped anon key; they get nothing.
-- ---------------------------------------------------------------
SET LOCAL role anon;
SET LOCAL request.jwt.claims = '';

SELECT pg_temp.assert_count(
  'anon must not read any board feed',
  $q$SELECT count(*) FROM public.posts_feed$q$, 0);

SELECT pg_temp.assert_count(
  'anon must not read any post',
  $q$SELECT count(*) FROM public.posts$q$, 0);

-- ---------------------------------------------------------------
-- Member: unchanged access to their own board, still walled off from others.
-- ---------------------------------------------------------------
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000001","role":"authenticated"}';

SELECT pg_temp.assert_count(
  'member reads their own board feed',
  $q$SELECT count(*) FROM public.posts_feed WHERE board_id = 'board-current'$q$, 1);

SELECT pg_temp.assert_count(
  'member is still walled off from a board they never joined',
  $q$SELECT count(*) FROM public.posts_feed WHERE board_id = 'board-past'$q$, 0);

-- ---------------------------------------------------------------
-- Alum: authorship outlives the permission row, so their own writing stays
-- readable even after they leave the cohort.
-- ---------------------------------------------------------------
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000003","role":"authenticated"}';

SELECT pg_temp.assert_count(
  'author still reads their own posts in a board they no longer belong to',
  $q$SELECT count(*) FROM public.posts WHERE board_id = 'board-past'$q$, 2);

SELECT pg_temp.assert_count(
  'author still sees their own posts in the feed view',
  $q$SELECT count(*) FROM public.posts_feed WHERE board_id = 'board-past'$q$, 2);

SELECT pg_temp.assert_count(
  'author reads the body of their own private post',
  $q$SELECT count(*) FROM public.posts_feed WHERE id = 'post-past-private' AND content IS NOT NULL$q$, 1);

-- ---------------------------------------------------------------
-- Writes follow reads: a non-member cannot post or comment into a board.
-- ---------------------------------------------------------------
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}';

DO $$
BEGIN
  INSERT INTO public.posts (id, board_id, author_id, author_name, title, content, visibility)
  VALUES ('post-intruder', 'board-current', 'b0000000-0000-0000-0000-000000000002'::uuid, 'Outsider', 'Nope', 'body', 'public');
  RAISE EXCEPTION 'expected RLS to reject a non-member INSERT into posts';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

DO $$
BEGIN
  INSERT INTO public.comments (id, post_id, user_id, user_name, content)
  VALUES ('comment-intruder', 'post-past-public', 'b0000000-0000-0000-0000-000000000002'::uuid, 'Outsider', 'Nope');
  RAISE EXCEPTION 'expected RLS to reject a non-member INSERT into comments';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

RESET role;

ROLLBACK;
