-- Board permissions are the only input to has_board_access(), so whoever can
-- write user_board_permissions can grant themselves any board and walk straight
-- through the board-scoped read gate added in 20260823000000. The self-write
-- policies made that a single INSERT for any signed-in user:
--
--   INSERT INTO user_board_permissions (user_id, board_id, permission)
--   VALUES (auth.uid(), '<any board>', 'write');
--
-- The WITH CHECK only pinned user_id; board_id and permission were unconstrained.
--
-- Nothing legitimate loses access. Every real grant path runs as service_role,
-- which bypasses RLS: the admin approval route (apps/admin, SUPABASE_SERVICE_ROLE_KEY)
-- and the ops/seed scripts. The web client's boardPermissions sync in
-- createUser/updateUser sits behind a branch no call site reaches.
--
-- board_waiting_users deliberately keeps its self-insert policy: joining the
-- waiting list is how signup works, and waiting-list membership grants no reads.

DROP POLICY IF EXISTS "Users can insert their own board permissions" ON user_board_permissions;
DROP POLICY IF EXISTS "Users can update their own board permissions" ON user_board_permissions;
DROP POLICY IF EXISTS "Users can delete their own board permissions" ON user_board_permissions;

-- RLS already denies once no permissive policy matches; the REVOKE states the
-- same intent at the privilege layer, so `\dp` shows the table is read-only to
-- clients without having to reason about policy coverage.
REVOKE INSERT, UPDATE, DELETE ON user_board_permissions FROM anon, authenticated;
