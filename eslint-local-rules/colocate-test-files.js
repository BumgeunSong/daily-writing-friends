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
