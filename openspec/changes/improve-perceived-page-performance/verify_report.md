# Verify Report — improve-perceived-page-performance

## Phase 0 Baseline (pre-PR2)

**Measured:** 2026-05-16 against `apps/web` production build with `react-quill-new` already removed (PR1 merged).
**Tool:** `pnpx vite-bundle-visualizer -t raw-data` (Rollup module-level rendered sizes, pre-gzip).
**Artifacts:** `/tmp/bundle-baseline.json` (raw data), `/tmp/bundle-baseline.html` (treemap).

### Build Output (`apps/web/dist/assets/*.js`, on disk, minified)

| Chunk | Size | Notes |
|---|---|---|
| `index-DbWNLHHH.js` | **3.2 MB** | Main entry — contains app code + most vendors |
| `react-vendor-CTzBezm5.js` | 214 KB | React, React-DOM, React-Router |
| `firebase-vendor-DFsKowEm.js` | 41 KB | (stale `firebase/firestore` entry — Firestore is no longer used) |
| `confetti.module-C2jkTI5u.js` | 11 KB | Auto-split via dynamic `import('canvas-confetti')` |

- **Total bundle size:** ~3.5 MB on disk (minified, pre-gzip).
- **Main entry chunk:** 3.2 MB on disk.
- **Chunk count:** 4.

### Rendered-Size View (pre-minify, from visualizer raw data)

| Chunk | Rendered |
|---|---|
| `assets/index-*.js` | 6174.4 KB |
| `assets/react-vendor-*.js` | 353.8 KB |
| `assets/firebase-vendor-*.js` | 86.8 KB |
| `assets/confetti.module-*.js` | 24.3 KB |
| **Total** | **6639.5 KB rendered** |

### Top 15 Deps in Main `index-*.js` Chunk (by rendered KB)

| Rank | Dep | Rendered KB | Notes |
|---|---|---|---|
| 1 | **heic2any** | **1330.4** | iOS HEIC → JPG conversion. Statically imported by `post/utils/ImageUtils.ts`. Will move to post-route chunks automatically once post routes go lazy in PR2. |
| 2 | @supabase/auth-js | 359.3 | Always loaded — candidate for `supabase-vendor` chunk. |
| 3 | **@sentry-internal/replay** | **312.7** | Already addressed in PR2 Decision 5 — moving to deferred `sentryReplay.ts` dynamic chunk. |
| 4 | motion-dom | 280.4 | Used by framer-motion. |
| 5 | @sentry/core | 270.3 | Always loaded — candidate for `sentry-vendor` chunk. |
| 6 | prosemirror-view | 238.7 | Tiptap dep — moves with post routes. |
| 7 | @tiptap/core | 192.3 | Moves with post routes. |
| 8 | _app:post (app code) | 145.4 | App code — moves with post routes. |
| 9 | zod | 134.1 | Used across the app. |
| 10 | @supabase/postgrest-js | 125.7 | Always loaded. |
| 11 | prosemirror-model | 121.2 | Moves with post routes. |
| 12 | _app:shared | 115.5 | App code. |
| 13 | @firebase/storage | 107.0 | Image upload. |
| 14 | @supabase/storage-js | 98.6 | Always loaded. |
| 15 | @sentry-internal/browser-utils | 95.9 | Always loaded. |

Combined cohort sizes (rendered):
- **Supabase SDK** (auth + postgrest + storage + realtime): ~667 KB → propose `supabase-vendor` chunk.
- **Sentry base SDK** (core + browser + browser-utils + react): ~446 KB → propose `sentry-vendor` chunk.
- **Sentry Replay**: 313 KB → already split via dynamic import (Decision 5).
- **Tiptap + ProseMirror**: ~633 KB → moves with lazy post routes; explicit chunk would create a shared post-vendor chunk so it isn't duplicated across `create`/`edit`/`view` routes.

### Task 1.4 — Heavy-Dep Decisions for PR2 `manualChunks`

The design's "likely" list (`@sentry/react/replay`, `recharts`, `react-markdown`) didn't match reality:

- `@sentry/react/replay`: **handled by the dynamic-import deferral in Decision 5, no manualChunks entry needed** — Rollup splits the dynamic import into its own chunk automatically.
- `recharts`: **not in top 30 by size** — skip.
- `react-markdown`: **not in top 30 by size** — skip.

Replace with these explicit chunks for the always-loaded heavy vendors:

- `react-vendor`: `react`, `react-dom`, `react-router-dom` *(keep)*
- `sentry-vendor`: `@sentry/react`, `@sentry/core`, `@sentry/browser`, `@sentry-internal/browser-utils`, `@sentry-internal/tracing` *(new)*
- `supabase-vendor`: `@supabase/auth-js`, `@supabase/postgrest-js`, `@supabase/storage-js`, `@supabase/realtime-js`, `@supabase/supabase-js` *(new)*
- `firebase-vendor`: drop stale `firebase/firestore`; keep `firebase/app` for the base SDK *(adjust)*

