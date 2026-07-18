/**
 * Promote a real board post to the public /preview page in one command.
 *
 * Usage (from repo root):
 *   npx tsx scripts/add-preview-post.ts <postUrlOrId>
 *   # or via the workspace script:
 *   pnpm --filter web preview:add <postUrlOrId>
 *
 * It fetches the post from Supabase, anonymizes authors (synthetic `pv-author-N`,
 * deduped by display name against the existing registry), downloads and localizes
 * every image into apps/web/public/preview, writes the post module, and patches the
 * author registry and index by minimal insertion. Then it runs Prettier over the
 * touched files so the diff stays minimal. Review `git diff` and commit.
 *
 * See docs/plans/2026-07-18-preview-add-cli-design.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildPreviewContent,
  createServiceClient,
  fetchPostBundle,
  hasEmptyBody,
  parsePostId,
  repoRoot,
  type AuthorResolver,
  type PreviewAuthor,
  type PreviewComment,
  type PreviewPostContent,
  type PreviewReply,
} from './lib/preview-source';

const ROOT = repoRoot();
const DATA_DIR = resolve(ROOT, 'apps/web/src/preview/data');
const POSTS_DIR = resolve(DATA_DIR, 'posts');
const PUBLIC_PREVIEW_DIR = resolve(ROOT, 'apps/web/public/preview');
const AVATARS_SUBDIR = 'avatars';
const POST_IMAGES_SUBDIR = 'posts';

type PreviewRegistry = Record<string, PreviewAuthor>;

async function loadAuthorRegistry(): Promise<PreviewRegistry> {
  const modulePath = pathToFileURL(resolve(DATA_DIR, 'previewAuthors.ts')).href;
  const module = (await import(modulePath)) as { PREVIEW_AUTHORS: PreviewRegistry };
  return module.PREVIEW_AUTHORS;
}

function maxAuthorNumber(registry: PreviewRegistry): number {
  const numbers = Object.keys(registry).map((id) => Number(id.replace('pv-author-', '')));
  return numbers.length === 0 ? 0 : Math.max(...numbers);
}

type RegistryResolver = {
  resolve: AuthorResolver;
  newAuthors: () => PreviewAuthor[];
  reuseWarnings: () => string[];
};

/**
 * Dedupe incoming authors by display name against the existing registry: reuse the
 * existing synthetic author (keeping its already-localized avatar) on a name match,
 * otherwise allocate the next number. Name matches are surfaced as warnings so the
 * human reviewer confirms they are the same person.
 */
