-- Migration: Move service_role_key from app_config to Supabase Vault
--
-- Security rationale:
--   service_role_key bypasses all RLS and is a master credential.
--   Storing it in plaintext in app_config (even with RLS blocking public access)
--   means it appears in backups, logs, and is accessible to the postgres role.
--   vault.secrets encrypts at rest and provides audit-friendly access.
--
-- After applying this migration you must set the actual secret value:
--   SELECT vault.create_secret('<your-service-role-key>', 'service_role_key');
-- OR, if the secret already exists from this migration's DO block, update it:
--   UPDATE vault.secrets SET secret = '<your-service-role-key>'
--   WHERE name = 'service_role_key';

-- =============================================
-- 1. Ensure vault extension is available
-- =============================================
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- =============================================
-- 2. Migrate existing value to vault
-- =============================================
-- If app_config already has a service_role_key row, move it to vault.
-- If not, create a placeholder so the vault secret row exists.
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
    -- Read current value from app_config (may be NULL if not yet populated)
    SELECT value INTO _existing_key
    FROM app_config
    WHERE key = 'service_role_key';

    -- Create vault secret; use placeholder if no value present yet
    PERFORM vault.create_secret(
      COALESCE(_existing_key, 'REPLACE_WITH_ACTUAL_SERVICE_ROLE_KEY'),
      'service_role_key',
      'Supabase service role key used by notification trigger functions'
    );
  END IF;
END;
$$;

-- =============================================
-- 3. Remove service_role_key from app_config
-- =============================================
-- edge_function_url is not a secret and stays in app_config.
DELETE FROM app_config WHERE key = 'service_role_key';

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
      (SELECT value FROM app_config WHERE key = config_key)
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

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
