-- Add reorder_topic_mission RPC
--
-- Swaps the order_index of a topic_missions entry with its adjacent neighbor.
-- Called by the admin panel Up/Down reorder buttons (service_role only).

CREATE OR REPLACE FUNCTION reorder_topic_mission(
  p_board_id  TEXT,
  p_entry_id  TEXT,
  p_direction TEXT  -- 'up' or 'down'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_index  INTEGER;
  v_adjacent_id    TEXT;
  v_adjacent_index INTEGER;
BEGIN
  -- Serialize reorder operations per board to prevent concurrent swaps
  -- from reading stale order_index values.
  PERFORM pg_advisory_xact_lock(hashtext('topic_missions_reorder:' || p_board_id));

  -- Resolve current entry's order_index
  SELECT order_index INTO v_current_index
    FROM topic_missions
    WHERE id = p_entry_id AND board_id = p_board_id;

  IF v_current_index IS NULL THEN
    RAISE EXCEPTION 'Entry % not found for board %', p_entry_id, p_board_id;
  END IF;

  -- Find adjacent entry in the requested direction
  IF p_direction = 'up' THEN
    SELECT id, order_index INTO v_adjacent_id, v_adjacent_index
      FROM topic_missions
      WHERE board_id = p_board_id AND order_index < v_current_index
      ORDER BY order_index DESC
      LIMIT 1;
  ELSIF p_direction = 'down' THEN
    SELECT id, order_index INTO v_adjacent_id, v_adjacent_index
      FROM topic_missions
      WHERE board_id = p_board_id AND order_index > v_current_index
      ORDER BY order_index ASC
      LIMIT 1;
  ELSE
    RAISE EXCEPTION 'Invalid direction: %. Must be ''up'' or ''down''.', p_direction;
  END IF;

  -- Already at boundary — nothing to do
  IF v_adjacent_id IS NULL THEN
    RETURN;
  END IF;

  -- Swap order_index values atomically within this transaction
  UPDATE topic_missions SET order_index = v_adjacent_index WHERE id = p_entry_id;
  UPDATE topic_missions SET order_index = v_current_index  WHERE id = v_adjacent_id;
END;
$$;

-- Restrict to service_role only (admin app uses service_role key)
REVOKE EXECUTE ON FUNCTION reorder_topic_mission(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION reorder_topic_mission(TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION reorder_topic_mission(TEXT, TEXT, TEXT) FROM authenticated;
