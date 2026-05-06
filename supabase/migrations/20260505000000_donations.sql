-- Donations: append-only event log of Fairy donation webhooks.
-- Active donator state is computed at query time (donated_at + 30 days > now()), so no
-- expiration cron is needed. The unique payment_id guarantees idempotent webhook retries.

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount_krw INTEGER NOT NULL CHECK (amount_krw > 0),
  donated_at TIMESTAMPTZ NOT NULL,
  fairy_name TEXT,
  fairy_email TEXT NOT NULL,
  fairy_message TEXT,
  source TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  match_method TEXT CHECK (match_method IN ('dwf_user_id', 'email') OR match_method IS NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drives donator_status aggregation per user (matched donations only).
CREATE INDEX donations_user_active_idx
  ON donations (user_id, donated_at DESC)
  WHERE user_id IS NOT NULL;

-- Surfaces unmatched donations for admin reconciliation.
CREATE INDEX donations_unmatched_idx
  ON donations (created_at DESC)
  WHERE user_id IS NULL;

-- Public, sanitized view: only user_id and timing. PII (email, message, amount) stays
-- in the table behind RLS. The Edge Function short-circuits on source = 'test' before
-- any insert, so test webhooks should never appear in this table. The source <> 'test'
-- predicate is a second-line defense in case a 'test' row ever leaks in.
CREATE OR REPLACE VIEW donator_status AS
  SELECT
    user_id,
    MAX(donated_at) AS latest_donated_at,
    MAX(donated_at) + INTERVAL '30 days' AS active_until,
    COUNT(*) AS donation_count
  FROM donations
  WHERE user_id IS NOT NULL AND source <> 'test'
  GROUP BY user_id;

ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
-- No client policies. The Edge Function uses the service role key (bypasses RLS) for
-- inserts. Clients only ever read the donator_status view, never the raw table.

GRANT SELECT ON donator_status TO authenticated, anon;
