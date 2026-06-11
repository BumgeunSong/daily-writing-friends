-- Restore explicit table-level grants for the three PostgREST roles
-- (anon, authenticated, service_role) across the public schema.
--
-- E2E CI broke after a Supabase CLI release between 2026-06-10 and 2026-06-11
-- changed how the local Postgres image initializes default privileges. Tables
-- created by earlier migrations no longer received auto-grants, so:
--   1. service_role's seed INSERT into boards failed with
--        42501 "permission denied for table boards"
--   2. anon/authenticated SELECTs returned empty / 403, so the app rendered
--      empty post lists and disabled submit buttons even after a successful
--      seed (RLS policies don't matter when the table-level GRANT is missing —
--      Postgres rejects before RLS runs).
--
-- Both symptoms stem from the same broken default-privilege initialization.
-- We re-grant the standard Supabase defaults (mirroring what fresh local
-- Postgres setup applies) plus ALTER DEFAULT PRIVILEGES so future tables
-- inherit grants automatically.
--
-- RLS is unaffected: anon/authenticated still go through RLS policies for
-- every row; the grant is just the gate that lets the planner consult them.
--
-- On Supabase Cloud these grants are already present, so re-applying is a
-- no-op. Locally, this restores the prior behavior independent of CLI version.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON ALL TABLES IN SCHEMA public TO authenticated;

GRANT SELECT
  ON ALL TABLES IN SCHEMA public TO anon;

GRANT USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE
  ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
