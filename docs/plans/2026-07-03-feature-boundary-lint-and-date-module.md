# Feature Boundary Lint + Date Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish a feature dependency DAG for `apps/web/src`, enforce it with a custom ESLint rule using a shrink-only baseline, standardize test placement to colocated `.test.ts`, and consolidate date formatting into one module (fixing the `formatDate` name collision).

**Architecture:** Features are assigned layers; runtime imports may only flow from a higher layer to a lower one, `import type` is free at any layer, and `shared/` may not import any feature at runtime. Enforcement is a custom rule in `eslint-local-rules/` (same pattern as `no-new-shared-supabase-fetch`), shipped as `error` with an explicit baseline of `file -> feature` pairs that only shrinks. Five violation clusters get fixed in this plan; three pairs remain in the baseline as documented debt for the data-access-seam refactor (candidate 1).

**Tech Stack:** ESLint 9 flat config, typescript-eslint, ESLint `RuleTester` run via plain `node`, Vitest (web), pnpm monorepo. All commands run from repo root with `mise exec --` prefix (nvm's stale node otherwise shadows the pinned version).

**The layer table (the single source of truth, recorded in ADR-0001 and in the rule):**

| Layer | Features | May import (runtime) |
|---|---|---|
| 1 | donator | shared |
| 2 | user | shared, donator |
| 3 | stats | shared + layers 1–2 |
| 4 | comment, draft | shared + layers 1–3 (not each other) |
| 5 | post | shared + layers 1–4 |
| 6 | board | shared + layers 1–5 |
| 7 | login, notification, preview | shared + layers 1–6 (not each other) |

Type-only imports (`import type`) are allowed in any direction. Test files are exempt. `src/test/` (fixtures/MSW infra) is not a feature.

---

### Task 1: ADR recording the boundary decision

**Files:**
- Create: `docs/adr/0001-feature-dependency-layers.md`

**Step 1: Write the ADR**

```markdown
# ADR-0001: Feature dependency layers enforced by ESLint

Date: 2026-07-03
Status: Accepted

## Context

`apps/web/src` has 10 feature directories with ~90 cross-feature import lines and
three runtime cycles (post↔user, post↔draft-board, user↔login). New code drifts
because no direction is declared or enforced.

## Decision

1. Features are assigned layers. Runtime imports may only flow from a higher layer
   to a lower layer:
   donator(1) < user(2) < stats(3) < comment, draft(4) < post(5) < board(6)
   < login, notification, preview(7).
   Same-layer features may not import each other.
2. `import type` imports are allowed in any direction (types are erased at runtime).
3. `shared/` may not import any feature at runtime.
4. Enforcement: custom rule `local/enforce-feature-boundaries` in `eslint-local-rules/`,
   severity `error` from day one, with a baseline of `file -> feature` exception pairs
   in `eslint.config.js`. The baseline only shrinks; new violations are blocked.

## Rejected alternatives

- **Public-seam barrels (index.ts per feature):** hides internals but does not break
  cycles; ~90 imports rewritten for no directional guarantee.
- **Strict shared-only (features import only shared/):** would move Post/User models
  and PostCard into shared/, turning shared/ into a second domain layer.
- **eslint-plugin-boundaries / import/no-restricted-paths:** less control over the
  type-only exemption, pair-level baseline, and messages than a local rule.

## Known debt (remaining baseline entries)

- `user/hooks/useUserPosts.ts -> post`, `user/api/searchUserPosts.ts -> post`:
  user-page post search needs `mapRowToPost`/`FEED_POST_SELECT`, which cannot move to
  shared/ because they depend on the runtime `PostVisibility` enum in post/model.
  Resolved by the data-access seam refactor (shared post-row mapper).
- `draft/components/DraftsDrawer.tsx -> board`: drawer header displays the board
  title via `useBoardTitle`; PostCreationPage (post, layer 5) cannot fetch it either
  since board is layer 6. Resolved when a shared board-reference read exists.
  (`useBoardTitle` itself is a useState/useEffect fetch that should become a React
  Query hook when touched.)
```

**Step 2: Commit**

```bash
git add docs/adr/0001-feature-dependency-layers.md
git commit -m "docs: 기능 레이어 의존성 ADR 추가"
```

---

### Task 2: `enforce-feature-boundaries` rule — failing tests first

**Files:**
- Create: `eslint-local-rules/enforce-feature-boundaries.test.js`
- Create: `eslint-local-rules/enforce-feature-boundaries.js`

**Step 1: Write the test file**

```js
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import rule from './enforce-feature-boundaries.js';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const src = (feature, file) => `/repo/apps/web/src/${feature}/${file}`;

ruleTester.run('enforce-feature-boundaries', rule, {
  valid: [
    // higher layer -> lower layer
    { code: "import { useBestPosts } from '@/post/hooks/useBestPosts';", filename: src('board', 'components/BestPostCardList.tsx') },
    // type-only import upward is free
    { code: "import type { Post } from '@/post/model/Post';", filename: src('stats', 'utils/writingStatsUtils.ts') },
    // feature -> shared always fine
    { code: "import { cn } from '@/shared/utils/cn';", filename: src('user', 'components/UserPage.tsx') },
    // same feature
    { code: "import { usePostCard } from '@/post/hooks/usePostCard';", filename: src('post', 'components/PostCard.tsx') },
    // test files exempt
    { code: "import { deleteDraft } from '@/draft/utils/draftUtils';", filename: src('post', 'hooks/usePostSubmit.test.ts') },
    // baseline pair exempt
    {
      code: "import { mapRowToPost } from '@/post/api/post';",
      filename: src('user', 'hooks/useUserPosts.ts'),
      options: [{ baseline: ['user/hooks/useUserPosts.ts -> post'] }],
    },
    // non-feature dirs (src/test) ignored
    { code: "import { mapRowToPost } from '@/post/api/post';", filename: '/repo/apps/web/src/test/fixtures/post.ts' },
  ],
  invalid: [
    // lower layer -> higher layer
    {
      code: "import { validatePassword } from '@/login/utils/passwordValidation';",
      filename: src('user', 'components/ChangePasswordPage.tsx'),
      errors: [{ messageId: 'upwardImport' }],
    },
    // same-layer lateral
    {
      code: "import { useDrawer } from '@/comment/hooks/useDrawer';",
      filename: src('draft', 'components/DraftsDrawer.tsx'),
      errors: [{ messageId: 'upwardImport' }],
    },
    // @feature/ alias form also caught
    {
      code: "import { renderCommentBodyHtml } from '@post/web/contentUtils';",
      filename: src('comment', 'components/CommentRow.tsx'),
      errors: [{ messageId: 'upwardImport' }],
    },
    // shared -> feature runtime
    {
      code: "import { ROUTES } from '@/login/constants';",
      filename: '/repo/apps/web/src/shared/auth/supabaseAuth.ts',
      errors: [{ messageId: 'sharedImportsFeature' }],
    },
    // baseline pair does not cover a different target feature
    {
      code: "import { useDrawer } from '@/comment/hooks/useDrawer';",
      filename: src('user', 'hooks/useUserPosts.ts'),
      options: [{ baseline: ['user/hooks/useUserPosts.ts -> post'] }],
      errors: [{ messageId: 'upwardImport' }],
    },
  ],
});

console.log('enforce-feature-boundaries: all RuleTester cases passed');
```

**Step 2: Run to verify it fails**

Run: `mise exec -- node eslint-local-rules/enforce-feature-boundaries.test.js`
Expected: FAIL — cannot resolve `./enforce-feature-boundaries.js`.

**Step 3: Implement the rule**

```js
const LAYERS = {
  donator: 1,
  user: 2,
  stats: 3,
  comment: 4,
  draft: 4,
  post: 5,
  board: 6,
  login: 7,
  notification: 7,
  preview: 7,
};

const SRC_MARKER = 'apps/web/src/';

function segmentAfterSrc(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.indexOf(SRC_MARKER);
  if (idx === -1) return null;
  return normalized.slice(idx + SRC_MARKER.length);
}

function featureOfFile(filePath) {
  const rel = segmentAfterSrc(filePath);
  if (!rel) return null;
  const first = rel.split('/')[0];
  if (first === 'shared') return 'shared';
  return LAYERS[first] ? first : null;
}

function featureOfImport(source, importerDir) {
  const aliasMatch = source.match(/^@\/?([a-z]+)\//);
  if (aliasMatch) {
    const name = aliasMatch[1];
    if (name === 'shared') return 'shared';
    return LAYERS[name] ? name : null;
  }
  if (source.startsWith('.')) {
    const joined = `${importerDir}/${source}`.replace(/\\/g, '/');
    const parts = [];
    for (const seg of joined.split('/')) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return featureOfFile(parts.join('/'));
  }
  return null;
}

function isTypeOnly(node) {
  if (node.importKind === 'type') return true;
  const specifiers = node.specifiers || [];
  return specifiers.length > 0 && specifiers.every((s) => s.importKind === 'type');
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce the feature dependency layers from ADR-0001. Runtime imports must flow ' +
        'from higher layers to lower layers; import type is exempt; shared/ may not ' +
        'import features.',
    },
    messages: {
      upwardImport:
        "'{{from}}' (layer {{fromLayer}}) may not import '{{to}}' (layer {{toLayer}}) at runtime. " +
        'Move the shared code to shared/, or use `import type` if only types are needed. See docs/adr/0001-feature-dependency-layers.md.',
      sharedImportsFeature:
        "shared/ may not import feature '{{to}}' at runtime. Move the imported code into shared/. See docs/adr/0001-feature-dependency-layers.md.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          baseline: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const rel = segmentAfterSrc(filename);
    if (!rel) return {};
    if (/\.test\.|\.integration\./.test(rel)) return {};

    const fromFeature = featureOfFile(filename);
    if (!fromFeature) return {};

    const options = context.options[0] || {};
    const baseline = new Set(options.baseline || []);
    const importerDir = filename.replace(/\\/g, '/').split('/').slice(0, -1).join('/');

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        const toFeature = featureOfImport(source, importerDir);
        if (!toFeature || toFeature === 'shared' || toFeature === fromFeature) return;
        if (isTypeOnly(node)) return;
        if (baseline.has(`${rel} -> ${toFeature}`)) return;

        if (fromFeature === 'shared') {
          context.report({ node, messageId: 'sharedImportsFeature', data: { to: toFeature } });
          return;
        }
        if (LAYERS[toFeature] >= LAYERS[fromFeature]) {
          context.report({
            node,
            messageId: 'upwardImport',
            data: {
              from: fromFeature,
              fromLayer: String(LAYERS[fromFeature]),
              to: toFeature,
              toLayer: String(LAYERS[toFeature]),
            },
          });
        }
      },
    };
  },
};
```

**Step 4: Run tests to verify they pass**

Run: `mise exec -- node eslint-local-rules/enforce-feature-boundaries.test.js`
Expected: `enforce-feature-boundaries: all RuleTester cases passed`, exit 0.

**Step 5: Commit**

```bash
git add eslint-local-rules/enforce-feature-boundaries.js eslint-local-rules/enforce-feature-boundaries.test.js
git commit -m "lint: 기능 경계 규칙 enforce-feature-boundaries 추가"
```

---

### Task 3: Wire the rule into eslint.config.js with the full baseline

**Files:**
- Modify: `eslint.config.js:7-8` (imports), `:64-73` (plugin block), `:133-134` (rules)

**Step 1: Register rule and add config**

Add the import:

```js
import enforceFeatureBoundaries from './eslint-local-rules/enforce-feature-boundaries.js';
```

Add `'enforce-feature-boundaries': enforceFeatureBoundaries,` to the `local` plugin rules map, then in project rules:

```js
'local/enforce-feature-boundaries': ['error', {
  // ADR-0001 baseline — shrink only, never add. Each entry is "file -> feature".
  baseline: [
    'user/components/ChangePasswordPage.tsx -> login',
    'user/components/AddLoginMethodPage.tsx -> login',
    'user/components/UserSettingPage.tsx -> login',
    'shared/auth/supabaseAuth.ts -> login',
    'user/hooks/useUserPosts.ts -> post',
    'user/api/searchUserPosts.ts -> post',
    'draft/components/DraftsDrawer.tsx -> comment',
    'draft/components/DraftsDrawer.tsx -> board',
    'comment/components/CommentRow.tsx -> post',
    'comment/components/ReplyRow.tsx -> post',
  ],
}],
```

**Step 2: Verify lint is clean and the baseline is exact**

Run: `mise exec -- pnpm --filter web lint 2>&1 | grep -c "enforce-feature-boundaries"`
Expected: `0`. If violations appear, they are real imports the grep survey missed — add each to the baseline (with the same shrink-only comment) rather than loosening the rule, and note them for burn-down.

Sanity-check the ratchet works: temporarily delete the `'draft/components/DraftsDrawer.tsx -> comment'` entry, re-run lint, expect exactly 1 error at `DraftsDrawer.tsx:3`; restore the entry.

**Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "lint: 기능 경계 규칙을 baseline과 함께 error로 활성화"
```

---

### Task 4: Burn-down — move `ROUTES` to shared/constants

`ROUTES` (app route paths) lives in `login/constants.ts` but is imported by user pages and `shared/auth/supabaseAuth.ts`. Route paths are app-level facts, not login domain.

**Files:**
- Create: `apps/web/src/shared/constants/routes.ts`
- Modify: `apps/web/src/login/constants.ts` (remove `ROUTES`; keep `REMOTE_CONFIG_KEYS` — it is login-specific)
- Modify all 13 importers of `@/login/constants` found via:
  `grep -rln "from '@/login/constants'" apps/web/src`
  (user: UserSettingPage, AddLoginMethodPage; shared: auth/supabaseAuth; login: LoginPage, ForgotPasswordPage, SetPasswordPage, VerifyEmailPage, JoinDispatcher, IntroCTA, SignupPage, OnboardingPage, hooks/useUpcomingBoard, hooks/useActiveUser)
- Modify: `eslint.config.js` baseline

**Step 1: Move the constant**

Cut the `ROUTES` object (with its JSDoc) from `login/constants.ts` into `shared/constants/routes.ts` as-is. In each importer, change imports of `ROUTES` to `@/shared/constants/routes`; importers that also use `REMOTE_CONFIG_KEYS` keep a second import from `@/login/constants`.

**Step 2: Shrink the baseline**

Remove from `eslint.config.js`:
- `'user/components/UserSettingPage.tsx -> login'`
- `'shared/auth/supabaseAuth.ts -> login'`
- (AddLoginMethodPage still imports form components — its entry stays until Task 5.)

**Step 3: Verify**

Run: `mise exec -- pnpm --filter web lint && mise exec -- pnpm --filter web type-check`
Expected: both pass with no `enforce-feature-boundaries` errors.

**Step 4: Commit**

```bash
git add -A apps/web/src eslint.config.js
git commit -m "refactor(shared): ROUTES 상수를 shared/constants로 이동"
```

---

### Task 5: Burn-down — move the password form module to shared

`user → login` runtime imports: `JoinFormField` (imported as `FormField`), `PasswordRequirements`, `validatePassword`.

**Files:**
- Move: `apps/web/src/login/utils/passwordValidation.ts` + `passwordValidation.test.ts` → `apps/web/src/shared/utils/`
- Move: `apps/web/src/login/components/PasswordRequirements.tsx` → `apps/web/src/shared/components/`
- Move: `apps/web/src/login/components/JoinFormField.tsx` → `apps/web/src/shared/components/FormField.tsx` (rename: it is not join-specific)
- Modify importers (survey first):
  `grep -rln "JoinFormField\|PasswordRequirements\|passwordValidation" apps/web/src`
  (login: ContactMethodTabs, ForgotPasswordPage, JoinFormCardForActiveUser, LoginPage, OnboardingFormFields, SetPasswordPage, SignupPage; user: AddLoginMethodPage, ChangePasswordPage)
- Modify: `eslint.config.js` baseline

**Step 1: `git mv` the three modules, update the component name**

`git mv` each file, rename the component/export `JoinFormField` → `FormField` (its default export is already used as `FormField` at call sites), update all import paths.

**Step 2: Shrink the baseline**

Remove:
- `'user/components/ChangePasswordPage.tsx -> login'`
- `'user/components/AddLoginMethodPage.tsx -> login'`

**Step 3: Verify**

Run: `mise exec -- pnpm --filter web lint && mise exec -- pnpm --filter web type-check && mise exec -- pnpm --filter web test:run`
Expected: all pass (passwordValidation tests now run from `shared/utils/`).

**Step 4: Commit**

```bash
git add -A apps/web/src eslint.config.js
git commit -m "refactor(shared): 비밀번호 폼 모듈(FormField, PasswordRequirements, passwordValidation)을 shared로 이동"
```

---

### Task 6: Burn-down — move `useDrawer` to shared/hooks

`useDrawer` is a generic open/close drawer state hook that lives in `comment/hooks/` but is used only by `draft/components/DraftsDrawer.tsx`.

**Files:**
- Move: `apps/web/src/comment/hooks/useDrawer.ts` → `apps/web/src/shared/hooks/useDrawer.ts`
- Modify: `apps/web/src/draft/components/DraftsDrawer.tsx:3`
- Modify: `eslint.config.js` baseline — remove `'draft/components/DraftsDrawer.tsx -> comment'`

**Step 1: `git mv`, update the one import, shrink baseline**

**Step 2: Verify**

Run: `mise exec -- pnpm --filter web lint && mise exec -- pnpm --filter web type-check`
Expected: pass.

**Step 3: Commit**

```bash
git add -A apps/web/src eslint.config.js
git commit -m "refactor(shared): 범용 useDrawer 훅을 shared/hooks로 이동"
```

---

### Task 7: Burn-down — move the Content Rendering module to shared

CONTEXT.md names the Content Rendering module as the sanitization seam for Post body, Comment body, and Post preview. It lives in `post/web/`, forcing `comment → post` runtime imports.

**Files:**
- Move: `apps/web/src/post/web/contentUtils.ts` + `contentUtils.test.ts` → `apps/web/src/shared/content/`
- Move: `apps/web/src/post/web/sanitizeHtml.ts` + `sanitizeHtml.test.ts` → destination depends on Step 1
- Move: `apps/web/src/post/web/ImageUtils.ts` + `ImageUtils.test.ts` → `apps/web/src/post/utils/`
- Delete: `apps/web/src/post/web/` (empty afterwards)
- Modify importers (survey: `grep -rln "post/web/" apps/web/src`) — known: comment/CommentRow, comment/ReplyRow, preview/PreviewCommentList, plus post-internal callers
- Modify: `eslint.config.js` baseline

**Step 1: Check the dependency between the two modules**

Run: `grep -n "sanitizeHtml\|from '\./" apps/web/src/post/web/contentUtils.ts`
- If `contentUtils` imports `sanitizeHtml` → both move to `shared/content/`.
- If not, and `sanitizeHtml`'s importers are post-only → `sanitizeHtml` goes to `post/utils/` instead.

**Step 2: `git mv` accordingly, update all import paths**

**Step 3: Shrink the baseline**

Remove:
- `'comment/components/CommentRow.tsx -> post'`
- `'comment/components/ReplyRow.tsx -> post'`

**Step 4: Verify**

Run: `mise exec -- pnpm --filter web lint && mise exec -- pnpm --filter web type-check && mise exec -- pnpm --filter web test:run`
Expected: all pass. The moved tests run from their new location.

**Step 5: Update CONTEXT.md**

In the **Post body** / **Comment body** / **Post preview** entries, no wording change is needed (they already say "Content Rendering module"), but append a location note to the glossary intro if absent: the Content Rendering module lives at `shared/content/`.

**Step 6: Commit**

```bash
git add -A apps/web/src eslint.config.js CONTEXT.md
git commit -m "refactor(shared): Content Rendering 모듈을 post/web에서 shared/content로 이동"
```

---

### Task 8: Test placement — colocate all `__tests__/` and `test/` dir tests

Standard: `foo.test.ts` sits next to `foo.ts`. `src/test/` (setup/fixtures/MSW infra) is exempt and stays.

**Files (each moved one directory up, next to its subject):**
- `apps/web/src/post/utils/__tests__/*` → `apps/web/src/post/utils/`
- `apps/web/src/post/hooks/__tests__/*` → `apps/web/src/post/hooks/`
- `apps/web/src/post/api/__tests__/*` → `apps/web/src/post/api/`
- `apps/web/src/board/components/test/*` → `apps/web/src/board/components/`
- `apps/web/src/notification/components/__tests__/*` → `apps/web/src/notification/components/`
- `apps/web/src/user/components/__tests__/*` → `apps/web/src/user/components/`
- `apps/web/src/shared/hooks/__tests__/*` → `apps/web/src/shared/hooks/`
- `apps/web/src/shared/api/__tests__/*` → `apps/web/src/shared/api/`
- `apps/web/src/stats/utils/test/*` → `apps/web/src/stats/utils/`

**Step 1: `git mv` each directory's files up one level, delete the empty dirs**

**Step 2: Fix relative imports inside the moved files**

Imports like `../foo` become `./foo`; `../../shared/...` loses one `..`. Path-alias imports (`@/...`) need no change. Do this per directory, guided by type-check errors.

**Step 3: Verify**

Run: `mise exec -- pnpm --filter web type-check && mise exec -- pnpm --filter web test:run`
Expected: same test count as before the move, all passing. Compare with a pre-move `test:run` count if unsure.

**Step 4: Commit**

```bash
git add -A apps/web/src
git commit -m "test: 테스트 파일을 대상 파일 옆으로 콜로케이션 통일"
```

---

### Task 9: Lint rule — `colocate-test-files`

Blocks new `__tests__/` or `feature/**/test/` directories from reappearing.

**Files:**
- Create: `eslint-local-rules/colocate-test-files.js`
- Create: `eslint-local-rules/colocate-test-files.test.js`
- Modify: `eslint.config.js` (register + enable as `error`)

**Step 1: Write the failing test**

```js
import { RuleTester } from 'eslint';
import rule from './colocate-test-files.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('colocate-test-files', rule, {
  valid: [
    { code: 'export {};', filename: '/repo/apps/web/src/post/utils/foo.test.ts' },
    { code: 'export {};', filename: '/repo/apps/web/src/test/fixtures/post.ts' },
    { code: 'export {};', filename: '/repo/apps/web/src/post/utils/foo.ts' },
  ],
  invalid: [
    {
      code: 'export {};',
      filename: '/repo/apps/web/src/post/utils/__tests__/foo.test.ts',
      errors: [{ messageId: 'nestedTestDir' }],
    },
    {
      code: 'export {};',
      filename: '/repo/apps/web/src/stats/utils/test/foo.test.ts',
      errors: [{ messageId: 'nestedTestDir' }],
    },
  ],
});

