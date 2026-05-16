## Review Summary

**Status:** Ready (after iteration 1 revisions)
**Iteration:** 1 of max 2 — second iteration skipped because all Critical findings were addressed by reducing scope rather than adding complexity. Remaining items either accepted as trade-offs or deferred to design.md.

**Reviewers dispatched:**
- `objectives-challenger` (oh-my-claudecode:analyst, Opus)
- `scope-analyst` (oh-my-claudecode:analyst, Opus)

Two of four configured roles were dispatched (per user direction — `alternatives-explorer` and `user-advocate` skipped because the SSR question was already grounded in Sentry data and UX impact for 20 MAU is bounded).

## Findings

### Critical

- **FCP causation is assumed, not proven** *(objectives-challenger)* — the original proposal correlated FCP 4.22s on `/` with bundle size, but never presented bundle stats or main-thread profile. Sentry Replay sync init and Firebase RemoteConfig fetch in `main.tsx` could be the real culprit. Acting before measuring risks landing PR2 with no FCP movement.
  - **Resolution:** Added **Phase 0 (Discovery)** to proposal — `vite-bundle-visualizer` + Lighthouse main-thread breakdown captured before any code change. Phase 0 baseline persists in `verify_report.md` so post-Phase-1+2 deltas are objective.

- **PR ordering is implicit, not enforced** *(scope-analyst)* — loader refactor must precede persistence; if reversed, persister stores nothing useful.
  - **Resolution:** Loader refactor + persistence are **removed from this change entirely** (scope reduction). They are explicitly listed under "Out of Scope" and will be a separate proposal contingent on Phase 0 + Phase 2 measurement. Ordering risk dissolves.

- **Merge conflict with `eliminate-data-fetching-waterfalls`** *(scope-analyst)* — both originally rewrote `boardLoader`.
  - **Resolution:** This change no longer touches loaders. The "Coordination" section in proposal.md states the in-flight change is independent.

### Important

- **Cache persistence speculative for 20 MAU** *(objectives-challenger)* — Quill removal + lazy routes alone may capture 80% of measurable wins.
  - **Resolution:** Persistence deferred. Will only be revisited in a follow-up proposal if Phase 2 measurement shows residual LCP gap on `/notifications` and `/boards`.

- **SSR rejection ignores OG meta tags / social-share previews** *(objectives-challenger)* — a writing community sharing posts to KakaoTalk gets blank previews.
  - **Resolution:** Acknowledged in "Out of Scope" with the recommended narrow solution (bot-user-agent edge worker / prerender). Not addressed in this change but flagged for future.

- **RemoteConfigProvider may be removable entirely after Quill flag is gone** *(objectives-challenger)* — bigger FCP win than route splitting; provider currently blocks app render via `useRemoteConfigReady`.
  - **Resolution:** **Trade-off accepted.** User direction is to keep the provider for future flags; the one flag is removed but the blocking-render behavior persists. If Phase 0 main-thread profile shows RemoteConfig fetch is the dominant blocker, this trade-off should be revisited.

- **Sentry Replay (~50–70KB) should be lazy-loaded after first paint, not just chunked** *(objectives-challenger)*
  - **Resolution:** Folded into Phase 2. `requestIdleCallback` + dynamic `import()` for Replay init in `main.tsx`.

- **Build-SHA buster over-engineered** *(scope-analyst)* — `package.json` version is sufficient.
  - **Resolution:** Moot — persistence is no longer in scope. If revived in the follow-up proposal, the simpler buster will be used.

- **Sign-out race / `onAuthStateChange(SIGNED_OUT)` not addressed** *(scope-analyst)*
  - **Resolution:** Moot for this change (no persistence). Will be a design.md concern in the follow-up proposal.

- **Skeleton LCP regression risk has no measurement gate** *(scope-analyst)*
  - **Resolution:** Moot — Suspense skeletons no longer in scope. Will be a design.md concern in the follow-up proposal.

### Minor

- **5 PRs is ambitious for after-work cycles** *(scope-analyst)* — split into milestones.
  - **Resolution:** Done implicitly by scope reduction — this proposal is now 1 discovery phase + 2 PRs. Follow-up proposal would be a second milestone if measurement justifies it.

- **`cacheTime` 5min → 24h is a large jump** *(scope-analyst)* — staleness risk for notification counts.
  - **Resolution:** Moot here; will be addressed in design.md of the follow-up proposal.

## Key Questions Raised

- What does the bundle visualizer actually show as the heaviest chunks today? **Answer pending Phase 0 execution.**
- After Phase 1 (Quill removal) + Phase 2 (lazy routes + Sentry Replay deferral), what is the projected FCP on `/`? **Will be measured, not predicted.**
- If RemoteConfig fetch turns out to be the dominant render-blocker, do we revisit removing the provider? **Yes — flag for re-evaluation after Phase 0.**
- Are there other active Firebase RemoteConfig flags besides `tiptap_editor_enabled`? **To verify in Phase 1 before flag deletion.**

## Alternatives Considered

- **Full SSR migration (Vite → Next.js / TanStack Start):** Rejected. TTFB is already fine (170–620ms p75); SSR would worsen it. Migration cost (weeks of evenings) is disproportionate to 20 MAU.
- **Bundle splitting only, skip Quill removal:** Rejected. Quill ships ~250KB minified and is dead code at 100% Tiptap rollout — removing it is the single largest deterministic win.
- **Originally-scoped 5-PR change (incl. persistence + Suspense):** Rejected after review. Right approach is to ship the load-bearing wins first, measure, then propose the next layer based on data — not on assumptions.
- **Delete RemoteConfigProvider when removing Quill flag:** Rejected per user direction (provider stays for future flags). May be revisited if Phase 0 shows it as the dominant blocker.

## Accepted Trade-offs

- **No second-iteration parallel review** — first-iteration findings either resolved by scope reduction or deferred to design.md / follow-up proposal. Re-running ~$3 of Opus compute for a second pass would not change scope further.
- **No `alternatives-explorer` or `user-advocate` review** — the SSR-vs-not question was already grounded in concrete Sentry data; UX impact at 20 MAU is bounded; cost-vs-value didn't justify the additional dispatches.
- **`RemoteConfigProvider` continues to block initial render** — if Phase 0 surfaces it as a top blocker, this trade-off is revisitable in a separate change.
- **OG meta tag / social-share preview problem unresolved** — acknowledged in "Out of Scope"; will be a future proposal if community sharing becomes a priority.

## Revision History

- **Round 1 (2026-05-16):** Initial review. Two reviewers (objectives-challenger, scope-analyst) returned `Needs Revision`. Critical findings: FCP causation unproven, PR ordering implicit, merge conflict with in-flight change. Scope reduced from 4 capabilities (Quill removal, route splitting, query persistence, streaming render) to 2 (Quill removal, route splitting + heavy-dep deferral) with an explicit Phase 0 discovery step. Cache persistence and Suspense skeletons moved to "Out of Scope" pending measurement. RemoteConfigProvider removal accepted as deferred trade-off per user direction.
