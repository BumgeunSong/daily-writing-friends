import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

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

  // TypeScript
  ...tseslint.configs.recommended,

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

  // Project rules
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // React
      'react/prop-types': 'off',
      'react/no-array-index-key': 'warn',
      'react/jsx-no-useless-fragment': 'warn',
      'react/self-closing-comp': 'warn',

      // React Hooks
      'react-hooks/exhaustive-deps': 'warn',

      // Code quality (catches SonarQube MAJOR issues at dev time)
      'no-nested-ternary': 'warn',
      'no-lonely-if': 'warn',
      eqeqeq: ['warn', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-duplicate-imports': 'warn',
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
);
