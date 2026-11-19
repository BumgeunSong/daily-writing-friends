-- Regression test: board members may interact with a private post, nobody but
-- the author may read its body. Runs inside a transaction and rolls back.
--
--   docker exec -i supabase_db_<project> psql -U postgres -v ON_ERROR_STOP=1 \
--     < supabase/tests/private_post_interactions.sql
--
-- Any failed assertion raises and aborts the script with a non-zero exit code.

BEGIN;

-- Seed bypasses notification triggers (they call net.http_post).
SET LOCAL session_replication_role = replica;

INSERT INTO auth.users (id, instance_id, aud, role, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'author@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@test.local');
INSERT INTO public.users (id) VALUES
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-0000000000c1');
INSERT INTO public.boards (id, title) VALUES ('t-board', 't'), ('t-other', 't');
INSERT INTO public.user_board_permissions (user_id, board_id, permission) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 't-board', 'write'),
  ('00000000-0000-0000-0000-0000000000b1', 't-board', 'write'),
  ('00000000-0000-0000-0000-0000000000c1', 't-other', 'write');
INSERT INTO public.posts (id, board_id, author_id, author_name, title, content, visibility) VALUES
  ('t-private', 't-board', '00000000-0000-0000-0000-0000000000a1', 'author', 'title', 'SECRET BODY', 'private');
INSERT INTO public.comments (id, post_id, user_id, content) VALUES
  ('t-comment-author', 't-private', '00000000-0000-0000-0000-0000000000a1', 'author comment');
-- Rows the outsider must not be able to see, so the "reads no X" checks are meaningful.
INSERT INTO public.replies (id, comment_id, post_id, user_id, content) VALUES
  ('t-reply-author', 't-comment-author', 't-private', '00000000-0000-0000-0000-0000000000a1', 'author reply');
INSERT INTO public.likes (id, post_id, user_id) VALUES
  ('t-like-author', 't-private', '00000000-0000-0000-0000-0000000000a1');
INSERT INTO public.reactions (id, comment_id, user_id, reaction_type) VALUES
  ('t-react-author', 't-comment-author', '00000000-0000-0000-0000-0000000000a1', 'heart');

CREATE TEMP TABLE results (label text, ok boolean);
GRANT ALL ON results TO authenticated;

-- Runs one statement as the given user. Returns false ONLY for an RLS/privilege
-- denial (42501); any other error (typo, constraint) propagates so a broken
-- test cannot masquerade as a successful block.
CREATE FUNCTION pg_temp.try_as(uid text, stmt text) RETURNS boolean
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  EXECUTE stmt;
  RESET ROLE;
  RETURN true;
EXCEPTION WHEN insufficient_privilege THEN
  RESET ROLE;
  RETURN false;
END $$;

CREATE FUNCTION pg_temp.count_as(uid text, q text) RETURNS bigint
LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  EXECUTE 'SELECT count(*) FROM (' || q || ') s' INTO n;
  RESET ROLE;
  RETURN n;
END $$;

CREATE FUNCTION pg_temp.assert_that(label text, cond boolean) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
  RAISE NOTICE 'ok: %', label;
END $$;

DO $$
DECLARE
  member  text := '00000000-0000-0000-0000-0000000000b1';
  outside text := '00000000-0000-0000-0000-0000000000c1';
  author  text := '00000000-0000-0000-0000-0000000000a1';
