/**
 * Export real posts (with their comments and replies) into the static
 * `PreviewPost` shape consumed by the public /preview page, as a JSON dump.
 *
 * Usage (from repo root):
 *   npx tsx scripts/export-preview-posts.ts <postUrlOrId> [<postUrlOrId> ...]
 *   # or via the workspace script:
 *   pnpm --filter web preview:export -- <postUrlOrId> [...]
 *
 * For the full end-to-end flow that also writes the static files and localizes
 * images, prefer `add-preview-post.ts` (`pnpm --filter web preview:add`). This
 * JSON dump remains a fallback for manual/empty-body cases.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (repo root).
 *
 * Design notes (see docs/plans/2026-06-26-showcase-page-design.md §5):
 *   - Bodies are stored RAW (the DB `content` HTML), re-rendered at display time.
 *   - Author IDs are SYNTHETIC (`pv-author-N`); display name + avatar stay real.
 *   - Internal app links inside bodies are rewritten to `/join`.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildPreviewContent,
  createServiceClient,
  fetchPostBundle,
  hasEmptyBody,
  linkReport,
  parsePostId,
  repoRoot,
  type AuthorResolver,
  type PreviewAuthor,
  type PreviewPostContent,
} from './lib/preview-source';

/** Sequential resolver: dedupe by real user id within a run, number as we go. */
function createSequentialResolver(): { resolve: AuthorResolver; authors: () => PreviewAuthor[] } {
  const authorByUserId = new Map<string, PreviewAuthor>();
  let sequence = 0;
  const resolveAuthor: AuthorResolver = (userId, snapshotName, snapshotImage, live) => {
    const existing = authorByUserId.get(userId);
    if (existing) return existing;
    sequence += 1;
    const author: PreviewAuthor = {
      id: `pv-author-${sequence}`,
      displayName: (live?.nickname || snapshotName || '익명').trim(),
      profileImageURL: live?.profile_photo_url || snapshotImage || '',
    };
    authorByUserId.set(userId, author);
    return author;
  };
  return { resolve: resolveAuthor, authors: () => Array.from(authorByUserId.values()) };
}

function reportLinks(content: PreviewPostContent): string {
  const commentHtml = content.comments
    .map((comment) => comment.body + comment.replies.map((reply) => reply.body).join(''))
    .join('');
  const report = linkReport(content.body + commentHtml);
  if (!report.anchors && !report.bareUrls) return '';
  return `  ⚠ links: ${report.anchors} <a>, ${report.bareUrls} bare URL(s)`;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/export-preview-posts.ts <postUrlOrId> [...]');
    process.exit(1);
  }

  const { supabase, host } = createServiceClient();
  const { resolve: resolveAuthor, authors } = createSequentialResolver();

  console.log(`Exporting ${args.length} post(s) from ${host}...`);
  const exported: PreviewPostContent[] = [];
  for (const arg of args) {
    const postId = parsePostId(arg);
    const bundle = await fetchPostBundle(supabase, postId);
    if (!bundle) {
      console.error(`  ✗ post ${postId}: not found`);
      continue;
    }
    if (hasEmptyBody(bundle)) {
      console.error(`  ! post ${postId} has empty \`content\` (ProseMirror-only). Body will be blank — handle manually.`);
    }
    const content = buildPreviewContent(bundle, resolveAuthor);
    const totalReplies = content.comments.reduce((sum, comment) => sum + comment.replies.length, 0);
    console.log(`  ✓ "${content.title}" — ${content.comments.length} comments, ${totalReplies} replies${reportLinks(content)}`);
    exported.push(content);
  }

  exported.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());

  const target = resolve(repoRoot(), 'scripts/.preview-export.json');
  writeFileSync(target, JSON.stringify(exported, null, 2), 'utf8');
  console.log(`\nWrote ${exported.length}/${args.length} post(s) to ${target}`);
  console.log('Synthetic authors:', authors().map((author) => `${author.id}=${author.displayName}`).join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
