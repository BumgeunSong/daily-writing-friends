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
