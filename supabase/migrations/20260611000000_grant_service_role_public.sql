-- Restore explicit table-level grants for service_role across the public schema.
--
-- E2E CI broke after a Supabase CLI release between 2026-06-10 and 2026-06-11
-- changed how the local Postgres image initializes default privileges. Tables
-- created by earlier migrations (boards, posts, comments, ...) no longer
-- received auto-grants for service_role, so the E2E seed script started
-- failing with:
--   42501 "permission denied for table boards"
--   hint: GRANT SELECT, INSERT, UPDATE ON public.boards TO service_role
--
-- PostgREST authenticated the service_role JWT correctly (auth admin endpoint
-- still worked); the failure was purely table-level GRANT, not RLS — RLS
-- denials raise "new row violates row-level security policy", not 42501.
--
-- On Supabase Cloud these grants are already present, so re-applying is a
-- no-op. Locally, this restores the prior behavior independent of CLI version.
--
-- We use ALL TABLES / ALL SEQUENCES / ALL FUNCTIONS plus ALTER DEFAULT
-- PRIVILEGES so future migrations don't have to remember to re-grant.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public TO service_role;

GRANT USAGE, SELECT, UPDATE
  ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE
  ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;
