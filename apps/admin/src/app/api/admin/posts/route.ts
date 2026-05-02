import { withAdmin, AdminApiError } from "@/lib/server/with-admin";
import { getServerSupabase } from "@/lib/server/supabase";
import {
  GetPostsResponseSchema,
  PostsRangeSchema,
  type SupabasePost,
} from "@/types/admin-api-contracts";

function getWeekRange(): { monday: Date; sunday: Date } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

export const GET = withAdmin({
  kind: "read",
  schema: GetPostsResponseSchema,
  handler: async ({ req }) => {
    const url = new URL(req.url);
    const boardId = url.searchParams.get("boardId");
    if (!boardId) {
      throw AdminApiError.badRequest("Query param 'boardId' is required.");
    }
    const rangeRaw = url.searchParams.get("range") ?? "all";
    const rangeParsed = PostsRangeSchema.safeParse(rangeRaw);
    if (!rangeParsed.success) {
      throw AdminApiError.badRequest("Query param 'range' must be 'week' or 'all'.");
    }

    const supabase = getServerSupabase();
    let query = supabase
      .from("posts")
      .select("*, users!author_id(nickname)")
      .eq("board_id", boardId)
      .order("engagement_score", { ascending: false, nullsFirst: false });

    if (rangeParsed.data === "week") {
      const { monday, sunday } = getWeekRange();
      query = query
        .gte("created_at", monday.toISOString())
        .lte("created_at", sunday.toISOString());
    }

    const { data, error } = await query;
    if (error) throw AdminApiError.serverError(error.message);
    return { posts: (data ?? []) as SupabasePost[] };
  },
});
