import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

/**
 * Get the Supabase client for admin dual-write operations.
 * Uses service role key since this is an admin-only app.
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
  }

  supabaseInstance = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return supabaseInstance
}

/**
 * Dual-write helper for admin operations.
 * Logs errors but does NOT block the Firestore operation.
 */
export async function adminDualWrite(
  label: string,
  supabaseWrite: () => Promise<void>
): Promise<void> {
  try {
    await supabaseWrite()
  } catch (err) {
    console.error(`[Admin Dual-Write] ${label} failed:`, err)
  }
}