function createRegistryResolver(registry: PreviewRegistry): RegistryResolver {
  const byDisplayName = new Map<string, PreviewAuthor>();
  for (const author of Object.values(registry)) byDisplayName.set(author.displayName, author);

  const assignedByUserId = new Map<string, PreviewAuthor>();
  const created: PreviewAuthor[] = [];
  const warnings: string[] = [];
  let nextNumber = maxAuthorNumber(registry);

  const resolveAuthor: AuthorResolver = (userId, snapshotName, snapshotImage, live) => {
    const cached = assignedByUserId.get(userId);
    if (cached) return cached;

    const displayName = (live?.nickname || snapshotName || '익명').trim();
    const existing = byDisplayName.get(displayName);
    if (existing) {
      warnings.push(`reusing ${existing.id} for '${displayName}' — confirm same person`);
      assignedByUserId.set(userId, existing);
      return existing;
    }

    nextNumber += 1;
    const author: PreviewAuthor = {
      id: `pv-author-${nextNumber}`,
      displayName,
      profileImageURL: live?.profile_photo_url || snapshotImage || '',
    };
    byDisplayName.set(displayName, author);
    assignedByUserId.set(userId, author);
    created.push(author);
    return author;
  };

  return { resolve: resolveAuthor, newAuthors: () => created, reuseWarnings: () => warnings };
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function extensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return map[contentType.split(';')[0].trim().toLowerCase()] || 'jpg';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/** Basename with extension parsed from a URL, or null when the URL carries no usable name. */
function filenameFromUrl(url: string): string | null {
  const withoutQuery = url.split('?')[0];
  const decoded = decodeURIComponent(withoutQuery);
  const base = decoded.slice(decoded.lastIndexOf('/') + 1);
  if (base && /\.[a-z0-9]+$/i.test(base)) return sanitizeFilename(base);
  return null;
}

async function downloadImage(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`image download failed (${response.status}): ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, contentType: response.headers.get('content-type') || '' };
}

/**
 * Download a remote image into public/preview/<subdir> and return its local
 * `/preview/...` path. Already-local paths pass through untouched (idempotent
 * re-runs); an existing same-named file is reused without re-downloading.
 */
async function localizeImage(url: string, subdir: string, fallbackBase: string): Promise<string> {
  if (!url || url.startsWith('/preview/')) return url;

  const guessedName = filenameFromUrl(url);
  if (guessedName && existsSync(resolve(PUBLIC_PREVIEW_DIR, subdir, guessedName))) {
    return `/preview/${subdir}/${guessedName}`;
  }

  const { bytes, contentType } = await downloadImage(url);
  const filename = guessedName ?? `${fallbackBase}.${extensionFromContentType(contentType)}`;
  const destination = resolve(PUBLIC_PREVIEW_DIR, subdir, filename);
  if (!existsSync(destination)) writeFileSync(destination, bytes);
  return `/preview/${subdir}/${filename}`;
}

async function localizeHtmlImages(html: string, fallbackPrefix: string): Promise<string> {
  const sources = [...html.matchAll(/<img[^>]+src\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const remoteSources = Array.from(new Set(sources)).filter(isRemoteUrl);

  let localized = html;
  let index = 0;
  for (const url of remoteSources) {
    index += 1;
    const localPath = await localizeImage(url, POST_IMAGES_SUBDIR, `${fallbackPrefix}-${index}`);
    localized = localized.split(url).join(localPath);
  }
  return localized;
}

async function localizeComment(comment: PreviewComment): Promise<PreviewComment> {
  const replies: PreviewReply[] = [];
  for (const reply of comment.replies) {
    replies.push({ ...reply, body: await localizeHtmlImages(reply.body, `${comment.id}-reply`) });
  }
  return { ...comment, body: await localizeHtmlImages(comment.body, comment.id), replies };
}

/** Localize every image referenced by the post: new-author avatars, thumbnail, and inline body images. */
async function localizeContent(content: PreviewPostContent, newAuthors: PreviewAuthor[]): Promise<PreviewPostContent> {
  for (const author of newAuthors) {
    author.profileImageURL = await localizeImage(author.profileImageURL, AVATARS_SUBDIR, author.id);
  }

  const thumbnailImageURL = content.thumbnailImageURL
    ? await localizeImage(content.thumbnailImageURL, POST_IMAGES_SUBDIR, `${content.id}-thumb`)
    : null;
  const body = await localizeHtmlImages(content.body, content.id);

  const comments: PreviewComment[] = [];
  for (const comment of content.comments) comments.push(await localizeComment(comment));

  return { ...content, thumbnailImageURL, body, comments };
}

function moduleIdentifier(postId: string): string {
  return `post_${postId.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

/** Collapse whitespace so a title is safe inside a single-line `//` comment. */
function singleLineTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim();
}

function serializeAuthorReference(author: PreviewAuthor): string {
  return `PREVIEW_AUTHORS['${author.id}']`;
}

function serializeReply(reply: PreviewComment['replies'][number]): string {
  return `{ id: ${JSON.stringify(reply.id)}, author: ${serializeAuthorReference(reply.author)}, body: ${JSON.stringify(reply.body)}, createdAt: ${JSON.stringify(reply.createdAt)} }`;
}

function serializeComment(comment: PreviewComment): string {
  const replies = comment.replies.map(serializeReply).join(', ');
  return `{ id: ${JSON.stringify(comment.id)}, author: ${serializeAuthorReference(comment.author)}, body: ${JSON.stringify(comment.body)}, createdAt: ${JSON.stringify(comment.createdAt)}, replies: [${replies}] }`;
}

function serializePostContent(content: PreviewPostContent): string {
  const comments = content.comments.map(serializeComment).join(', ');
  const thumbnail = content.thumbnailImageURL === null ? 'null' : JSON.stringify(content.thumbnailImageURL);
  const weekDays = content.weekDaysFromFirstDay === null ? 'null' : String(content.weekDaysFromFirstDay);
  return `{
  id: ${JSON.stringify(content.id)},
  title: ${JSON.stringify(content.title)},
  body: ${JSON.stringify(content.body)},
  contentPreview: ${JSON.stringify(content.contentPreview)},
  author: ${serializeAuthorReference(content.author)},
  createdAt: ${JSON.stringify(content.createdAt)},
  thumbnailImageURL: ${thumbnail},
  weekDaysFromFirstDay: ${weekDays},
  comments: [${comments}],
}`;
}

function writePostModule(content: PreviewPostContent): string {
  const filePath = resolve(POSTS_DIR, `${content.id}.ts`);
  const source = `import type { PreviewPostContent } from '../previewTypes';
import { PREVIEW_AUTHORS } from '../previewAuthors';

/** ${singleLineTitle(content.title)} (${isoDate(content.createdAt)}) */
export const post: PreviewPostContent = ${serializePostContent(content)};
`;
  writeFileSync(filePath, source, 'utf8');
  return filePath;
}

function serializeAuthorEntry(author: PreviewAuthor): string {
  return `  ${JSON.stringify(author.id)}: { id: ${JSON.stringify(author.id)}, displayName: ${JSON.stringify(author.displayName)}, profileImageURL: ${JSON.stringify(author.profileImageURL)} },`;
}

/** Insert new author entries just before the registry's closing brace; existing lines are untouched. */
function patchAuthorRegistry(newAuthors: PreviewAuthor[]): string | null {
  if (newAuthors.length === 0) return null;

  const filePath = resolve(DATA_DIR, 'previewAuthors.ts');
  const text = readFileSync(filePath, 'utf8');
  const closingIndex = text.lastIndexOf('\n};');
  if (closingIndex === -1) throw new Error('could not locate PREVIEW_AUTHORS closing brace');

  const entries = newAuthors.map(serializeAuthorEntry).join('\n');
  const patched = `${text.slice(0, closingIndex)}\n${entries}${text.slice(closingIndex)}`;
  writeFileSync(filePath, patched, 'utf8');
  return filePath;
}

type IndexEntry = { line: string; date: string };

function parseIndexEntries(lines: string[]): Map<number, IndexEntry> {
  const entries = new Map<number, IndexEntry>();
  lines.forEach((line, lineNumber) => {
    const match = line.match(/^\s*post_\w+,.*\((\d{4}-\d{2}-\d{2})\)/);
    if (match) entries.set(lineNumber, { line, date: match[1] });
  });
  return entries;
}

/** Insert the new post's import and array entry at their chronological slot, leaving existing lines intact. */
function patchPostsIndex(content: PreviewPostContent): string | null {
  const filePath = resolve(POSTS_DIR, 'index.ts');
  const text = readFileSync(filePath, 'utf8');
  const identifier = moduleIdentifier(content.id);
  if (text.includes(`${identifier},`)) return null;

  const newDate = isoDate(content.createdAt);
  const importLine = `import { post as ${identifier} } from './${content.id}';`;
  const arrayLine = `  ${identifier}, // ${singleLineTitle(content.title)} (${newDate})`;

  const lines = text.split('\n');
  const entries = parseIndexEntries(lines);
  const successor = [...entries.entries()].find(([, entry]) => entry.date > newDate);

  insertArrayLine(lines, arrayLine, successor?.[0]);
  insertImportLine(lines, importLine, successor ? moduleIdentifier(extractIdentifier(successor[1].line)) : null);

  writeFileSync(filePath, lines.join('\n'), 'utf8');
  return filePath;
}

function extractIdentifier(arrayLine: string): string {
  const match = arrayLine.match(/post_(\w+),/);
  return match ? match[1] : '';
}

function insertArrayLine(lines: string[], arrayLine: string, successorLineNumber: number | undefined): void {
  if (successorLineNumber !== undefined) {
    lines.splice(successorLineNumber, 0, arrayLine);
    return;
  }
  const closingIndex = lines.findIndex((line) => line.trimStart().startsWith('];'));
  lines.splice(closingIndex, 0, arrayLine);
}

function insertImportLine(lines: string[], importLine: string, successorIdentifier: string | null): void {
  if (successorIdentifier) {
    const anchorIndex = lines.findIndex((line) => line.startsWith(`import { post as ${successorIdentifier} }`));
    if (anchorIndex !== -1) {
      lines.splice(anchorIndex, 0, importLine);
      return;
    }
  }
  const lastImportIndex = lines.map((line) => line.startsWith('import ')).lastIndexOf(true);
  lines.splice(lastImportIndex + 1, 0, importLine);
}

function formatWithPrettier(filePaths: string[]): void {
  const targets = filePaths.filter(Boolean);
  if (targets.length === 0) return;
  execFileSync('npx', ['prettier', '--write', ...targets], { cwd: ROOT, stdio: 'inherit' });
}

function printSummary(content: PreviewPostContent, resolver: RegistryResolver): void {
  const totalReplies = content.comments.reduce((sum, comment) => sum + comment.replies.length, 0);
  console.log(`\n✓ "${content.title}" (${isoDate(content.createdAt)})`);
  console.log(`  ${content.comments.length} comments, ${totalReplies} replies`);
  console.log(`  new authors: ${resolver.newAuthors().map((author) => `${author.id}=${author.displayName}`).join(', ') || 'none'}`);
  for (const warning of resolver.reuseWarnings()) console.log(`  ⚠ ${warning}`);
  console.log('\nReview `git diff`, then commit.');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Usage: npx tsx scripts/add-preview-post.ts <postUrlOrId>');
    process.exit(1);
  }

  const { supabase } = createServiceClient();
  const postId = parsePostId(args[0]);
  const bundle = await fetchPostBundle(supabase, postId);
  if (!bundle) throw new Error(`post ${postId}: not found`);
  if (hasEmptyBody(bundle)) {
    throw new Error(`post ${postId} has empty \`content\` (ProseMirror-only); author it by hand instead.`);
  }

  const registry = await loadAuthorRegistry();
  const resolver = createRegistryResolver(registry);
  const rawContent = buildPreviewContent(bundle, resolver.resolve);
  const content = await localizeContent(rawContent, resolver.newAuthors());

  const touchedFiles = [
    writePostModule(content),
    patchAuthorRegistry(resolver.newAuthors()),
    patchPostsIndex(content),
  ].filter((path): path is string => path !== null);

  formatWithPrettier(touchedFiles);
  printSummary(content, resolver);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
