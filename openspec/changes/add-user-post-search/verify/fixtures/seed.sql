-- Seed fixture for E2E (Layer 4) verification of add-user-post-search.
-- Apply to local Supabase Docker only (never staging/production).
-- Replace :USER_A_ID and :USER_B_ID with the auth.users.id of two seeded accounts
-- before executing (psql -v USER_A_ID=... -v USER_B_ID=... or substitute by hand).

-- Assumed prior state:
--   - auth.users contains :USER_A_ID and :USER_B_ID (seeded via the regular signup flow
--     or `supabase auth signup` so RLS-relevant session JWTs work).
--   - `boards` contains at least one row; pick its id below as :BOARD_ID.

\set USER_A_ID '00000000-0000-0000-0000-00000000000A'
\set USER_B_ID '00000000-0000-0000-0000-00000000000B'
\set BOARD_ID  '00000000-0000-0000-0000-0000000000B0'

-- 1) User A baseline post used by T.3 (title contains '오늘').
INSERT INTO posts (id, board_id, author_id, author_name, title, content, visibility, created_at)
VALUES (gen_random_uuid(), :'BOARD_ID', :'USER_A_ID', 'User A',
        '오늘의 작성', '<p>오늘 글 본문</p>', 'public', now() - interval '3 days');

-- 2) User A 1500-char body with BODYNEEDLE at exactly offset 1000 (T.4).
--    Lpad 1000 chars of 'a', then 'BODYNEEDLE', then 'b' chars to reach 1500.
INSERT INTO posts (id, board_id, author_id, author_name, title, content, visibility, created_at)
VALUES (gen_random_uuid(), :'BOARD_ID', :'USER_A_ID', 'User A',
        'long-body fixture',
        repeat('a', 1000) || 'BODYNEEDLE' || repeat('b', 490),
        'public',
        now() - interval '4 days');

-- 3) User A: 60 posts whose title contains 'LIMITNEEDLE' (T.5). Newest 50 should match,
--    oldest 10 should be cap-excluded. Created_at strictly descending per i.
INSERT INTO posts (id, board_id, author_id, author_name, title, content, visibility, created_at)
SELECT gen_random_uuid(),
       :'BOARD_ID',
       :'USER_A_ID',
       'User A',
       'LIMITNEEDLE #' || lpad(i::text, 3, '0'),
       '<p>filler ' || i || '</p>',
       'public',
       now() - (interval '1 minute' * i) - interval '7 days'
FROM generate_series(1, 60) AS i;

-- 4) User B: a public post containing 'ALPHA_ONLY' (T.6 / T.11).
INSERT INTO posts (id, board_id, author_id, author_name, title, content, visibility, created_at)
VALUES (gen_random_uuid(), :'BOARD_ID', :'USER_B_ID', 'User B',
        'B public', '<p>ALPHA_ONLY phrase here</p>', 'public', now() - interval '2 days');

-- 5) User B: a private post (T.11 must NOT return this to user A under any circumstance).
INSERT INTO posts (id, board_id, author_id, author_name, title, content, visibility, created_at)
VALUES (gen_random_uuid(), :'BOARD_ID', :'USER_B_ID', 'User B',
        'B private', '<p>ALPHA_ONLY secret</p>', 'private', now() - interval '1 day');
