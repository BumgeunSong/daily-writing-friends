# Preview Page Design

**Date:** 2026-06-26 (revised 2026-06-27 post multi-agent review)
**Status:** Approved for implementation
**Owner:** Bumgeun Song

> Filename keeps the original `showcase` slug for git history; all in-doc terminology is "preview" per the 2026-06-26 decision.

## 1. Goal

Give a prospect — someone considering joining the next cohort — a feel for what membership is like. The page lets a logged-out visitor read real posts and the conversations around them without signing up.

Why "preview." This is the content a non-member sees *before* applying. The name signals intent: a sample of the product, framed for someone outside the door.

The preview is a sibling of `/join` under `publicRoutes`. Together they form the public entry funnel: `/join` sells the program; `/preview` shows the product.

## 2. Scope decisions (settled)

- **Content shape**: gallery of 7 handpicked posts (≈ one week's worth). Each post links to its own detail view with comments and replies.
- **Content origin**: real posts from real members, used with the author's consent. Consent records live outside the codebase (Notion, email, etc.).
- **Storage**: a single hardcoded TS module in the repo, populated by *exporting* the rendered HTML of each chosen post and comment. The export is a one-time operation per entry; edits are rare. Updates and take-downs ship through PR + deploy. No DB schema, no RLS changes, no API.
- **Visual style**: mimic the real in-app feed and detail view. Reuse existing presentational shells; build new orchestrators that feed them static data.
- **Interactivity**: read-only. Like buttons, reply boxes, comment inputs, filter tabs, and the writing FAB do not render. Counts still render.
- **Navigation isolation**: from any preview page, the visitor reaches only other preview pages or `/join`. The preview never links into real app routes. Enforced by an integration test (see §7).
- **Funnel wiring**: `/join` shows an entry button labeled **매글프 미리보기** that routes to `/preview`. Every preview page shows a bottom CTA labeled **다음 기수에 참여하기** that routes back to `/join`.

## 3. Routes

Two new routes under `publicRoutes` in `apps/web/src/router.tsx`:

| Path | Page | Mimics |
| --- | --- | --- |
| `/preview` | `PreviewBoardPage` | `BoardPage` |
| `/preview/post/:previewPostId` | `PreviewPostDetailPage` | `PostDetailPage` |

Header title: **매일 글쓰기 프렌즈 프리뷰** (matches the current `BoardPageHeader` style — bare title, no intro line).

The `:previewPostId` URL format (slug vs. numeric vs. UUID) is decided at export time. The type signature accepts any string.

**Invalid ID behavior**: if `:previewPostId` does not match any entry in `PREVIEW_POSTS`, `PreviewPostDetailPage` calls `navigate('/preview', { replace: true })` synchronously during render. No 404 component.

## 4. Component map

```
PreviewBoardPage                        ← new, mimics BoardPage
  PreviewBoardHeader                    ← new, mimics BoardPageHeader (no chevron link)
  PreviewPostCardList                   ← new, renders PREVIEW_POSTS
    PreviewPostCard (per post)          ← new, mimics PostCard shell-by-shell
      PostCardHeader                    ← reused as-is (pure props)
      PostCardContent                   ← reused as-is (pure props, takes contentPreview)
      PostCardThumbnail                 ← reused as-is (pure props)
      PostCardFooter                    ← reused as-is (pure props)
  PreviewJoinCTA                        ← new, non-sticky inline block at page bottom

PreviewPostDetailPage                   ← new, mimics PostDetailPage
  PreviewBackButton                     ← new, "← 프리뷰로 돌아가기" → /preview
  PostDetailLayout                      ← reused as-is
    PostDetailHeader                    ← reused with new `onClickProfile?` prop (see §4.1)
    PostContent                         ← reused as-is (verified prop-driven)
  PreviewCommentList                    ← new
    PreviewCommentRow (per comment)     ← new
      CommentHeader                     ← reused with new `badges?` prop (see §4.1)
      PreviewReplyList                  ← new
        CommentHeader                   ← reused with `badges` prop
  PreviewJoinCTA                        ← reused, non-sticky inline block

JoinIntroPage (existing, edited)
  IntroHeader
  IntroHero
  IntroContentSection
    PreviewEntryButton                  ← new, "매글프 미리보기" → /preview
    GoalSection
    ...rest of the existing sections
```

`PreviewJoinCTA` renders as a non-sticky, full-width prominent button block at the bottom of page content. Not `fixed`-positioned — distinct from `IntroCTA`.

`PreviewEntryButton` lives as the **first child of `<IntroContentSection>`**, before `<GoalSection />` — keeps it inside the content column's max-width and padding.

### 4.1 Two small refactors of existing shared components

Both refactors are no-ops for the real app (defaults preserve current behavior) and ship as a single prep PR before any preview UI lands.

**Refactor 1 — `CommentHeader.badges?: WritingBadge[]`.** Currently `CommentHeader` calls `usePostProfileBadges(userId)` internally — a Supabase hook. For the preview, we pass synthetic `pv-author-*` IDs, which would fire wasted requests. Add an optional `badges` prop; when provided, skip the hook entirely:

```ts
// CommentHeader.tsx
const badges = props.badges ?? usePostProfileBadges(userId).data;
//                              ^ hook only runs when prop omitted (use a wrapper to keep this a conditional pattern legal)
```

A clean implementation extracts a `useResolvedCommentBadges(userId, badges)` helper that branches without violating the rules-of-hooks (always call `usePostProfileBadges`, but pass an empty/disabled `enabled` flag when `badges` is provided).

**Refactor 2 — `PostDetailHeader.onClickProfile?: () => void`.** Currently hardcoded `onClickProfile={noop}`. Lift to an optional prop, default to `noop`:

```ts
function PostDetailHeader({ onClickProfile = noop, ...props }) {
  return <PostUserProfile ... onClickProfile={onClickProfile} />;
}
```

Preview passes a handler that navigates to `/join`.

### Reuse strategy

The existing `PostCard` is a *data-fetching orchestrator* — it calls `usePrefetchPost`, `usePostCard`, and triggers Supabase queries for author / badges / streak. The preview does not reuse `PostCard` itself.

It reuses the inner shells: `PostCardHeader`, `PostCardContent`, `PostCardThumbnail`, `PostCardFooter` — verified pure-prop, hook-free.

On the detail side: reuse `PostDetailLayout`, `PostDetailHeader` (after Refactor 2), `PostContent`, and `CommentHeader` (after Refactor 1).

### What does NOT render on the preview

- `PostFilterTabs` (recent/best toggle)
- `WritingActionButton` (writing FAB)
- `PostLikeButton`
- `PostAdjacentButtons`
- `CommentInput` and `ReplyInput`
- `ReactionList` and the emoji picker
- Edit / delete buttons on comments and posts

### Navigation isolation (the "no escape" rule)

The visitor reaches only `/preview`, `/preview/post/:previewPostId`, and `/join` from any preview page. Every potential escape hatch:

| Escape hatch | How we close it |
| --- | --- |
| `BoardPageHeader` `Link to="/boards/list"` (chevron) | `PreviewBoardHeader` is a plain non-link title. |
| Post-card avatar (`onClickProfile` → `/user/:id`) | `PreviewPostCard` passes a handler that routes to `/join`. |
| Detail-page avatar (currently `noop`) | After Refactor 2, `PreviewPostDetailPage` passes a `/join` handler. Consistent with the card. |
| `PostBackButton` (goes to the real board) | Replace with `PreviewBackButton` routing to `/preview`. |
| `PostAdjacentButtons` (prev/next within a board) | Do not render. |
| Edit / delete buttons in `PostDetailHeader` | Gated by `isAuthor && boardId && postId` — passing `isAuthor=false` and no `boardId`/`postId` keeps them hidden. |
| Invalid `:previewPostId` URL | Redirect to `/preview` with `{ replace: true }`. |
| Internal `<a href="/board/...">` inside post body HTML | Strip or rewrite to `/join` during export. |
| Internal `<a href="/user/...">` inside comment body HTML | Same. |
| Future leaks (regressions) | Integration test asserts every rendered `<a>` href matches `/preview/*` or `/join`. See §7. |

## 5. Data shape

One TS module: `apps/web/src/preview/data/previewPosts.ts`.

```ts
export type PreviewAuthor = {
  id: string;             // synthetic, e.g. 'pv-author-1'
  displayName: string;
  profileImageURL: string;
};

export type PreviewReply = {
  id: string;
  author: PreviewAuthor;
  body: string;           // pre-sanitized HTML string
  createdAt: string;      // ISO date string
};

export type PreviewComment = {
  id: string;
  author: PreviewAuthor;
  body: string;
  createdAt: string;
  replies: PreviewReply[];
};

export type PreviewPost = {
  id: string;             // used in URL: /preview/post/:id; format decided at export
  title: string;
  body: string;           // pre-sanitized HTML string (full post)
  contentPreview: string; // plain-text or safe-HTML excerpt (~200 chars) for the card
  author: PreviewAuthor;
  createdAt: string;
  thumbnailImageURL: string | null;
  weekDaysFromFirstDay: number | null;
  countOfComments: number;         // derive from comments.length
  countOfReplies: number;          // derive from comments.flatMap(c => c.replies).length
  comments: PreviewComment[];
};

export const PREVIEW_BOARD_NAME = '매일 글쓰기 프렌즈 프리뷰';

export const PREVIEW_POSTS: PreviewPost[] = [
  // 7 handpicked entries
];
```

Why a separate `contentPreview`: `PostCardContent` takes a `contentPreview` prop and renders it inside a `line-clamp-3`. Passing the full `body` (block-level HTML) would render the entire post and break under line-clamp. Generate the excerpt at export time.

### Adapter to the real `Post` model

Reused components (`PostDetailHeader`, `PostContent`) take a `Post` whose `createdAt` is a `FirebaseTimestamp` (with `seconds`, `nanoseconds`, *and* `toDate()`). The codebase already exports `createTimestamp(date: Date)` from `apps/web/src/shared/model/Timestamp.ts` — use it.

```ts
// apps/web/src/preview/utils/toPostModel.ts
import { createTimestamp } from '@/shared/model/Timestamp';
import { PostVisibility, type Post } from '@/post/model/Post';

export function toPostModel(previewPost: PreviewPost): Post {
  return {
    id: previewPost.id,
    title: previewPost.title,
    content: previewPost.body,
    contentPreview: previewPost.contentPreview,
    boardId: 'preview',
    authorId: previewPost.author.id,
    authorName: previewPost.author.displayName,
    authorProfileImageURL: previewPost.author.profileImageURL,
    visibility: PostVisibility.PUBLIC,
    thumbnailImageURL: previewPost.thumbnailImageURL,
    countOfComments: previewPost.countOfComments,
    countOfReplies: previewPost.countOfReplies,
    countOfLikes: 0,
    weekDaysFromFirstDay: previewPost.weekDaysFromFirstDay,
    createdAt: createTimestamp(new Date(previewPost.createdAt)),
    // any other required fields on Post: pick a safe default + comment why
  };
}
```

PR 1 must read `apps/web/src/post/model/Post.ts` and complete the field list so the object type-checks.

### Adapter for comment timestamps

`CommentHeader` calls `createdAt?.toDate()`. The `PreviewComment.createdAt` ISO string must be wrapped before passing to `CommentHeader`:

```ts
createdAt: createTimestamp(new Date(comment.createdAt))
```

`PreviewCommentRow` does this conversion before handing data to `CommentHeader`.

### Defaults passed to reused presentational props

When constructing props for `PostCardHeader` and `PostDetailHeader` from a `PreviewPost`:

- `isDonator={false}` — donator status is a membership perk; preview authors do not display the badge.
- `isPrivate={false}` — all preview posts are public by definition.
- `streak={undefined}` and `isStreakLoading={false}` — preview does not show streak.
- `badges={undefined}` — passing nothing keeps the existing fetch path on the real app; for preview cards, do not show writing badges (pass `[]` or omit).

### Why HTML, not Markdown

The real `PostContent` and comment renderers consume pre-sanitized HTML. We export the chosen post's already-rendered HTML once, paste it into the file, and never touch it again. Editing is rare; a Markdown parser would be code we never use.

`PostContent` runs `renderPostBodyHtml(post.content)` on the body string. The export HTML must remain valid input to that function. If `renderPostBodyHtml` ever evolves to parse ProseMirror JSON, the preview adapter must adapt.

### Export pipeline (one-time per entry)

1. Locate the source post in production / staging.
2. Fetch its rendered body HTML and each comment's rendered HTML through the real render path (`renderPostBodyHtml`, `renderCommentBodyHtml`).
3. Rewrite any `<a href>` inside the HTML that points to real app routes (`/board/...`, `/user/...`, `/post/...`) so the preview honors §4's navigation isolation. Stripping or pointing to `/join` are both acceptable; pick one and stay consistent.
4. Generate a plain-text excerpt for `contentPreview` (strip HTML, take first ~200 chars on a word boundary).
5. Paste the result into `PREVIEW_POSTS`.

A small helper script under `apps/web/scripts/` would make this repeatable. Out of scope for v1 — first batch is hand-curated.

### Why synthetic author IDs

Real author IDs would let a curious visitor probe `/user/:userId`. Synthetic IDs (`pv-author-*`) keep the preview self-contained and reinforce navigation isolation.

## 6. Routing wiring

`apps/web/src/router.tsx` adds two entries inside `publicRoutes.children`:

```ts
{
  path: 'preview',
  lazy: async () => {
    const { default: PreviewBoardPage } = await import('@/preview/components/PreviewBoardPage');
    return { Component: PreviewBoardPage };
  },
},
{
  path: 'preview/post/:previewPostId',
  lazy: async () => {
    const { default: PreviewPostDetailPage } = await import('@/preview/components/PreviewPostDetailPage');
    return { Component: PreviewPostDetailPage };
  },
},
```

Lazy-loaded, like every other public route.

`JoinIntroPage` adds one new component as the first child of `<IntroContentSection>`:

```tsx
<IntroContentSection>
  <PreviewEntryButton />   {/* "매글프 미리보기" — secondary CTA */}
  <GoalSection />
  ...
</IntroContentSection>
```

## 7. Risks and edge cases

- **PostCardHeader prop drift.** Shell components take heavy prop shapes (`authorData`, `badges`, `streak`, etc.). If those evolve, the preview silently falls behind. Mitigation: smoke test (see PR 2 below).
- **Static HTML and sanitizer drift.** The HTML in `previewPosts.ts` was sanitized at export time. If the project sanitizer rules change later, the static HTML is not retroactively re-sanitized. Mitigation: review HTML at PR time; treat the file as content, not code.
- **Internal-link leakage.** A real post body or comment may contain `<a href="/user/...">` or `/board/...`. The export step rewrites these. Without the rewrite, a visitor clicking an in-body link escapes the preview.
- **Navigation isolation regression.** Today the rule is convention-only. PR 2 adds an integration test:

  ```ts
  // PreviewBoardPage.integration.test.tsx
  test('every link on /preview points only to /preview/* or /join', () => {
    render(<MemoryRouter initialEntries={['/preview']}>...</MemoryRouter>);
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? '';
      expect(href === '/join' || href.startsWith('/preview')).toBe(true);
    }
  });
  ```

  Same test runs on `/preview/post/:id`.
- **Entry-button placement vs. primary CTA.** Adding "매글프 미리보기" inside `IntroContentSection` competes for attention with the main join CTA. Watch conversion metrics after launch; move it lower if it cannibalizes.
- **Author take-down latency.** A member who withdraws consent waits for the next deploy. Acceptable for an MVP; revisit if it becomes painful.
- **SEO and link previews.** Public pages will be crawled. Likely emit Open Graph tags via `PostMetaHelmet` — copy the pattern from `PostDetailPage`.

## 8. Resolved decisions

| # | Question | Decision |
| --- | --- | --- |
| 1 | Page URL slug | `/preview` |
| 1b | URL format for `:previewPostId` | Decide at export time; type accepts any string |
| 2 | Entry point into the preview | Button "매글프 미리보기" as first child of `<IntroContentSection>` inside `/join` |
| 3 | Bottom CTA on the preview | "다음 기수에 참여하기" → `/join`, non-sticky inline block, shown on both preview pages |
| 4 | Header copy | Bare title (same as `BoardPageHeader`) |
| 5 | Initial post count | 7 (one week's worth) |
| 6 | Card avatar click | Routes to `/join`. |
| 6b | Detail-page avatar click | After Refactor 2, also routes to `/join` (consistent with card) |
| 7 | `PostContent` reuse | Reuse as-is — verified prop-driven |
| 8 | `CommentHeader` reuse | Refactor 1: add optional `badges?` prop that skips the internal Supabase hook |
| 9 | `Post` Timestamp adapter | Use existing `createTimestamp(new Date(iso))` — produces a fully-conformant `FirebaseTimestamp` |
| 10 | `PreviewPost.contentPreview` | Required field, generated at export time (~200 chars plain text) |
| 11 | Invalid `:previewPostId` | Redirect to `/preview` with `{ replace: true }` |
| 12 | Navigation isolation enforcement | Integration test asserts every `<a>` href is `/preview/*` or `/join` |
| 13 | Defaults for reused presentational props | `isDonator=false`, `isPrivate=false`, `badges=[]`, `streak=undefined` |

## 9. Build sequence

A reasonable PR breakdown — each PR is independently mergeable:

0. **Prep refactors of existing shared components.** No new feature.
   - `CommentHeader`: add optional `badges?: WritingBadge[]` prop; skip `usePostProfileBadges` when provided.
   - `PostDetailHeader`: lift `onClickProfile` from hardcoded `noop` to an optional prop (default `noop`).
   - Both changes are no-ops for the real app — verify with existing component tests.

1. **Preview data module + types.** Add `apps/web/src/preview/data/previewPosts.ts` with type definitions, one stub post, and the `toPostModel` adapter. Read `Post.ts` and complete the field list. No UI yet.

2. **`PreviewBoardPage` + `PreviewPostCard` + `PreviewJoinCTA` + navigation-isolation integration test.** Route lives at `/preview`. Bottom CTA links back to `/join`. Clicking a card routes to `/preview/post/:id` (404-redirect for now). Card avatar routes to `/join`. Integration test enforces the link-href rule on this route.

   Smoke test for `PreviewPostCard`: mount with `PREVIEW_POSTS[0]`; assert (a) post title text visible, (b) author displayName visible, (c) `countOfComments` text visible, (d) no runtime errors thrown.

3. **`PreviewPostDetailPage` + `PreviewBackButton`** without comments. Route lives at `/preview/post/:id`. Reuses the bottom CTA. Invalid-ID branch calls `navigate('/preview', { replace: true })`. Detail-page avatar routes to `/join`. Add navigation-isolation integration test on this route.

4. **`PreviewCommentList`.** Adds comments and replies to the detail page. Uses refactored `CommentHeader` with `badges={[]}` and converted timestamp via `createTimestamp`.

5. **`PreviewEntryButton` inside `/join`.** Inside `<IntroContentSection>`, before `<GoalSection>`. Routes to `/preview`.

6. **Real content.** Replace the stub with 7 handpicked, consent-cleared posts exported per the §5 pipeline. Each entry includes `contentPreview` generated from the body.

PRs 0–5 ship behind a single stub post, so reviewers can click through the whole flow end-to-end. Real-member content waits for PR 6, after the UI is stable.

## 10. Out of scope

- Admin UI for managing preview entries
- A DB-backed preview table
- Preview analytics ("did this prospect click into a post?") — can layer on later with existing analytics hooks
- Internationalization beyond Korean
- An export script — first batch is hand-curated; automate later if take-down or rotation gets painful
