import { withAdmin, AdminApiError } from "@/lib/server/with-admin";
import { getServerSupabase } from "@/lib/server/supabase";
import {
  GetUsersByIdsRequestSchema,
  GetUsersByIdsResponseSchema,
  type SupabaseUser,
} from "@/types/admin-api-contracts";

export const POST = withAdmin({
  // POST verb but read intent — exempt from mutation rate limiting and audit log.
  kind: "read",
  schema: GetUsersByIdsResponseSchema,
  handler: async ({ req }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw AdminApiError.badRequest("Body must be JSON.");
    }
    const parsed = GetUsersByIdsRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw AdminApiError.badRequest(
        `Invalid body: ${JSON.stringify(parsed.error.flatten())}`
      );
    }
    if (parsed.data.ids.length === 0) {
      return { users: [] };
    }
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .in("id", parsed.data.ids);
    if (error) throw AdminApiError.serverError(error.message);
    return { users: (data ?? []) as SupabaseUser[] };
  },
});