Lazy-route splitting will move `heic2any`, `framer-motion`, all Tiptap/ProseMirror, and feature-folder app code out of `index` naturally. No manual chunk is needed for those — Rollup's dedup will surface them as on-demand or shared chunks.

### Lighthouse Mobile Profile (Task 1.2)

**Pending — requires Chrome DevTools session by the user.** This task is a USER ACTION per the task list. To complete: run Lighthouse on `/` from a clean profile with Chrome DevTools throttling set to "Slow 4G + 4× CPU slowdown", median of 3 runs; capture FCP p75 / LCP p75 and screenshots of the Performance + Diagnostics panels. Append below.

> FCP p75: _pending user input_
> LCP p75: _pending user input_

Sentry RUM (pre-PR2) reference: FCP p75 4.22s on `/`, 4.85s on `/board/*/post/*` (cited in `design.md` Context).

---

## Post-PR2 Build Report

**Measured:** 2026-05-16 against `apps/web` production build with all PR2 changes applied: lazy routes (router.tsx), Sentry Replay removed entirely (scope change from "deferred" — see tasks 7.x), vite `manualChunks` rewritten, `chunkSizeWarningLimit: 500`.

### Build Output (on disk, minified)

| Metric | Baseline | Post-PR2 | Delta |
|---|---|---|---|
| Chunk count | 4 | **99** | +95 chunks (granular code-splitting) |
| Total JS size (sum of all chunks) | ~3.5 MB | ~3.3 MB | −200 KB (Replay 313 KB removed + tree-shaking; offset by per-chunk overhead) |
| **Main `index-*.js`** | **3.2 MB** | **440 KB** | **−2.76 MB (≈86% reduction)** |
| Critical-path initial JS¹ | ~3.5 MB | ~1.0 MB | **−2.5 MB (≈72% reduction)** |

¹ Initial JS = main `index-*.js` + statically-imported vendor chunks (`react-vendor`, `firebase-vendor`, `sentry-vendor`, `supabase-vendor`). All non-vendor routes are now fetched lazily on navigation.

### Top 10 Chunks (Post-PR2, on disk)

| Rank | Chunk | Size | Notes |
|---|---|---|---|
| 1 | `ImageUtils-*.js` | 1323 KB | **heic2any** (1.3 MB) moved into its own chunk — loaded only when post create/edit routes are visited. Triggers the >500KB warning but is **never on the first-paint critical path**. |
| 2 | `index-*.js` | 440 KB | Main entry — down from 3.2 MB. |
| 3 | `PostEditor-*.js` | 396 KB | Tiptap + ProseMirror — loaded only on post routes. |
| 4 | `react-vendor-*.js` | 209 KB | Static (always loaded). |
| 5 | `supabase-vendor-*.js` | 200 KB | Static (always loaded) — new chunk via Decision 4. |
| 6 | `sentry-vendor-*.js` | 122 KB | Static (always loaded) — new chunk via Decision 4. **Down from ~700 KB combined SDK + Replay in old `index`** because Replay was removed entirely. |
| 7 | `proxy-*.js` | 119 KB | Sentry's `@sentry/react` proxy bridge chunk. |
| 8 | `firebase-vendor-*.js` | 40 KB | Static (always loaded). Stale `firebase/firestore` entry dropped per task 6.1. |
| 9 | `JoinIntroPage-*.js` | 39 KB | Lazy per-page chunk. |
| 10 | `PostDetailPage-*.js` | 37 KB | Lazy per-page chunk — its loader (`postDetailLoader`) fires in parallel via the "true parallel" pattern (design Decision 2). |

### Chunk-Size Warning Audit (Task T.B.2)

Rollup emits exactly one >500KB warning:

- `ImageUtils-Do7oTzJg.js` (1323 KB) — driven by `heic2any@0.0.4` for iOS HEIC → JPG conversion. **Acceptable for PR2** because the chunk is loaded only on post create/edit routes, never on `/` or any read-only route. A future PR can defer `heic2any` further with a dynamic `import('heic2any')` inside the HEIC code path in `apps/web/src/post/utils/ImageUtils.ts`, paying the 1.3 MB only when a HEIC file is actually selected.

No other chunk exceeds the 500 KB threshold. The lowered limit is doing its job — it surfaced the one legitimate outlier and is silent on everything else.

### Sentry Replay Removal Confirmation

- Pre-PR2: `@sentry-internal/replay` 313 KB rendered inside the main `index` chunk.
- Post-PR2: zero references to `@sentry-internal/replay` in `dist/assets/*.js` (tree-shaken). The `sentry-vendor` chunk is just the base SDK (core + browser + react + browser-utils).

### Side-by-Side: Baseline vs Post-PR2 First-Paint Cost

