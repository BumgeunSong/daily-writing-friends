-- Migration: Move service_role_key from app_config to Supabase Vault
--
-- Security rationale:
--   service_role_key bypasses all RLS and is a master credential.
--   Storing it in plaintext in app_config (even with RLS blocking public access)
--   means it appears in backups, logs, and is accessible to the postgres role.
--   vault.secrets encrypts at rest and provides audit-friendly access.
--
-- If app_config already contains service_role_key, the migration moves it
-- to vault automatically. If not, it skips vault creation and prints a
-- NOTICE — the operator must create the vault secret manually afterward:
--   SELECT vault.create_secret('<your-service-role-key>', 'service_role_key');

-- =============================================
-- 1. Ensure vault extension is available
-- =============================================
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- =============================================
-- 2. Migrate existing value to vault
-- =============================================
-- If app_config already has a service_role_key row, move it to vault.
-- If not, fail fast so the operator knows to provide the key first.
DO $$
DECLARE
  _existing_key TEXT;
  _existing_secret_id UUID;
BEGIN
  -- Check if service_role_key already exists in vault
  SELECT id INTO _existing_secret_id
  FROM vault.secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF _existing_secret_id IS NULL THEN
    -- Read current value from app_config
    SELECT value INTO _existing_key
    FROM public.app_config
    WHERE key = 'service_role_key';

    IF _existing_key IS NULL THEN
      RAISE NOTICE
        'service_role_key is not set in app_config — skipping vault secret creation. '
        'Create it manually: SELECT vault.create_secret(''<your-key>'', ''service_role_key'');';
    ELSE
      -- vault.create_secret signature: (secret, name, description)
      PERFORM vault.create_secret(
        _existing_key,
        'service_role_key',
        'Supabase service role key used by notification trigger functions'
      );

      -- Verify the vault write succeeded before we delete the source row
      IF (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key') IS NULL THEN
        RAISE EXCEPTION
          'vault.create_secret completed but decrypted_secrets returned NULL. '
          'Aborting migration — app_config row is preserved.';
      END IF;
    END IF;
  END IF;
END;
$$;

-- =============================================
-- 3. Remove service_role_key from app_config
-- =============================================
-- edge_function_url is not a secret and stays in app_config.
-- NOTE: The earlier migration (20260222) documents populating service_role_key
-- in app_config. That instruction is now obsolete — the key lives in vault.
DELETE FROM public.app_config WHERE key = 'service_role_key';

-- =============================================
-- 4. Replace get_app_config to read service_role_key from vault
-- =============================================
-- The function keeps its existing signature so all callers
-- (notify_on_comment, notify_on_reply, notify_on_like, notify_on_reaction)
-- continue to work without modification.
--
-- For config_key = 'service_role_key': reads from vault.secrets (decrypted).
-- For all other keys: reads from app_config as before.
CREATE OR REPLACE FUNCTION get_app_config(config_key TEXT) RETURNS TEXT AS $$
  SELECT CASE
    WHEN config_key = 'service_role_key' THEN
      (SELECT decrypted_secret
       FROM vault.decrypted_secrets
       WHERE name = 'service_role_key'
       LIMIT 1)
    ELSE
      (SELECT value FROM public.app_config WHERE key = config_key)
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public, vault;

-- Re-apply the execute restrictions (CREATE OR REPLACE resets grants to default)
REVOKE EXECUTE ON FUNCTION get_app_config(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_app_config(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION get_app_config(TEXT) FROM authenticated;

-- =============================================
-- 5. Verification helper (manual, not auto-run)
-- =============================================
-- To verify after migration:
--   SELECT get_app_config('service_role_key') IS NOT NULL AS vault_key_present;
--   SELECT get_app_config('edge_function_url') AS edge_url;
--   SELECT COUNT(*) FROM app_config WHERE key = 'service_role_key'; -- should be 0