console.log('colocate-test-files: all RuleTester cases passed');
```

**Step 2: Run to verify it fails** — `mise exec -- node eslint-local-rules/colocate-test-files.test.js` → module not found.

**Step 3: Implement**

```js
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Test files must sit next to the file they test (foo.test.ts beside foo.ts). ' +
        'No __tests__/ or nested test/ directories inside apps/web/src features. ' +
        'src/test/ (fixtures, setup, MSW) is exempt.',
    },
    messages: {
      nestedTestDir:
        'Place this test file next to its subject (foo.test.ts beside foo.ts), not in a __tests__/ or test/ directory.',
    },
    schema: [],
  },
  create(context) {
    const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
    const idx = filename.indexOf('apps/web/src/');
    if (idx === -1) return {};
    const rel = filename.slice(idx + 'apps/web/src/'.length);
    if (rel.startsWith('test/')) return {};
    if (/(^|\/)(__tests__|test)\//.test(rel)) {
      return {
        Program(node) {
          context.report({ node, messageId: 'nestedTestDir' });
        },
      };
    }
    return {};
  },
};
```

**Step 4: Run tests** — expect pass. Then register in `eslint.config.js` (`'local/colocate-test-files': 'error'`) and run `mise exec -- pnpm --filter web lint` — expect clean (Task 8 already emptied the dirs).

**Step 5: Commit**

```bash
git add eslint-local-rules/colocate-test-files.js eslint-local-rules/colocate-test-files.test.js eslint.config.js
git commit -m "lint: 테스트 콜로케이션 규칙 colocate-test-files 추가"
```

---

### Task 10: Date module — fix the `formatDate` name collision

Two exported `formatDate` functions exist: `shared/utils/dateUtils.ts` (returns `"YYYY.MM.DD"` string) and `post/utils/dateFormat.ts` (returns `{ dateFolder, timePrefix }` for storage paths). Auto-import picks either silently.

**Files:**
- Modify: `apps/web/src/post/utils/dateFormat.ts` — rename export `formatDate` → `formatStorageDateParts` (keep the file and its DOM-free JSDoc rationale)
- Modify: consumers found via `grep -rln "post/utils/dateFormat" apps/web/src`

**Step 1: Rename, update consumers, verify no stale references**

Run: `grep -rn "formatDate" apps/web/src/post/ | grep -v dateUtils` — every remaining hit should be `formatStorageDateParts` or an import of the shared `formatDate`.

**Step 2: Verify** — `mise exec -- pnpm --filter web type-check && mise exec -- pnpm --filter web test:run`

**Step 3: Commit**

```bash
git add -A apps/web/src
git commit -m "refactor(post): formatDate 이름 충돌 해소 (formatStorageDateParts로 개명)"
```

---

### Task 11: Date module — consolidate display formatting into dateUtils

Every `toLocaleDateString`/`toLocaleString`/`Intl.DateTimeFormat` call moves into `shared/utils/dateUtils.ts` as a named formatter. **Behavior-preserving relocation only** — keep each site's exact output format; do not unify formats in this task.

**Files:**
- Modify: `apps/web/src/shared/utils/dateUtils.ts` (add named formatters)
- Modify (the six call sites):
  - `apps/web/src/draft/utils/draftUtils.ts:97-104` — move `formatDraftDate` body into dateUtils, re-export or import
  - `apps/web/src/board/utils/boardUtils.ts:113-118` — move `formatStartDate` into dateUtils; update its importers (login/JoinFormCardForActiveUser and any board callers)
  - `apps/web/src/login/utils/onboardingDerived.ts:27-29` — replace inline call with the dateUtils formatter matching its format
  - `apps/web/src/login/components/CohortConfirmCard.tsx:18-25` — same
  - `apps/web/src/stats/components/ContributionItem.tsx:37-50` — extract to a named dateUtils formatter preserving the tooltip format
  - `apps/web/src/notification/components/NotificationItem.tsx:41` — extract the `toLocaleString` call to a named formatter

**Step 1: For each site — write/extend a dateUtils unit test capturing the current output, move the logic, point the caller at it**

dateUtils already has colocated tests (or add `shared/utils/dateUtils.test.ts` cases). Fixed-date inputs, exact expected strings, per the @testing skill (pure functions, output-based).

**Step 2: Verify** — `mise exec -- pnpm --filter web lint && mise exec -- pnpm --filter web type-check && mise exec -- pnpm --filter web test:run`

**Step 3: Grep for stragglers**

Run: `grep -rn "toLocaleDateString\|toLocaleTimeString\|Intl.DateTimeFormat" apps/web/src --include="*.ts" --include="*.tsx" | grep -v "dateUtils\|\.test\."`
Expected: empty. (`toLocaleString` hits on numbers are fine — the lint rule in Task 12 targets it too, so convert any date usage now; number usages get an eslint-disable with reason or `Intl.NumberFormat`.)

**Step 4: Commit**

```bash
git add -A apps/web/src
git commit -m "refactor(shared): 흩어진 날짜 포맷팅을 dateUtils 모듈로 통합"
```

---

### Task 12: Lint rule — `no-inline-date-formatting`

**Files:**
- Create: `eslint-local-rules/no-inline-date-formatting.js`
- Create: `eslint-local-rules/no-inline-date-formatting.test.js`
- Modify: `eslint.config.js`

**Step 1: Write the failing test**

```js
import { RuleTester } from 'eslint';
import rule from './no-inline-date-formatting.js';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-inline-date-formatting', rule, {
  valid: [
    { code: 'd.toLocaleDateString();', filename: '/repo/apps/web/src/shared/utils/dateUtils.ts' },
    { code: 'd.toLocaleDateString();', filename: '/repo/apps/web/src/shared/utils/dateUtils.test.ts' },
    { code: 'formatDateToKorean(d);', filename: '/repo/apps/web/src/post/components/PostCard.tsx' },
  ],
  invalid: [
    {
      code: 'd.toLocaleDateString("ko-KR");',
      filename: '/repo/apps/web/src/stats/components/ContributionItem.tsx',
      errors: [{ messageId: 'inlineDateFormatting' }],
    },
    {
      code: 'new Intl.DateTimeFormat("ko-KR").format(d);',
      filename: '/repo/apps/web/src/draft/utils/draftUtils.ts',
      errors: [{ messageId: 'inlineDateFormatting' }],
    },
  ],
});