| Resource on `/` first paint | Baseline (KB) | Post-PR2 (KB) |
|---|---|---|
| Main `index` | 3275 | 440 |
| `react-vendor` | 214 | 209 |
| `firebase-vendor` (post-cleanup) | 41 | 40 |
| `sentry-vendor` | (inside index) | 122 |
| `supabase-vendor` | (inside index) | 200 |
| **Sum (initial JS)** | **~3530** | **~1011** |
| **Sentry Replay weight on first paint** | 313 KB (inside index) | **0 KB** |

That ≈72% reduction in critical-path JS is what should translate into the FCP/LCP improvement on `/`. Sentry RUM will confirm the field delta post-deploy.

---

## Manual Smoke (Tasks 4.x + 9.x) — Local Supabase + agent-browser

**Run:** 2026-05-16 against `apps/web` dev server (mode `local-supabase`, port 5175) backed by local `supabase start`, and against `vite preview` of the prod build (port 4173). Driven via `agent-browser`. Screenshots saved to `/tmp/pr2-smoke-*.png`.

### Prod Build (`vite preview`, port 4173)

Verified using `performance.getEntriesByType('resource')` after navigation:

| Route visited | Lazy chunk fetched | Replay chunk fetched | ImageUtils (heic2any) fetched | PostEditor fetched | BoardPage fetched |
|---|---|---|---|---|---|
| `/` (→ `/join`) | `JoinIntroPage-*.js` (16 KB gz) | **NO** | **NO** | **NO** | **NO** |
| `/login` | (LoginPage is eager — no fetch, as designed) | **NO** | **NO** | **NO** | **NO** |
| `/signup` | `SignupPage-*.js` only | **NO** | **NO** | **NO** | **NO** |
| `/forgot-password` | `ForgotPasswordPage-*.js` only | **NO** | **NO** | **NO** | **NO** |

First-paint static chunks observed on `/` (gzipped transfer): `index` 125 KB + `react-vendor` 70 KB + `supabase-vendor` 54 KB + `sentry-vendor` 43 KB + `firebase-vendor` 10 KB ≈ **302 KB initial JS gz**.

### Dev Server (`vite dev --mode local-supabase`, port 5175)

Logged in as `e2e@example.com / test1234`:

| Step | Route | Observation |
|---|---|---|
| Login submit | `/login` → `/boards` | Auth flow against local Supabase succeeded; redirect to `/boards` (RecentBoard route). |
| Click into board | `/boards` → `/boards/list` | Lazy BoardListPage modules fetched only on click. |
| Click "게시글 상세로 이동" | `/boards/list` → `/board/e2e-test-board` | BoardPage lazy chunk + boardLoader module fetched in parallel (true-parallel pattern). |
| Click "수정" | → `/board/e2e-test-board/edit/e2e-post-024` | **PostEditPage rendered with full Tiptap toolbar (Bold/Italic/Underline/Strike/H1/H2/Blockquote/Bullet/Ordered/Link/Image)**. `usePostDetailLoader.ts` fetched as a separate module — true-parallel loader pattern confirmed working. |
| Navigate to `/notifications` | `/notifications` | NotificationsPage + 9 related modules fetched only on this navigation; no earlier preload. |

### Tasks 4.x (PR1 carry-over Quill removal smoke) — covered by the post-edit step

Opening `/board/e2e-test-board/edit/e2e-post-024` rendered the editor with the Tiptap toolbar — confirms that:
- Post editing mounts Tiptap directly (no `forceEditor` switching logic left over from Quill).
- Existing post content loaded into Tiptap successfully (page rendered without error boundary).
- `RemoteConfigContext` works without the `tiptap_editor_enabled` flag.

Did not exercise the image-paste path (4.4) or legacy-Quill-render (4.3) in this session — those are best validated with the dedicated SQL fixture (T.3.1) and a paste-capable test session.

### Tasks 9.x (PR2 manual smoke)

- ✅ **9.1** Navigated `/` → `/notifications` → `/boards` → board detail → post detail — every navigation triggered exactly the route-specific chunks (verified via `performance.getEntriesByType('resource')` filtering).
- ✅ **9.2 (revised: removed instead of deferred)** Confirmed `replayModuleFetched === false` across 155 modules fetched in the dev session, and zero `@sentry-internal/replay` requests in the prod-preview network panel. The original wording ("confirm a `sentryReplay` chunk loads after first paint") no longer applies because Replay is removed entirely.
- 🔲 **9.3** `dev3000` timeline of `/` cold load — informational, not blocking. Not run in this session; the FCP delta will be visible in Sentry RUM after deploy.

### Screenshots captured (in `/tmp/`)

```
pr2-smoke-01-join.png            /join landing
pr2-smoke-02-login.png           /login form
pr2-smoke-03-forgot.png          /forgot-password
pr2-smoke-04-boards.png          /boards (logged in)
pr2-smoke-05-board-detail.png    /boards/list
pr2-smoke-06-post-detail.png     /board/.../post/...
pr2-smoke-07-edit.png            /board/.../edit/... with Tiptap toolbar visible
pr2-smoke-08-notifications.png   /notifications
```

