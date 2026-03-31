-- Add topic missions feature
--
-- Creates topic_missions table for round-robin presenter selection.
-- Adds advance_topic_presenter() RPC for atomic queue advancement.
-- Alters notifications.post_id to allow NULL for board-level notifications.

BEGIN;

-- =============================================
-- 1. topic_missions table
-- =============================================

CREATE TABLE topic_missions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic       TEXT NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 200),
  order_index INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'assigned', 'completed', 'skipped')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- =============================================
-- 2. Indexes
-- =============================================

CREATE INDEX idx_topic_missions_board_order ON topic_missions(board_id, order_index);
CREATE INDEX idx_topic_missions_board_status ON topic_missions(board_id, status);

-- =============================================
-- 3. order_index auto-assignment (BEFORE INSERT trigger)
--
-- Client omits order_index; trigger assigns MAX(order_index)+1 atomically.
-- next_topic_order_index is also called by the edge function for ordering.
-- =============================================

CREATE OR REPLACE FUNCTION next_topic_order_index(p_board_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  -- Lock all existing rows for this board to prevent concurrent inserts
  -- from computing the same MAX(order_index) and producing duplicate values.
  PERFORM id FROM topic_missions WHERE board_id = p_board_id FOR UPDATE;

  SELECT COALESCE(MAX(order_index), 0) + 1
    INTO v_next
    FROM topic_missions
    WHERE board_id = p_board_id;

  RETURN v_next;
END;
$$;

CREATE OR REPLACE FUNCTION assign_topic_order_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.order_index := next_topic_order_index(NEW.board_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_topic_missions_order_index
  BEFORE INSERT ON topic_missions
  FOR EACH ROW EXECUTE FUNCTION assign_topic_order_index();

-- =============================================
-- 4. updated_at auto-update (BEFORE UPDATE trigger)
-- =============================================

CREATE OR REPLACE FUNCTION update_topic_mission_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_topic_missions_updated_at
  BEFORE UPDATE ON topic_missions
  FOR EACH ROW EXECUTE FUNCTION update_topic_mission_updated_at();

-- =============================================
-- 5. advance_topic_presenter(p_board_id) RPC
--
-- Atomically advances the presenter queue:
--   1. Sets current assigned entry → completed
--   2. Finds next pending entry by order_index ASC
--   3. If none: wrap-around (reset all completed/skipped → pending), re-queries
--   4. Sets found entry → assigned
--   5. Inserts topic_presenter_assigned notification
-- Returns { out_user_id, out_topic, out_user_name, out_wrapped }
--
-- Called only by the assign-topic-presenter edge function (service_role).
-- Restricted to service_role via REVOKE below.
-- =============================================

CREATE OR REPLACE FUNCTION advance_topic_presenter(p_board_id TEXT)
RETURNS TABLE (
  out_user_id   TEXT,
  out_topic     TEXT,
  out_user_name TEXT,
  out_wrapped   BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assign_id   TEXT;
  v_user_id     TEXT;
  v_topic       TEXT;
  v_user_name   TEXT;
  v_wrapped     BOOLEAN := FALSE;
  v_topic_display TEXT;
BEGIN
  -- Step 1: Complete current assigned entry (may not exist on first call)
  UPDATE topic_missions
    SET status = 'completed', updated_at = NOW()
    WHERE board_id = p_board_id AND status = 'assigned';

  -- Step 2: Find next pending entry
  SELECT id INTO v_assign_id
    FROM topic_missions
    WHERE board_id = p_board_id AND status = 'pending'
    ORDER BY order_index ASC
    LIMIT 1;

  -- Step 3: Wrap-around if no pending entries remain
  IF v_assign_id IS NULL THEN
    v_wrapped := TRUE;

    UPDATE topic_missions
      SET status = 'pending', updated_at = NOW()
      WHERE board_id = p_board_id AND status IN ('completed', 'skipped');

    SELECT id INTO v_assign_id
      FROM topic_missions
      WHERE board_id = p_board_id AND status = 'pending'
      ORDER BY order_index ASC
      LIMIT 1;
  END IF;

  -- Guard: queue is empty (no entries at all)
  IF v_assign_id IS NULL THEN
    RAISE EXCEPTION 'No topic mission entries for board %', p_board_id;
  END IF;

  -- Step 4: Assign the next entry
  UPDATE topic_missions
    SET status = 'assigned', updated_at = NOW()
    WHERE id = v_assign_id
    RETURNING user_id, topic INTO v_user_id, v_topic;

  -- Step 5: Get user display name (prefer nickname, fall back to real_name)
  SELECT COALESCE(nickname, real_name, email) INTO v_user_name
    FROM users WHERE id = v_user_id;

  -- Truncate topic to 35 chars with ellipsis for notification message
  -- (mirrors buildNotificationMessage truncation in TypeScript)
  v_topic_display := CASE
    WHEN char_length(v_topic) > 35 THEN substr(v_topic, 1, 35) || '...'
    ELSE v_topic
  END;

  -- Step 6: Insert notification
  -- actor_id set to recipient (no social actor; system-generated notification)
  INSERT INTO notifications (
    recipient_id,
    type,
    actor_id,
    actor_profile_image,
    board_id,
    post_id,
    message,
    read
  )
  SELECT
    v_user_id,
    'topic_presenter_assigned',
    v_user_id,
    u.profile_photo_url,
    p_board_id,
    NULL,
    b.title || '에서 이번 주 발표자로 선정되었어요! 발표 주제: ''' || v_topic_display || '''',
    FALSE
  FROM users u
  JOIN boards b ON b.id = p_board_id
  WHERE u.id = v_user_id;

  RETURN QUERY SELECT v_user_id, v_topic, v_user_name, v_wrapped;
END;
$$;

-- Only service_role may call this function directly
REVOKE EXECUTE ON FUNCTION advance_topic_presenter(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION advance_topic_presenter(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION advance_topic_presenter(TEXT) FROM authenticated;

-- =============================================
-- 6. RLS policies
-- =============================================

ALTER TABLE topic_missions ENABLE ROW LEVEL SECURITY;

-- Board members can read their own board's queue
CREATE POLICY topic_missions_select ON topic_missions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_board_permissions
      WHERE user_board_permissions.user_id = auth.uid()
        AND user_board_permissions.board_id = topic_missions.board_id
    )
  );

-- Board members can self-register (user_id must equal caller's uid)
CREATE POLICY topic_missions_insert ON topic_missions
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_board_permissions
      WHERE user_board_permissions.user_id = auth.uid()
        AND user_board_permissions.board_id = topic_missions.board_id
    )
  );

-- UPDATE and DELETE are service_role only (no permissive policies for those operations)

-- =============================================
-- 7. Alter notifications table for board-level notification type
--
-- topic_presenter_assigned has no associated post → post_id must allow NULL.
-- Idempotency index updated to use COALESCE(post_id, '') to handle NULL.
-- =============================================

ALTER TABLE notifications ALTER COLUMN post_id DROP NOT NULL;

ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'comment_on_post',
    'reply_on_comment',
    'reply_on_post',
    'reaction_on_comment',
    'reaction_on_reply',
    'like_on_post',
    'topic_presenter_assigned'
  ));

-- Drop and recreate idempotency index to handle NULL post_id
DROP INDEX idx_notifications_idempotency;
CREATE UNIQUE INDEX idx_notifications_idempotency
  ON notifications(
    recipient_id,
    type,
    COALESCE(post_id, ''),
    COALESCE(comment_id, ''),
    COALESCE(reply_id, ''),
    actor_id
  );

COMMIT;