console.log('no-inline-date-formatting: all RuleTester cases passed');
```

**Step 2: Run to verify it fails**, then implement:

```js
const BANNED_METHODS = new Set(['toLocaleDateString', 'toLocaleTimeString', 'toLocaleString']);

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Date display formatting must live in shared/utils/dateUtils.ts. Components and ' +
        'feature utils call named formatters instead of toLocale*/Intl.DateTimeFormat inline.',
    },
    messages: {
      inlineDateFormatting:
        'Format dates via a named formatter in shared/utils/dateUtils.ts, not inline {{api}}.',
    },
    schema: [],
  },
  create(context) {
    const filename = (context.filename || context.getFilename()).replace(/\\/g, '/');
    if (!filename.includes('apps/web/src/')) return {};
    if (filename.includes('shared/utils/dateUtils')) return {};
    if (/\.test\.|\.integration\./.test(filename)) return {};

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          BANNED_METHODS.has(callee.property.name)
        ) {
          context.report({
            node,
            messageId: 'inlineDateFormatting',
            data: { api: `.${callee.property.name}()` },
          });
        }
      },
      NewExpression(node) {
        const callee = node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Intl' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'DateTimeFormat'
        ) {
          context.report({ node, messageId: 'inlineDateFormatting', data: { api: 'Intl.DateTimeFormat' } });
        }
      },
    };
  },
};
```

**Step 3: Run rule tests, register in eslint.config.js (`'local/no-inline-date-formatting': 'error'`), run full lint**

Run: `mise exec -- node eslint-local-rules/no-inline-date-formatting.test.js && mise exec -- pnpm --filter web lint`
Expected: rule tests pass; lint clean (Task 11 removed all inline sites). If a `toLocaleString` on a number surfaces, switch it to `Intl.NumberFormat`... which is not banned — or add a `// eslint-disable-next-line local/no-inline-date-formatting -- number formatting` with reason.

