import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';
import requireSortCompare from './eslint-local-rules/require-sort-compare.js';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'functions/**',
      'supabase/**',
      'scripts/**',
      '*.config.js',
      '*.config.ts',
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
    },
  },
);
