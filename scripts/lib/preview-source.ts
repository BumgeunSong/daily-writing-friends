/**
 * Shared source logic for building static `/preview` content out of real board
 * posts. Both `export-preview-posts.ts` (JSON dump) and `add-preview-post.ts`
 * (writes/patches the static files) build on this.
 *
 * The author mapping strategy differs per consumer, so it is injected as a
 * resolver rather than baked in here.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PreviewAuthor = { id: string; displayName: string; profileImageURL: string };
export type PreviewReply = { id: string; author: PreviewAuthor; body: string; createdAt: string };
export type PreviewComment = {
  id: string;
  author: PreviewAuthor;
  body: string;
  createdAt: string;
  replies: PreviewReply[];
};
/** Raw preview post content; comment/reply tallies are derived downstream, not stored. */
export type PreviewPostContent = {
  id: string;
  title: string;
  body: string;
  contentPreview: string;
  author: PreviewAuthor;
  createdAt: string;
  thumbnailImageURL: string | null;
  weekDaysFromFirstDay: number | null;
  comments: PreviewComment[];
};

export type UserRow = { id: string; nickname: string | null; profile_photo_url: string | null };
type PostRow = {
  id: string;
  title: string;
  content: string | null;
  thumbnail_image_url: string | null;
  week_days_from_first_day: number | null;
  created_at: string;
  author_id: string;
  author_name: string;
};
type CommentRow = {
  id: string;
  content: string;
  user_id: string;
  user_name: string;
  user_profile_image: string | null;
  created_at: string;
};
type ReplyRow = CommentRow & { comment_id: string };

export type PostBundle = {
  post: PostRow;
  comments: CommentRow[];
  replies: ReplyRow[];
  userById: Map<string, UserRow>;
};

/** Resolves a real user to a synthetic preview author. Strategy is consumer-specific. */
export type AuthorResolver = (
  userId: string,
  snapshotName: string,
  snapshotImage: string | null,
  live: UserRow | undefined,
) => PreviewAuthor;

export function repoRoot(): string {
  const libDir = dirname(fileURLToPath(import.meta.url));
  return resolve(libDir, '../..');
}

export function loadRepoEnv(): void {
  config({ path: resolve(repoRoot(), '.env') });
}

export function createServiceClient(): { supabase: SupabaseClient; host: string } {
  loadRepoEnv();
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (.env at repo root)');
  }
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return { supabase, host: url.replace(/^https?:\/\//, '') };
}

export function parsePostId(arg: string): string {
  const match = arg.match(/\/post\/([^/?#]+)/);
  return (match ? match[1] : arg).trim();
}

/** Rewrite internal app links to /join so the preview never escapes into the real app. */
export function neutralizeInternalLinks(html: string): string {
  return html.replace(/href\s*=\s*(["'])(.*?)\1/gi, (full, quote, url) => {
    const isInternal =
      /^\/(board|post|user)\b/i.test(url) ||
      /dailywritingfriends\.com\/(board|post|user)\b/i.test(url);
    return isInternal ? `href=${quote}/join${quote}` : full;
  });
}

/** Count anchors + bare URLs so callers can warn about content that may need a link policy. */
export function linkReport(html: string): { anchors: number; bareUrls: number } {
  const anchors = (html.match(/<a\b/gi) || []).length;
  const text = html.replace(/<[^>]+>/g, ' ');
  const bareUrls = (text.match(/https?:\/\/[^\s)]+/gi) || []).length;
  return { anchors, bareUrls };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function toExcerpt(html: string, max = 200): string {
  const text = decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export function hasEmptyBody(bundle: PostBundle): boolean {
  return !bundle.post.content || !bundle.post.content.trim();
}

export async function fetchPostBundle(
  supabase: SupabaseClient,
  postId: string,
): Promise<PostBundle | null> {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select(
      'id, title, content, thumbnail_image_url, week_days_from_first_day, created_at, author_id, author_name',
    )
    .eq('id', postId)
    .maybeSingle();

  if (postError) throw new Error(`post ${postId}: ${postError.message}`);
  if (!post) return null;

  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, user_id, user_name, user_profile_image, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const { data: replies } = await supabase
    .from('replies')
    .select('id, comment_id, content, user_id, user_name, user_profile_image, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const commentRows = (comments ?? []) as CommentRow[];
  const replyRows = (replies ?? []) as ReplyRow[];

  const userIds = new Set<string>([post.author_id]);
  commentRows.forEach((comment) => userIds.add(comment.user_id));
  replyRows.forEach((reply) => userIds.add(reply.user_id));

  const { data: users } = await supabase
    .from('users')
    .select('id, nickname, profile_photo_url')
    .in('id', Array.from(userIds));
  const userById = new Map<string, UserRow>(((users ?? []) as UserRow[]).map((user) => [user.id, user]));

  return { post: post as PostRow, comments: commentRows, replies: replyRows, userById };
}

/**
 * Assemble a `PreviewPostContent` from raw rows, applying link neutralization and
 * excerpt generation. Author identity is delegated to the injected resolver.
 * Image URLs are left untouched here; localization is a separate concern.
 */
export function buildPreviewContent(bundle: PostBundle, resolveAuthor: AuthorResolver): PreviewPostContent {
  const { post, comments, replies, userById } = bundle;

  const repliesByComment = new Map<string, PreviewReply[]>();
  for (const reply of replies) {
    const author = resolveAuthor(reply.user_id, reply.user_name, reply.user_profile_image, userById.get(reply.user_id));
    const list = repliesByComment.get(reply.comment_id) ?? [];
    list.push({ id: reply.id, author, body: neutralizeInternalLinks(reply.content), createdAt: reply.created_at });
    repliesByComment.set(reply.comment_id, list);
  }

  const previewComments: PreviewComment[] = comments.map((comment) => ({
    id: comment.id,
    author: resolveAuthor(comment.user_id, comment.user_name, comment.user_profile_image, userById.get(comment.user_id)),
    body: neutralizeInternalLinks(comment.content),
    createdAt: comment.created_at,
    replies: repliesByComment.get(comment.id) ?? [],
  }));

  return {
    id: post.id,
    title: post.title,
    body: neutralizeInternalLinks(post.content ?? ''),
    contentPreview: toExcerpt(post.content ?? ''),
    author: resolveAuthor(post.author_id, post.author_name, null, userById.get(post.author_id)),
    createdAt: post.created_at,
    thumbnailImageURL: post.thumbnail_image_url ?? null,
    weekDaysFromFirstDay: post.week_days_from_first_day ?? null,
    comments: previewComments,
  };
}
