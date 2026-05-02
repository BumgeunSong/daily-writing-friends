import { withAdmin, AdminApiError } from "@/lib/server/with-admin";
import { getServerSupabase } from "@/lib/server/supabase";
import {
  SearchUsersResponseSchema,
  type SearchUser,
} from "@/types/admin-api-contracts";

export const GET = withAdmin({
  kind: "read",
  schema: SearchUsersResponseSchema,
  handler: async ({ req }) => {
    const url = new URL(req.url);
    const query = url.searchParams.get("q") ?? "";
    if (!query || query.length < 2) {
      return { users: [] };
    }
    const escaped = query.replace(/[,()"'\\]/g, "");
    if (!escaped) return { users: [] };

    const pattern = `%${escaped}%`;
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("id, real_name, nickname, email")
      .or(
        `nickname.ilike.${pattern},real_name.ilike.${pattern},email.ilike.${pattern}`
      )
      .limit(10);
    if (error) throw AdminApiError.serverError(error.message);
    return { users: (data ?? []) as SearchUser[] };
  },
});
