-- Fix notification triggers blocked by EXECUTE privilege on get_app_config
--
-- Root cause: notify_on_* trigger functions run as SECURITY INVOKER (default).
-- When an authenticated user inserts a comment/reply/like/reaction, the
-- trigger function calls get_app_config(), which has had EXECUTE revoked
-- from anon/authenticated since 20260326 (vault migration re-applied the
-- REVOKE that was retroactively added to the 20260222 migration but never
-- actually executed in production until now). The call fails with
-- "permission denied for function get_app_config (42501)" and the entire
-- INSERT aborts, surfacing as a 403 to the client.
--
-- Fix: SECURITY DEFINER makes each notify function run as the function
-- owner, which still has EXECUTE on get_app_config. This is safe because:
--   1. The functions only PERFORM net.http_post — no row writes
--   2. They only fire on AFTER INSERT of comments/replies/likes/reactions
--   3. RETURNS TRIGGER prevents direct RPC invocation
--   4. SET search_path prevents search_path injection
--   5. REVOKE EXECUTE blocks any future non-trigger invocation path
--
-- This mirrors 20260324000000_fix_counter_triggers_security_definer.sql,
-- which applied the same fix to the counter triggers.

BEGIN;

-- =============================================
-- 1. notify_on_comment
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := get_app_config('edge_function_url') || '/create-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_app_config('service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'comment_on_post',
      'comment_id', NEW.id,
      'post_id', NEW.post_id,
      'author_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 2. notify_on_reply
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_reply() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := get_app_config('edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_app_config('service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reply_on_post',
        'reply_id', NEW.id,
        'post_id', NEW.post_id,
        'author_id', NEW.user_id
      )
    );
  END IF;

  IF NEW.comment_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := get_app_config('edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_app_config('service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reply_on_comment',
        'reply_id', NEW.id,
        'comment_id', NEW.comment_id,
        'author_id', NEW.user_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. notify_on_like
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM net.http_post(
    url := get_app_config('edge_function_url') || '/create-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || get_app_config('service_role_key')
    ),
    body := jsonb_build_object(
      'type', 'like_on_post',
      'like_id', NEW.id,
      'post_id', NEW.post_id,
      'author_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. notify_on_reaction
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_reaction() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.comment_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := get_app_config('edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_app_config('service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reaction_on_comment',
        'reaction_id', NEW.id,
        'comment_id', NEW.comment_id,
        'author_id', NEW.user_id
      )
    );
  ELSIF NEW.reply_id IS NOT NULL THEN
    PERFORM net.http_post(
      url := get_app_config('edge_function_url') || '/create-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_app_config('service_role_key')
      ),
      body := jsonb_build_object(
        'type', 'reaction_on_reply',
        'reaction_id', NEW.id,
        'reply_id', NEW.reply_id,
        'author_id', NEW.user_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. Defense-in-depth: prevent direct invocation
-- =============================================
-- These are trigger-only entry points. Revoking EXECUTE matches the
-- pattern used by the counter-trigger fix and get_app_config.
REVOKE EXECUTE ON FUNCTION notify_on_comment()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION notify_on_reply()    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION notify_on_like()     FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION notify_on_reaction() FROM PUBLIC;

COMMIT;
