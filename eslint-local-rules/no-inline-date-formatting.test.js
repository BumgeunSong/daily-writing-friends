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
      code: 'd.toLocaleString("en-US", { timeZone: "Asia/Seoul" });',
      filename: '/repo/apps/web/src/post/utils/weekDays.ts',
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
