import { withAdmin, AdminApiError } from "@/lib/server/with-admin";
import { getServerSupabase } from "@/lib/server/supabase";
import {
  ApproveUserRequestSchema,
  ApproveUserResponseSchema,
} from "@/types/admin-api-contracts";

const POSTGRES_UNIQUE_VIOLATION = "23505";

export const POST = withAdmin({
  kind: "mutation",
  action: "user.approve",
  schema: ApproveUserResponseSchema,
  handler: async ({ req }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw AdminApiError.badRequest("Body must be JSON.");
    }
    const parsed = ApproveUserRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AdminApiError.badRequest(
        `Invalid body: ${JSON.stringify(parsed.error.flatten())}`
      );
    }
    const { userId, boardId } = parsed.data;
    const supabase = getServerSupabase();

    // INSERT (no upsert) — Postgres unique violation tells us "already approved"
    // without a separate SELECT race. Atomic at the DB level.
    const { error: insertError } = await supabase
      .from("user_board_permissions")
      .insert({ user_id: userId, board_id: boardId, permission: "write" });

    if (insertError) {
      if (insertError.code === POSTGRES_UNIQUE_VIOLATION) {
        // Already approved. No-op; suppress audit log. Still try to clean up
        // any leftover waiting row (idempotent — zero rows is not an error).
        await supabase
          .from("board_waiting_users")
          .delete()
          .eq("user_id", userId)
          .eq("board_id", boardId);
        return {
          data: { status: "already-handled" as const, firstTime: false },
          mutated: false,
        };
      }
      throw AdminApiError.serverError(insertError.message);
    }

    // Permission granted. Clean up waiting row (no-op if none).
    const { error: deleteError } = await supabase
      .from("board_waiting_users")
      .delete()
      .eq("user_id", userId)
      .eq("board_id", boardId);
    if (deleteError) {
      // Permission already granted; do not fail the response. Log for ops.
      console.error("[admin] approve: failed to clean up waiting row:", deleteError.message);
    }

    return {
      data: { status: "approved" as const, firstTime: true },
      auditTarget: { userId, boardId },
    };
  },
});
