# Visual-gate MVP — running results

Experiment spec: `docs/experiments/2026-08-09-visual-regression-gate-mvp.md`
Subject feature: mention input (PR3/PR4) — swaps the shared `CommentInput`/`ReplyInput` from a `<Textarea>` to a TipTap mention editor.

## 1. One-line conclusion (provisional)
Gate loop runs in **~3.8s for 4 environments** with **zero tracked-file changes** and offline rendering. Cheap enough to keep on; open question is B-layer signal quality once the real UI swap lands.

## 2. Isolation method
- **Chosen:** harness route (dev-only HTML entry inside apps/web) + a single fake `getSupabaseClient` alias. NOT the full PostgREST fake yet (deferred per "start harness, escalate if needed").
- **§7 starred finding — boundary width:** the isolation seam is **ONE file** (`shared/external/supabaseClient.ts`), not the many `external/` API functions. Every direct Supabase call — data AND auth (`useAuth`, `supabaseAuth`, `authUtils`) — funnels through `getSupabaseClient()`. No stray `createClient`. So one alias neutralizes the whole backend.
- **Files written for isolation (5):**
  - `src/shared/external/__fixtures__/supabaseClient.ts` (auth-only fake + no-op chainable `.from`; re-exports real pure helpers)
  - `visual-gate/index.html`, `visual-gate/main.tsx`, `visual-gate/Harness.tsx` (harness, real providers + global CSS)
  - `visual-gate/vite.gate.config.ts` (root=apps/web to inherit tailwind/postcss; specific alias before generic `@`)
- **Runner files (2):** `gate.mjs` (capture + A-layer), `diff.mjs` (B-layer).
- **Tracked-file changes: 0.** All gate paths added to `.git/info/exclude`.

## 3. Chosen feature — why
Mention input (PR3): swaps a **shared** component used on the post-detail screen (comments + replies), so side-effects are plausible; spans multiple commits (list → editor → swap). Meets §5 criteria (real UI change, shared surface, multi-commit).

## 4. Time measurements
| step | measured |
|---|---|
| isolation setup (fixture + harness + config) | 5 files (fake client is the only non-trivial one) |
| dev server boot (`vite --config visual-gate/vite.gate.config.ts`) | **238 ms** ready; stays resident |
| full capture, 4 envs (E0/E1/E2/E4), cold chromium launch | **3.76 s** |
| A-layer (in-page) | negligible (part of capture) |
| B-layer diff (per env) | TBD once after-capture exists |
| interpretation round-trip | TBD |

Threshold check: §6 says 30s usable / 2min people-turn-it-off. Currently **3.8s** — comfortably usable. (Warm chromium / resident context would cut further.)

## 5. What the gate did — per commit
- **before (CommentInput = textarea):** 8 el, **0 A-layer violations**, 0 errors × 4 envs. Baseline saved.
- **commit: add MentionableInput/MentionList (A-layer on new UI):** the new editor renders 10 el, **0 A-layer violations** across E0/E1/E2/E4. Correct — no overflow at 320px, no off-viewport controls, no clipping. This is the layer §2② says is the only one that works with no baseline; it did.
- **commit: swap CommentInput textarea→editor (B-layer diff, E0+E1):**
  - `removed 6` (textarea subtree) / `added 9` (ProseMirror editor subtree) → the swap, localized to the input.
  - `changed 2`: container **h 122→104**, inner **h 90→72** (editor 18px shorter than `rows=3`).
  - **0 A-layer violations** — swap introduced no invariant breaks.
  - Interpretation (§2④, via `reports/request.json`→`verdict.json`): 2 `expected`, **1 `unplanned`** (the 18px height shrink — benign, `min-h-[72px]` vs textarea rows=3), **0 `unexplained`**, no human escalation.
  - **Verdict on this signal:** actionable and correct. The gate localized the change to the input, flagged a real unintended geometry delta (height), and did NOT drown it in the ancestor-shift noise the doc warns about (gap-based keys held). No false positives.
- **commit: gate→fix→re-verify loop:** bumped editor `min-h-[72px]`→`min-h-[90px]` to match the old textarea. Re-ran B-layer: `changed 2 → changed 0`. **The gate closed its own loop** — flagged an unplanned delta, and confirmed the fix removed it. The residual `added/removed` is the inherent subtree swap (not a regression).
- **commit: reply side swap (same fix shared):** B-layer on `replyInput` reproduced the *identical* signal (h 122→104, 6 removed / 9 added, 0 A-layer violations) before the parity fix — **deterministic across the parallel component**. `matched` was 1 vs comment's 2 because ReplyInput lacks CommentInput's outer `space-y-4` wrapper; the gate correctly reflects that structural difference.

## 6. Unexpected problems so far
- `.git` is a **file, not a dir** in a worktree → `.git/info/exclude` must be resolved via `git rev-parse --git-common-dir` (lands in the shared gitdir, applies to all worktrees).
- The Explore agent tasked with mapping the external boundary **stalled at 600s** and returned nothing usable; doing the greps directly took ~2 min. (Meta: agent flakiness, not a gate problem.)
- **TipTap does not mount under jsdom** without `ResizeObserver` AND `IntersectionObserver` stubs (Placeholder extension's viewport tracking). Both needed; error surfaced one at a time. This is the concrete cost of the plan's "jsdom can't fully do TipTap" warning — mountable with 2 stubs, but typing/IME still out of reach.
- **`diff.mjs` naming is too rigid.** It hard-codes `before-<env>`/`after-<env>`, so exercising a second component (reply) meant copying labels over the comment baseline — clobbering it. A real gate needs per-component baseline namespacing. Logged as fix #1 below.
- The **empty-editor placeholder does not show** in the harness: TipTap Placeholder renders via CSS `.is-editor-empty::before`, and the harness imports global CSS but the project may not define that rule. The gate can't see `::before` text anyway, so this is invisible to B-layer — a known blind spot.

## 7. Not built yet / deferred
- Full PostgREST fake + row fixtures for the real `PostDetailPage` (8 tables). Deferred; harness suffices for the input component. Escalate only if the harness misses a real defect.
- B-layer before/after diff not yet exercised (needs the after-capture).
- Interpretation step (`request.json`/`verdict.json`) not yet wired.
- §7 open items still untested: text-200%, standalone/safe-area, non-deterministic content, element→file:line.

## 8. Next three fixes (priority)
1. **Per-component baseline namespacing in `diff.mjs`** (currently clobbers across components).
2. **F1 extreme-length fixture** — a very long mention chip / username at 320px, to make the gate *catch* an overflow (so far every A-layer run is a clean pass; need a positive catch to trust it).
3. **Resident browser context** — reuse one chromium across before/after instead of cold-launching (would cut the 3.8–5.5s further, toward sub-second per capture).

## 9. Verdict
**Keep it on — with caveats.** For this feature it earned its place: it caught a real unplanned 18px geometry change on a shared component, closed its own fix loop (`changed 2 → 0`), reproduced deterministically on the parallel reply component, and produced zero false positives — all in <6s with zero tracked-file changes. The A-layer working on brand-new UI (no baseline) is the standout: it validated the new editor across dark/320/1280 for free.

**What would make me trust it more:** every A-layer run so far is a clean *pass*, which is reassuring but unproven — I need one deliberate defect (F1 overflow) to confirm it *catches*, not just *passes*. And its blind spots are real: no `::before`/placeholder, no typing/IME (browser-only), and B-layer noise from the inherent subtree swap (`added/removed`) isn't separated from geometry changes yet. As an MVP it clears the bar the spec set (30s → actual <6s). I'd leave it running for UI-touching commits and skip it for pure logic/refactor commits.
