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
