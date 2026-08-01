# Preview Add CLI — Design

Date: 2026-07-18
Status: Approved for implementation (revised after subagent review)

## Goal

Turn the multi-step manual chore of promoting a board post to the public `/preview`
page into a single reviewable command:

```
pnpm --filter web preview:add <postIdOrUrl>
```

The command fetches the post from Supabase, anonymizes authors, localizes every
image, and writes/patches the static preview files so all that is left is
`git diff` and commit. This is an infrequent, admin-only (single operator) task,
so the design favors simplicity over ceremony: a local CLI, no runtime datastore,
no hosted admin UI, no persisted mapping state. **A minimal, reviewable diff is
the primary quality bar** — the tool must never churn unrelated existing files.

Command takes a single post per run (each promoted post needs its own diff
review; batch is speculative and cut).

## Constraints preserved from the existing showcase design

(See `docs/plans/2026-06-26-showcase-page-design.md`.)

- `/preview` stays fully static — TypeScript modules bundled into `apps/web`,
  no runtime DB read, no auth.
- Author IDs stay synthetic (`pv-author-N`); a visitor can never probe `/user/:id`.
  Display name and avatar remain the member's real values.
- Internal app links inside bodies are rewritten to `/join`.
- **No Firebase/Supabase Storage URL may survive into committed assets** (GitGuardian).
  This is now enforced by image localization instead of a manual post-step.

## What the command does (end to end)

1. **Fetch** post + comments + replies + author user rows via the Supabase
   service-role key (reuses the existing query logic). `week_days_from_first_day`
   is a stored column carried straight through — no board `first_day` computation.
2. **Abort on empty body** — if `content` is blank (ProseMirror-only post), stop
   with a clear message; do not write a broken file.
3. **Anonymize authors** — map each real user to a synthetic author, deduped by
   `displayName` against the existing registry, printing a confirm-warning on each
   reuse (see below).
4. **Neutralize internal links** — rewrite `/board`, `/post`, `/user` links to `/join`.
5. **Localize images** — download every remote image (post thumbnail, inline
   `<img>` in body **and** comments/replies, and new-author avatars) via one shared
   HTML-image-rewrite helper, save under `apps/web/public/preview/`, rewrite every
   URL to `/preview/...` (see below).
6. **Write** `apps/web/src/preview/data/posts/<postId>.ts` exporting
   `const post: PreviewPostContent`, authors referenced as
   `PREVIEW_AUTHORS['pv-author-N']`, with a `/** title (YYYY-MM-DD) */` doc comment.
   Overwrites if the file already exists (idempotent refresh).
7. **Patch** `previewAuthors.ts` and `posts/index.ts` by targeted insertion —
   existing lines untouched (see below).
8. **Print** a summary: title, #comments/#replies, new vs reused authors,
   downloaded images, and any link warnings.

## Key mechanisms

### Author dedup — by display name, no persisted map

Real user IDs must not be written anywhere in the repo, so the registry
(`previewAuthors.ts`) only maps `pv-author-N → {displayName, profileImageURL}`.
Cross-run dedup therefore keys on `displayName` (the current export dedupes by real
`userId`; that key can't be persisted, so `displayName` is the only stable option):

- Reuse the existing `pv-author-N` when a name already exists in the registry.
- Otherwise allocate `max(N) + 1`.

Two failure modes are inherent to a name key: two distinct members sharing a
nickname collapse into one author, and a member who renamed gets a second entry.
To make the human gate deliberate rather than incidental, the CLI **prints an
explicit warning on every reuse** — e.g. `reusing pv-author-6 for '지지' — confirm
same person`. No sidecar/gitignored state file to drift across worktrees.

### Image localization

**Idempotency rule first:** if a URL is already a local `/preview/...` path, skip
it entirely — no download, no rewrite. Re-running on an already-localized post is
therefore a no-op for its images. (The existing generated bodies already contain
`/preview/posts/...` paths, so this is what makes overwrite-on-re-run safe.)

For each *remote* image URL:

- Download the bytes (query string / Firebase token stripped for the saved file).
- Filename keeps the source basename when present (matching the existing
  convention, e.g. `151131_IMG_5441.jpeg`); fall back to `pv-<postId>-<n>.<ext>`
  when the URL has no usable name. Extension inferred from content-type or URL.
  Collision-check by name; no content hashing (unnecessary ceremony for 1–2 images).
- Destination: avatars → `apps/web/public/preview/avatars/`, all content images
  (thumbnail + inline body/comment/reply images) → `apps/web/public/preview/posts/`.
  Note the monorepo has two `public/` dirs — the web app's is `apps/web/public/`.
- Rewrite every occurrence of the original URL to the local `/preview/...` path.
- Pre-existing localized assets keep their legacy names untouched.

### Patch by targeted insertion (clean diff over elegance)

Rebuilding the aggregate files from scratch would force the emitter to reproduce
the hand-written formatting (4-space post modules, one-line-per-author registry,
`// title (date)` index comments) exactly, or churn all existing entries and bury
the real diff. Instead, edit by minimal insertion so existing lines are untouched:

- `previewAuthors.ts`: append new `pv-author-N` line(s) before the closing `}`.
  Numbering is always `max(N)+1`, so new authors naturally append at the end.
- `posts/index.ts`: append the new `import` line to the import block, and insert
  the array entry (`post_<id>, // title (date)`) at its chronological slot,
  located by parsing the existing `// … (date)` comments. Oldest-first convention
  is preserved; only the new lines appear in the diff.
- Match the file's existing indentation/quote/trailing-comma style for the inserted
  lines. Verify with a dry run: adding a post then removing it should leave
  `git diff` empty apart from that post's own lines.

## Deliverable

- New script `scripts/add-preview-post.ts` (shared fetch/map/link/excerpt helpers
  factored out of, or reused from, `export-preview-posts.ts`).
- `preview:add` script entry in `apps/web/package.json`.
- The old `preview:export` (JSON dump) may remain as a fallback for manual
  empty-body cases; not removed.

## Out of scope (YAGNI)

- Hosted admin-UI button / GitHub API commit flow.
- A `preview_posts` database table or any runtime data source.
- Automatic removal/unpublish of preview posts (delete the file, then remove its
  import + array line by hand — a one-line manual edit for a rare action).
- Persisted real-user-id → synthetic-id mapping.
- Multi-post batch in one invocation (single post per run; each needs its own diff).
- Content-hash asset filenames.

## Manual steps that remain

- Review the `git diff` and commit (intentional — the human gate).
- Deploy (static bundle change).
- Empty-body (ProseMirror-only) posts still need hand-authoring.
