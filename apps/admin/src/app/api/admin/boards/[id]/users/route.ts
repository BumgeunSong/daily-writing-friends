import { NextRequest } from "next/server";
import { withAdmin, AdminApiError } from "@/lib/server/with-admin";
import { getServerSupabase } from "@/lib/server/supabase";
import {
  GetBoardUsersResponseSchema,
  type BoardUser,
} from "@/types/admin-api-contracts";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteParams) {
  const { id } = await ctx.params;
  const handler = withAdmin({
    kind: "read",
    schema: GetBoardUsersResponseSchema,
    handler: async () => {
      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from("user_board_permissions")
        .select(
          "permission, users(id, real_name, nickname, email, phone_number, profile_photo_url)"
        )
        .eq("board_id", id);
      if (error) throw AdminApiError.serverError(error.message);

      const users: BoardUser[] = (data ?? []).map(
        (row: { permission: string; users: unknown }) => ({
          permission: row.permission as "read" | "write",
          user: row.users as BoardUser["user"],
        })
      );
      return { users };
    },
  });
  return handler(req);
}
