import type { CommentAuthor } from '@/comment/model/Comment';
import type { Database } from '@/shared/external/database.types';

/** The users columns joined onto a comment/reply row as its live author profile. */
export type AuthorEmbed = Pick<
  Database['public']['Tables']['users']['Row'],
  'profile_photo_url' | 'nickname'
>;

/** The select fragment that joins the live author profile; keep in sync with AuthorEmbed. */
export const AUTHOR_EMBED_SELECT = 'author:users!user_id(profile_photo_url, nickname)';

/**
 * A to-one embed can surface as a single object or a one-element array depending
 * on how PostgREST resolves the relationship; collapse both to the single row.
 */
function unwrapAuthorEmbed(
  embed: AuthorEmbed | AuthorEmbed[] | null | undefined,
): AuthorEmbed | undefined {
  if (!embed) return undefined;
  return Array.isArray(embed) ? embed[0] : embed;
}

/**
 * Pure: project the joined users embed onto the domain author, or undefined when
 * the user row is absent (e.g. the author was deleted).
 */
export function mapToAuthor(
  embed: AuthorEmbed | AuthorEmbed[] | null | undefined,
): CommentAuthor | undefined {
  const author = unwrapAuthorEmbed(embed);
  return author
    ? { nickname: author.nickname, profilePhotoURL: author.profile_photo_url }
    : undefined;
}
