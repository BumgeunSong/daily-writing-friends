import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    // No session here, so auth.uid() is NULL and board-scoped posts RLS blocks everything; queries.ts already scopes by author_id, so bypass RLS instead.
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseServiceRoleKey);
  }

  return supabaseInstance;
}
