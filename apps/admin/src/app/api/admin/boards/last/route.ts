import { withAdmin, AdminApiError } from "@/lib/server/with-admin";
import { getServerSupabase } from "@/lib/server/supabase";
import {
  GetLastBoardResponseSchema,
  type SupabaseBoard,
} from "@/types/admin-api-contracts";

export const GET = withAdmin({
  kind: "read",
  schema: GetLastBoardResponseSchema,
  handler: async () => {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .order("cohort", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (error) throw AdminApiError.serverError(error.message);
    return { board: (data ?? null) as SupabaseBoard | null };
  },
});
