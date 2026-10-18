import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import testingLibrary from 'eslint-plugin-testing-library';
import requireSortCompare from './eslint-local-rules/require-sort-compare.js';
import noNewSharedSupabaseFetch from './eslint-local-rules/no-new-shared-supabase-fetch.js';
import enforceFeatureBoundaries from './eslint-local-rules/enforce-feature-boundaries.js';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.config.js',
      '*.config.ts',
      // Supabase-generated schema types (regenerated via `pnpm db:types`); never hand-edited.
      'src/shared/external/database.types.ts',
    ],
  },

  // Base recommended rules
  js.configs.recommended,

  // TypeScript (type-checked for promise rules)
  ...tseslint.configs.recommendedTypeChecked,

  // TypeScript parser options for type-checked rules
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React
  {
    ...react.configs.flat.recommended,
    settings: {
      react: { version: 'detect' },
    },
  },
  react.configs.flat['jsx-runtime'],

  // React Hooks
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Accessibility
  jsxA11y.flatConfigs.recommended,

  // Prettier (must be last among extends — disables formatting rules)
  prettier,

  // Local plugin
  {
    plugins: {
      local: {
        rules: {
          'require-sort-compare': requireSortCompare,
          'no-new-shared-supabase-fetch': noNewSharedSupabaseFetch,
          'enforce-feature-boundaries': enforceFeatureBoundaries,
        },
      },
    },
  },

  // Project rules
  {
    rules: {
      // --- TypeScript ---
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // Disable overly strict rules inherited from recommendedTypeChecked
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',

      // Tier 1: Promise safety (catches real bugs)
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': ['warn', { checksVoidReturn: { attributes: false } }],

      // Tier 2: Type discipline
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // --- React ---
      'react/prop-types': 'off',
      'react/no-array-index-key': 'warn',
      'react/jsx-no-useless-fragment': 'warn',
      'react/self-closing-comp': 'warn',

      // React Hooks
      'react-hooks/exhaustive-deps': 'warn',

      // --- Code quality: catches SonarQube issues at dev time ---
      'no-nested-ternary': 'warn',
      'no-lonely-if': 'warn',
      eqeqeq: ['warn', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-duplicate-imports': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',

      // Tier 1: AI code guardrails
      complexity: ['warn', { max: 10 }],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'no-param-reassign': ['warn', { props: false }],

      // Tier 2: Readability
      'no-else-return': 'warn',
      'prefer-template': 'warn',

      // Tier 3: Sorting safety
      'local/require-sort-compare': 'warn',
      'local/no-new-shared-supabase-fetch': 'error',

      // ADR-0001: Feature tier enforcement (shared < core < app)
      'local/enforce-feature-boundaries': ['error', {
        // Baseline — shrink only, never add. "file -> feature". Every entry is a
        // genuine smell to invert or relocate over time; new violations are blocked.
        baseline: [
          // shared/ reaching into a feature — inject the dependency or move into shared/
          'shared/components/SentryFeedbackDialog.tsx -> user',
          'shared/components/auth/RootRedirect.tsx -> login',
          'shared/hooks/useAuth.tsx -> user',
          'shared/utils/uploadFeedbackScreenshot.ts -> post',
          // app -> app lateral coupling — route through shared/ or a core feature
          'draft/components/DraftsDrawer.tsx -> board',
          'login/components/GoalSection.tsx -> stats',
          'login/components/JoinFormCardForActiveUser.tsx -> board',
          'login/components/JoinFormPageForActiveUser.tsx -> board',
          'login/hooks/useOnboardingSubmit.ts -> board',
          'login/hooks/useUpcomingBoard.ts -> board',
          // core -> app inversion — domain core depending on a derived feature.
          // The post<->stats cluster (author streak/badges) is the top refactor target.
          'comment/components/CommentHeader.tsx -> stats',
          'comment/hooks/useActivity.ts -> stats',
          'post/components/CountupWritingTimer.tsx -> stats',
          'post/components/PostCreationPage.tsx -> draft',
          'post/components/PostDetailPage.tsx -> stats',
          'post/components/PostFreewritingPage.tsx -> stats',
          'post/components/PostUserProfile.tsx -> stats',
          'post/hooks/useBatchPostCardData.ts -> stats',
          'post/hooks/useCompletionMessage.ts -> stats',
          'post/hooks/useCountupTimer.ts -> stats',
          'post/hooks/useCreatePostAction.ts -> draft',
          'post/hooks/usePostCard.ts -> stats',
          'post/hooks/usePostSubmit.ts -> draft',
          'post/utils/batchPostCardDataUtils.ts -> stats',
        ],
      }],
    },
  },

  // Import boundaries. Two zones live in one no-restricted-imports rule because
  // ESLint flat config replaces (not merges) the rule across matching blocks, so a
  // second block would silently drop the first's restrictions on shared files.
  //   1. raw Supabase access + generated types are confined to */external/**.
  //   2. page-routing params (useParams/useSearchParams) go through the
  //      @/shared/navigation chokepoint so the RN port swaps a single module.
  // external/** and shared/navigation/** are the respective boundary zones, exempt
  // below. Existing Supabase violations carry a visible eslint-disable; only new
  // ones are blocked. Exempting navigation/** also lifts the Supabase restrictions
  // there, which is harmless: the routing chokepoint never touches Supabase.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/external/**', 'src/shared/navigation/**'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          {
            // Building a raw client outside external/ would bypass the getSupabaseClient boundary.
            name: '@supabase/supabase-js',
            importNames: ['createClient'],
            message:
              'raw Supabase 클라이언트 생성(createClient)은 shared/external/supabaseClient.ts에서만 합니다. 다른 곳은 external/의 fetch*/read* 함수를 통해 도메인 타입을 받으세요.',
          },
          {
            // Route params are a string | undefined runtime boundary; the chokepoint
            // owns the react-router-dom dependency and offers useRequiredParams.
            name: 'react-router-dom',
            importNames: ['useParams', 'useSearchParams'],
            message:
              'URL 파라미터 접근(useParams/useSearchParams)은 @/shared/navigation 초크포인트를 통해 가져오세요. 필수 파라미터는 useRequiredParams로 받을 수 있습니다.',
          },
        ],
        // Patterns (not exact paths) so both the `@/` alias and relative imports
        // (e.g. `../../shared/external/supabaseClient`) are covered.
        patterns: [
          {
            group: ['**/external/supabaseClient'],
            importNames: ['getSupabaseClient'],
            message:
              'raw Supabase 접근(getSupabaseClient)은 <feature>/external/ 레이어에서만 허용됩니다. hooks/components는 external/의 fetch*/read* 함수를 통해 도메인 타입을 받으세요.',
          },
          {
            group: ['**/external/database.types'],
            message:
              'database.types(Supabase 생성 타입)는 external/ 레이어에서만 import하세요. UI는 도메인 타입만 다룹니다.',
          },
        ],
      }],
    },
  },

  // Boundary JSON parsing goes through the parseJson reader util (narrow with a
  // guard, don't cast). JSON.parse of untrusted strings is confined to that module.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/shared/lib/parseJson.ts', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
        message:
          '신뢰할 수 없는 문자열의 JSON.parse는 shared/lib/parseJson.ts(parseJson/parseJsonUnknown)를 통해 가드로 좁혀 쓰세요.',
      }],
    },
  },
  // Testing Library: fireEvent은 디스패치할 이벤트를 테스트가 직접 고르게 해서, 실제
  // 조작이라면 함께 일어났을 포커스·키다운·pointer 이벤트를 조용히 빠뜨린다. 컴포넌트가
  // 실제로는 동작하지 않는데 테스트만 초록인 상태가 이렇게 만들어진다.
  // 판정이 파일 하나로 끝나고 오탐이 없어 error로 둔다.
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    plugins: { 'testing-library': testingLibrary },
    rules: {
      'testing-library/prefer-user-event': 'error',
    },
  },
);
