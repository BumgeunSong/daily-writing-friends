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
    // app -> core
    { code: "import { useBestPosts } from '@/post/hooks/useBestPosts';", filename: src('board', 'components/BestPostCardList.tsx') },
    // core <-> core: cohesive domain, both directions allowed
    { code: "import { useUser } from '@/user/hooks/useUser';", filename: src('post', 'hooks/usePostCard.ts') },
    { code: "import { mapRowToPost } from '@/post/api/post';", filename: src('user', 'hooks/useUserPosts.ts') },
    // type-only import in any direction is free
    { code: "import type { Post } from '@/post/model/Post';", filename: src('stats', 'utils/writingStatsUtils.ts') },
    // feature -> shared always fine
    { code: "import { cn } from '@/shared/utils/cn';", filename: src('user', 'components/UserPage.tsx') },
    // same feature
    { code: "import { usePostCard } from '@/post/hooks/usePostCard';", filename: src('post', 'components/PostCard.tsx') },
    // test files exempt
    { code: "import { fetchBoardTitle } from '@/board/utils/boardUtils';", filename: src('draft', 'components/DraftsDrawer.test.tsx') },
    // baseline pair exempt
    {
      code: "import { usePostingStreak } from '@/stats/hooks/usePostingStreak';",
      filename: src('post', 'hooks/usePostCard.ts'),
      options: [{ baseline: ['post/hooks/usePostCard.ts -> stats'] }],
    },
    // non-feature dirs (src/test) ignored
    { code: "import { mapRowToPost } from '@/post/api/post';", filename: '/repo/apps/web/src/test/fixtures/post.ts' },
  ],
  invalid: [
    // shared -> feature
    {
      code: "import { ROUTES } from '@/login/constants';",
      filename: '/repo/apps/web/src/shared/auth/supabaseAuth.ts',
      errors: [{ messageId: 'sharedImportsFeature' }],
    },
    // core -> app: inversion smell (post is core, stats is app)
    {
      code: "import { usePostingStreak } from '@/stats/hooks/usePostingStreak';",
      filename: src('post', 'hooks/usePostCard.ts'),
      errors: [{ messageId: 'coreImportsApp' }],
    },
    // app -> app: peers may not import each other (draft and board are both app)
    {
      code: "import { fetchBoardTitle } from '@/board/utils/boardUtils';",
      filename: src('draft', 'components/DraftsDrawer.tsx'),
      errors: [{ messageId: 'crossAppFeature' }],
    },
    // @feature/ alias form also caught (login and board are both app)
    {
      code: "import * as boardUtils from '@board/utils/boardUtils';",
      filename: src('login', 'hooks/useUpcomingBoard.ts'),
      errors: [{ messageId: 'crossAppFeature' }],
    },
    // baseline pair does not cover a different target
    {
      code: "import { deleteDraft } from '@/draft/utils/draftUtils';",
      filename: src('post', 'hooks/usePostSubmit.ts'),
      options: [{ baseline: ['post/hooks/usePostCard.ts -> stats'] }],
      errors: [{ messageId: 'coreImportsApp' }],
    },
  ],
});

console.log('enforce-feature-boundaries: all RuleTester cases passed');