**Step 4: Commit**

```bash
git add eslint-local-rules/no-inline-date-formatting.js eslint-local-rules/no-inline-date-formatting.test.js eslint.config.js
git commit -m "lint: 인라인 날짜 포맷팅 금지 규칙 추가"
```

---

### Task 13: Template tidy — constants and user/search

**Files:**
- Move: `apps/web/src/post/constants/typography.ts` → merge into `apps/web/src/post/constants.ts` (feature-root `constants.ts` is the standard, matching login and stats); delete `post/constants/`
- Inspect: `apps/web/src/user/search/` — move its files into the standard dirs (`user/components/`, `user/hooks/`, `user/utils/` by kind); delete `user/search/`
- Modify: importers of both (grep `post/constants/typography` and `user/search/`)

**Step 1: Move, update imports**

**Step 2: Verify** — `mise exec -- pnpm --filter web lint && mise exec -- pnpm --filter web type-check && mise exec -- pnpm --filter web test:run`

**Step 3: Commit**

```bash
git add -A apps/web/src
git commit -m "refactor: 상수 위치와 user/search 디렉터리를 표준 구조로 정리"
```

---

### Task 14: Document the conventions in AGENTS.md + final verification

**Files:**
- Modify: `AGENTS.md` — in the Monorepo Structure section, add the layer table from ADR-0001 (facts only: layers, free-types exemption, baseline location), the colocated-test convention, and one line: date display formatting lives in `shared/utils/dateUtils.ts`; static data may live in `<feature>/data/`; feature constants live in `<feature>/constants.ts`.

**Step 1: Edit AGENTS.md**

**Step 2: Full verification sweep**

Run, each expected clean/passing:
```bash
mise exec -- pnpm --filter web lint
mise exec -- pnpm --filter web type-check
mise exec -- pnpm --filter web test:run
mise exec -- node eslint-local-rules/enforce-feature-boundaries.test.js
mise exec -- node eslint-local-rules/colocate-test-files.test.js
mise exec -- node eslint-local-rules/no-inline-date-formatting.test.js
```

Confirm the final baseline in `eslint.config.js` is exactly the 3 documented-debt pairs:
`user/hooks/useUserPosts.ts -> post`, `user/api/searchUserPosts.ts -> post`, `draft/components/DraftsDrawer.tsx -> board`.

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: AGENTS.md에 기능 레이어와 컨벤션 명시"
```

---

## Out of scope (deliberately)

- Fixing the 3 remaining baseline pairs — owned by the data-access seam refactor (candidate 1), which will design the shared post-row read and a board-reference read.
- Converting `useBoardTitle` to React Query — noted in ADR-0001, do when touched.
- API error-handling standardization, React Query cache profiles, page scaffold, status module — candidates 1–4, separate plans.
