## Why

Sentry shows the web app's most-trafficked routes are slow:

| Route | Visits | FCP p75 | LCP p75 | Likely bottleneck |
|---|---|---|---|---|
| `/` | 408 | 4.22s | 6.01s | Initial bundle ships entire app |
| `/board/*/post/*` | 73 | 4.85s | 5.31s | Bundle + Quill editor (deprecated) |
| `/notifications` | 194 | 1.73s | 3.01s | Post-paint data fetching |
| `/boards` | 70 | 1.66s | 3.71s | Same |
| `/user` baseline | 28 | 1.02s | 1.23s | Proves the app *can* be fast |

TTFB is 170–620ms (fine), so SSR is the wrong tool — it would worsen TTFB and demands a Vite → Next.js / TanStack Start migration that is weeks of work against a 20-MAU traffic floor.

**Scope discipline:** the proposal originally bundled cache persistence and Suspense refactors as well, but reviewer feedback flagged those as premature optimization for 20 MAU before measuring whether bundle wins alone solve the problem. **This change targets only the load-bearing wins** (Quill removal, route splitting, heavy-dep deferral) and a discovery phase that proves the diagnosis before committing further. A follow-up proposal will be filed if and only if Phase 0 + Phase 1 measurements show residual headroom.

## What Changes

**Phase 0 — Discovery (no code change):**
- Run `pnpx vite-bundle-visualizer` on production build; capture per-chunk sizes and the top 10 heaviest dependencies
- Capture Lighthouse main-thread breakdown for `/` on a throttled 3G + slow CPU profile to confirm bundle vs. blocking-script attribution
- Document baseline FCP / LCP / total bundle KB in `verify_report.md` so post-Phase-1 deltas are measurable

**Phase 1 — Quill removal:**
- **BREAKING** Remove `react-quill-new` dep, `PostTextEditor.tsx`, Quill-specific paths in `useImageUpload.ts`, and the `tiptap_editor_enabled` flag from `RemoteConfigContext.tsx`
- Simplify `PostEditor.tsx` to render Tiptap directly (drop the `forceEditor` prop and `lockedEditorRef` switching)
- **Preserve** `convertQuillBulletLists` and DOMPurify pipeline in `contentUtils.ts` — historical posts in the DB still contain Quill HTML and must render correctly
- Supersedes `openspec/changes/remove-tiptap-dead-code/` (which proposed the inverse decision before Tiptap rolled to 100%)
- Note: this proposal keeps `RemoteConfigProvider` itself — only the one flag is removed; the provider continues to serve future flags

**Phase 2 — Route code-splitting + heavy-dep deferral:**
- Convert every non-critical-path route in `router.tsx` from eager imports to React Router `lazy:` chunks; co-lazy each route's loader (so Supabase query code doesn't ship with the initial bundle)
- Critical-path stays eager: `RootLayout`, `RootRedirect`, `ErrorBoundary`, `BottomNavigatorLayout`, `LoginPage`, `PrivateRoutes`/`PublicRoutes` guards
- Update `vite.config.ts` `manualChunks`: drop the stale `firebase/firestore` entry; add explicit chunks for heavy deps surfaced by Phase 0 (likely Sentry Replay, recharts if used by Stats, react-markdown); lower `chunkSizeWarningLimit` from 1000 to 500
- Lazy-load **Sentry Replay** integration *after first paint* using `requestIdleCallback` + dynamic `import()` (it is currently sync-loaded in `main.tsx` and ~50–70KB gzipped)

## Capabilities

### New Capabilities

- `quill-removal`: Scope of Quill editor code + dependency removal, with explicit preservation of legacy-content readers
- `route-code-splitting`: Lazy-load every non-critical-path route via React Router `lazy:`; defines which routes stay eager and how heavy deps (Sentry Replay) are deferred to post-first-paint

### Modified Capabilities

(none — no existing specs in `openspec/specs/`)

## Impact

**Code:**
- `apps/web/src/router.tsx` — every page import flips to `lazy:` block (except critical-path)
- `apps/web/vite.config.ts` — `manualChunks` rewrite, lower warning limit
- `apps/web/src/main.tsx` — defer Sentry Replay init to post-first-paint
- `apps/web/src/post/components/PostTextEditor.tsx` — deleted
- `apps/web/src/post/components/PostEditor.tsx` — switching logic removed; renders Tiptap directly
- `apps/web/src/post/hooks/useImageUpload.ts` — Quill-specific paths deleted
- `apps/web/src/post/hooks/__tests__/useImageUpload.test.ts` — Quill test cases removed
- `apps/web/src/test/EditorTestPage.tsx` — Quill testing branches stripped
- `apps/web/src/shared/contexts/RemoteConfigContext.tsx` — only `tiptap_editor_enabled` flag entry removed; provider intact

**Dependencies:**
- Remove: `react-quill-new`

**Coordination:**
- `openspec/changes/remove-tiptap-dead-code/` should be archived as superseded
- `openspec/changes/eliminate-data-fetching-waterfalls/` is in-flight (Phases 1–2 done, 3–4 open). This change does **not** touch loaders; no merge conflict expected
- Phase 0 measurements feed a future proposal that may revisit React Query persistence + Suspense skeletons *only if data justifies them*

## Out of Scope (Acknowledged)

- **React Query cache persistence + Suspense skeletons** — deferred until Phase 0 + Phase 2 measurements confirm residual LCP gap. Will be a separate proposal if needed
- **OG meta tags / social-share previews** — SPA cannot render bot-friendly previews. Real concern for a writing community sharing posts on KakaoTalk; needs a narrow prerender solution (e.g., bot user-agent edge worker) but is out of scope here
- **Migrating to TanStack Router or any SSR framework** — rejected per Sentry diagnosis; cost ≫ benefit at 20 MAU
- **Removing `RemoteConfigProvider` entirely** — even with Quill flag gone, the provider stays for future flags
