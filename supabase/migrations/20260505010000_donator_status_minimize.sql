-- Tighten public surface of donator_status: clients only need to know which user IDs
-- are currently active donators. Drop the timing/count columns so anon role cannot
-- enumerate per-user donation timestamps or counts.
--
-- Trade-off: client cache (5-min staleTime) can show a badge for a row that became
-- inactive within those 5 minutes. For a 30-day active window this drift is invisible.

DROP VIEW IF EXISTS public.donator_status;

CREATE VIEW public.donator_status AS
  SELECT user_id
  FROM donations
  WHERE user_id IS NOT NULL AND source <> 'test'
  GROUP BY user_id
  HAVING MAX(donated_at) + INTERVAL '30 days' > NOW();

GRANT SELECT ON public.donator_status TO authenticated, anon;
