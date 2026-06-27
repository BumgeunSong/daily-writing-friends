/**
 * Export real posts (with their comments and replies) into the static
 * `PreviewPost` shape consumed by the public /preview page.
 *
 * Usage (from repo root):
 *   npx tsx scripts/export-preview-posts.ts <postUrlOrId> [<postUrlOrId> ...]
 *   # or via the workspace script:
 *   pnpm --filter web preview:export -- <postUrlOrId> [...]
 *
 * Accepts either a full post URL
 *   https://dailywritingfriends.com/board/<boardId>/post/<postId>
 * or a bare <postId>.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (repo root). The
 * service-role key bypasses RLS so we read base tables directly.
 *
 * Output:
 *   - writes the full PREVIEW_POSTS array (JSON) to scripts/.preview-export.json
 *   - prints a per-post summary (title, #comments, #replies, link warnings)
 *
 * Design notes (see docs/plans/2026-06-26-showcase-page-design.md §5):
 *   - Bodies are stored RAW (the DB `content` HTML). The preview re-renders them
 *     through the real `renderPostBodyHtml` / `renderCommentBodyHtml` path at
 *     display time, identical to production.
 *   - Author IDs are SYNTHETIC (`pv-author-N`) so a visitor cannot probe
 *     `/user/:id`; display name + avatar remain the member's real values.
 *   - Internal app links inside bodies are rewritten to `/join` to honor the
 *     preview's navigation isolation.
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
config({ path: resolve(repoRoot, '.env') });

type PreviewAuthor = { id: string; displayName: string; profileImageURL: string };
type PreviewReply = { id: string; author: PreviewAuthor; body: string; createdAt: string };
type PreviewComment = {
  id: string;
  author: PreviewAuthor;
  body: string;
  createdAt: string;
  replies: PreviewReply[];
};
type PreviewPost = {
  id: string;
  title: string;
  body: string;
  contentPreview: string;
  author: PreviewAuthor;
  createdAt: string;
  thumbnailImageURL: string | null;
  weekDaysFromFirstDay: number | null;
  countOfComments: number;
  countOfReplies: number;
  comments: PreviewComment[];
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (.env at repo root)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const supabaseHost = SUPABASE_URL.replace(/^https?:\/\//, '');

function parsePostId(arg: string): string {
  const m = arg.match(/\/post\/([^/?#]+)/);
  return (m ? m[1] : arg).trim();
}

/** Rewrite internal app links to /join so the preview never escapes into the real app. */
function neutralizeInternalLinks(html: string): string {
  return html.replace(/href\s*=\s*(["'])(.*?)\1/gi, (full, quote, url) => {
    const internal =
      /^\/(board|post|user)\b/i.test(url) || /dailywritingfriends\.com\/(board|post|user)\b/i.test(url);
    return internal ? `href=${quote}/join${quote}` : full;
  });
}

/** Count anchors + bare URLs so we can warn about content that may need a link policy. */
function linkReport(html: string): { anchors: number; bareUrls: number } {
  const anchors = (html.match(/<a\b/gi) || []).length;
  const text = html.replace(/<[^>]+>/g, ' ');
  const bareUrls = (text.match(/https?:\/\/[^\s)]+/gi) || []).length;
  return { anchors, bareUrls };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function toExcerpt(html: string, max = 200): string {
  const text = decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

// Global real-user-id -> synthetic author, so the same member maps consistently.
const authorByUserId = new Map<string, PreviewAuthor>();
let authorSeq = 0;
type UserRow = { id: string; nickname: string | null; profile_photo_url: string | null };

function resolveAuthor(
  userId: string,
  snapshotName: string,
  snapshotImage: string | null,
  live: UserRow | undefined,
): PreviewAuthor {
  const existing = authorByUserId.get(userId);
  if (existing) return existing;
  authorSeq += 1;
  const author: PreviewAuthor = {
    id: `pv-author-${authorSeq}`,
    displayName: (live?.nickname || snapshotName || '익명').trim(),
    profileImageURL: live?.profile_photo_url || snapshotImage || '',
  };
  authorByUserId.set(userId, author);
  return author;
}

async function exportPost(arg: string): Promise<PreviewPost | null> {
  const postId = parsePostId(arg);

  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select(
      'id, title, content, content_json, thumbnail_image_url, week_days_from_first_day, created_at, author_id, author_name',
    )
    .eq('id', postId)
    .maybeSingle();

  if (postErr) {
    console.error(`  ✗ post ${postId}: ${postErr.message}`);
    return null;
  }
  if (!post) {
    console.error(`  ✗ post ${postId}: not found`);
    return null;
  }

  const { data: comments = [] } = await supabase
    .from('comments')
    .select('id, content, user_id, user_name, user_profile_image, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const { data: replies = [] } = await supabase
    .from('replies')
    .select('id, comment_id, content, user_id, user_name, user_profile_image, created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const userIds = new Set<string>([post.author_id]);
  (comments ?? []).forEach((c) => userIds.add(c.user_id));
  (replies ?? []).forEach((r) => userIds.add(r.user_id));

  const { data: users = [] } = await supabase
    .from('users')
    .select('id, nickname, profile_photo_url')
    .in('id', Array.from(userIds));
  const userById = new Map<string, UserRow>((users ?? []).map((u) => [u.id, u]));

  if (!post.content || !post.content.trim()) {
    console.error(
      `  ! post ${postId} has empty \`content\`; it may be ProseMirror-only (content_json). Body will be blank — handle manually.`,
    );
  }

  const repliesByComment = new Map<string, PreviewReply[]>();
  for (const r of replies ?? []) {
    const author = resolveAuthor(r.user_id, r.user_name, r.user_profile_image, userById.get(r.user_id));
    const list = repliesByComment.get(r.comment_id) ?? [];
    list.push({ id: r.id, author, body: neutralizeInternalLinks(r.content), createdAt: r.created_at });
    repliesByComment.set(r.comment_id, list);
  }

  const previewComments: PreviewComment[] = (comments ?? []).map((c) => ({
    id: c.id,
    author: resolveAuthor(c.user_id, c.user_name, c.user_profile_image, userById.get(c.user_id)),
    body: neutralizeInternalLinks(c.content),
    createdAt: c.created_at,
    replies: repliesByComment.get(c.id) ?? [],
  }));

  const totalReplies = previewComments.reduce((n, c) => n + c.replies.length, 0);

  const bodyHtml = neutralizeInternalLinks(post.content ?? '');
  const report = linkReport(
    bodyHtml + previewComments.map((c) => c.body + c.replies.map((r) => r.body).join('')).join(''),
  );

  console.log(
    `  ✓ "${post.title}" — ${previewComments.length} comments, ${totalReplies} replies` +
      (report.anchors || report.bareUrls
        ? `  ⚠ links: ${report.anchors} <a>, ${report.bareUrls} bare URL(s)`
        : ''),
  );

  return {
    id: post.id,
    title: post.title,
    body: bodyHtml,
    contentPreview: toExcerpt(post.content ?? ''),
    author: resolveAuthor(post.author_id, post.author_name, null, userById.get(post.author_id)),
    createdAt: post.created_at,
    thumbnailImageURL: post.thumbnail_image_url ?? null,
    weekDaysFromFirstDay: post.week_days_from_first_day ?? null,
    countOfComments: previewComments.length,
    countOfReplies: totalReplies,
    comments: previewComments,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/export-preview-posts.ts <postUrlOrId> [...]');
    process.exit(1);
  }

  console.log(`Exporting ${args.length} post(s) from ${supabaseHost}...`);
  const out: PreviewPost[] = [];
  for (const arg of args) {
    const p = await exportPost(arg);
    if (p) out.push(p);
  }

  const target = resolve(repoRoot, 'scripts/.preview-export.json');
  writeFileSync(target, JSON.stringify(out, null, 2), 'utf8');
  console.log(`\nWrote ${out.length}/${args.length} post(s) to ${target}`);
  console.log('Synthetic authors:', Array.from(authorByUserId.values()).map((a) => `${a.id}=${a.displayName}`).join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
