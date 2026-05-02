import { withAdmin } from "@/lib/server/with-admin";
import { getServerSupabase } from "@/lib/server/supabase";
import {
  CreateBoardRequestSchema,
  CreateBoardResponseSchema,
  GetBoardsResponseSchema,
  type SupabaseBoard,
} from "@/types/admin-api-contracts";
import { AdminApiError } from "@/lib/server/with-admin";

export const GET = withAdmin({
  kind: "read",
  schema: GetBoardsResponseSchema,
  handler: async () => {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("boards")
      .select("*")
      .order("cohort", { ascending: false, nullsFirst: false });
    if (error) throw AdminApiError.serverError(error.message);
    return { boards: (data ?? []) as SupabaseBoard[] };
  },
});

export const POST = withAdmin({
  kind: "mutation",
  action: "board.create",
  schema: CreateBoardResponseSchema,
  handler: async ({ req }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw AdminApiError.badRequest("Body must be JSON.");
    }
    const parsed = CreateBoardRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AdminApiError.badRequest(
        `Invalid body: ${JSON.stringify(parsed.error.flatten())}`
      );
    }
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("boards")
      .insert({
        id: parsed.data.id,
        title: parsed.data.title,
        description: parsed.data.description,
        first_day: parsed.data.firstDay,
        last_day: parsed.data.lastDay,
        cohort: parsed.data.cohort,
      })
      .select("*")
      .single();
    if (error) throw AdminApiError.serverError(error.message);
    const board = data as SupabaseBoard;
    return {
      data: { board },
      auditTarget: { boardId: board.id, cohort: board.cohort },
    };
  },
});
