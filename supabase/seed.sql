-- Local-only seed for exploratory testing.
-- Board ids mirror REMOTE_CONFIG_DEFAULTS in apps/web/src/shared/hooks/useRemoteConfig.ts.
INSERT INTO public.boards (id, title, description, cohort, first_day, last_day, created_at, updated_at)
VALUES
  (
    '1a65026a-cf93-4828-be54-fd8d034008da',
    '매일 글쓰기 프렌즈',
    '매일 한 편씩 글을 쓰는 4주 프로그램',
    8,
    '2026-06-01 00:00:00+09'::timestamptz,
    '2026-06-26 23:59:59+09'::timestamptz,
    now(),
    now()
  ),
  (
    'a852bc21-3de6-4dc0-a601-d1568c77661b',
    '매일 글쓰기 프렌즈 (다음 기수)',
    '다음 기수 신청용 보드',
    9,
    '2026-07-01 00:00:00+09'::timestamptz,
    '2026-07-26 23:59:59+09'::timestamptz,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Seed app_config so the notify_on_* triggers don't enqueue a row with NULL url.
-- notify_on_comment/reply/like/reaction build `net.http_post(url := get_app_config('edge_function_url') || '/create-notification', ...)`.
-- With an empty app_config table, that concatenation is NULL, and pg_net's http_request_queue.url is NOT NULL —
-- the trigger raises 23502 and aborts the parent INSERT (e.g. inserting a comment), which broke comment-flow.spec.ts in CI.
-- The local edge runtime is excluded from `supabase start` in CI, so delivery just fails silently; the parent INSERT commits.
INSERT INTO public.app_config (key, value) VALUES
  ('edge_function_url', 'http://127.0.0.1:54321/functions/v1')
ON CONFLICT (key) DO NOTHING;
