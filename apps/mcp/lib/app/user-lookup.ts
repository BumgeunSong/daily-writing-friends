import { getSupabase } from './supabase';

/**
 * Resolve an author display name to a user ID.
 * Searches both real_name and nickname fields.
 * Returns the user_id if exactly one match is found.
 */
export async function resolveUserId(
  authorName: string
): Promise<{ userId: string } | { error: string }> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('users')
    .select('id, real_name, nickname')
    .or(`real_name.eq.${authorName},nickname.eq.${authorName}`);

  if (error) {
    return { error: `Failed to look up user: ${error.message}` };
  }

  if (!data || data.length === 0) {
    return {
      error: `No user found with name "${authorName}". Please check your authorName in the MCP config.`,
    };
  }

  if (data.length > 1) {
    const names = data
      .map((u) => `${u.real_name ?? ''} (${u.nickname ?? ''})`)
      .join(', ');
    return {
      error: `Multiple users found for "${authorName}": ${names}. Please use a more specific name.`,
    };
  }

  return { userId: data[0].id };
}