BEGIN
  -- Non-author board member: every interaction is allowed.
  PERFORM pg_temp.assert_that('member inserts comment', pg_temp.try_as(member,
    format($q$INSERT INTO comments (id, post_id, user_id, content) VALUES ('t-comment-member', 't-private', %L, 'cheer')$q$, member)));
  PERFORM pg_temp.assert_that('member inserts reply', pg_temp.try_as(member,
    format($q$INSERT INTO replies (id, comment_id, post_id, user_id, content) VALUES ('t-reply-member', 't-comment-author', 't-private', %L, 'cheer')$q$, member)));
  PERFORM pg_temp.assert_that('member inserts like', pg_temp.try_as(member,
    format($q$INSERT INTO likes (id, post_id, user_id) VALUES ('t-like-member', 't-private', %L)$q$, member)));
  PERFORM pg_temp.assert_that('member inserts reaction on comment', pg_temp.try_as(member,
    format($q$INSERT INTO reactions (id, comment_id, user_id, reaction_type) VALUES ('t-react-member', 't-comment-author', %L, 'heart')$q$, member)));
  PERFORM pg_temp.assert_that('member inserts reaction on reply', pg_temp.try_as(member,
    format($q$INSERT INTO reactions (id, reply_id, user_id, reaction_type) VALUES ('t-react-reply-member', 't-reply-author', %L, 'heart')$q$, member)));
  PERFORM pg_temp.assert_that('member reads others comments',
    pg_temp.count_as(member, $q$SELECT 1 FROM comments WHERE id = 't-comment-author'$q$) = 1);
  PERFORM pg_temp.assert_that('author reads member comment',
    pg_temp.count_as(author, $q$SELECT 1 FROM comments WHERE id = 't-comment-member'$q$) = 1);

  -- Outsider (no permission on the post's board): everything is blocked.
  PERFORM pg_temp.assert_that('outsider cannot insert comment', NOT pg_temp.try_as(outside,
    format($q$INSERT INTO comments (id, post_id, user_id, content) VALUES ('t-comment-out', 't-private', %L, 'x')$q$, outside)));
  PERFORM pg_temp.assert_that('outsider cannot insert reply', NOT pg_temp.try_as(outside,
    format($q$INSERT INTO replies (id, comment_id, post_id, user_id, content) VALUES ('t-reply-out', 't-comment-author', 't-private', %L, 'x')$q$, outside)));
  PERFORM pg_temp.assert_that('outsider cannot insert reaction on reply', NOT pg_temp.try_as(outside,
    format($q$INSERT INTO reactions (id, reply_id, user_id, reaction_type) VALUES ('t-react-reply-out', 't-reply-author', %L, 'heart')$q$, outside)));
  PERFORM pg_temp.assert_that('outsider cannot insert like', NOT pg_temp.try_as(outside,
    format($q$INSERT INTO likes (id, post_id, user_id) VALUES ('t-like-out', 't-private', %L)$q$, outside)));
  PERFORM pg_temp.assert_that('outsider cannot insert reaction', NOT pg_temp.try_as(outside,
    format($q$INSERT INTO reactions (id, comment_id, user_id, reaction_type) VALUES ('t-react-out', 't-comment-author', %L, 'heart')$q$, outside)));
  PERFORM pg_temp.assert_that('outsider reads no comments',
    pg_temp.count_as(outside, 'SELECT 1 FROM comments') = 0);
  PERFORM pg_temp.assert_that('outsider reads no replies',
    pg_temp.count_as(outside, 'SELECT 1 FROM replies') = 0);
  PERFORM pg_temp.assert_that('outsider reads no likes',
    pg_temp.count_as(outside, 'SELECT 1 FROM likes') = 0);
  PERFORM pg_temp.assert_that('outsider reads no reactions',
    pg_temp.count_as(outside, 'SELECT 1 FROM reactions') = 0);

  -- Body stays author-only on every read path.
  PERFORM pg_temp.assert_that('member cannot read posts row',
    pg_temp.count_as(member, $q$SELECT 1 FROM posts WHERE id = 't-private'$q$) = 0);
  PERFORM pg_temp.assert_that('outsider cannot read posts row',
    pg_temp.count_as(outside, $q$SELECT 1 FROM posts WHERE id = 't-private'$q$) = 0);
  PERFORM pg_temp.assert_that('member sees NULL content in posts_feed',
    pg_temp.count_as(member, $q$SELECT 1 FROM posts_feed WHERE id = 't-private' AND content IS NULL AND content_preview IS NULL AND content_json IS NULL$q$) = 1);
  PERFORM pg_temp.assert_that('member never sees body in posts_feed',
    pg_temp.count_as(member, $q$SELECT 1 FROM posts_feed WHERE id = 't-private' AND content IS NOT NULL$q$) = 0);
  PERFORM pg_temp.assert_that('outsider gets 0 posts_feed rows',
    pg_temp.count_as(outside, $q$SELECT 1 FROM posts_feed WHERE id = 't-private'$q$) = 0);
  PERFORM pg_temp.assert_that('author still reads body in posts_feed',
    pg_temp.count_as(author, $q$SELECT 1 FROM posts_feed WHERE id = 't-private' AND content = 'SECRET BODY'$q$) = 1);
END $$;

ROLLBACK;
