-- Local-only seed for exploratory testing.
-- The board id matches REMOTE_CONFIG_DEFAULTS.upcoming_board_id /
-- active_board_id in apps/web/src/shared/contexts/RemoteConfigContext.tsx,
-- so it serves both as the FK target for createUserIfNotExists and as the
-- upcoming board that CohortConfirmCard renders against.
INSERT INTO public.boards (id, title, description, cohort, first_day, last_day, created_at, updated_at)
VALUES (
  'rW3Y3E2aEbpB0KqGiigd',
  '매일 글쓰기 프렌즈',
  '매일 한 편씩 글을 쓰는 4주 프로그램',
  8,
  '2026-06-01 00:00:00+09'::timestamptz,
  '2026-06-26 23:59:59+09'::timestamptz,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
