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
        'Format dates via a named formatter in shared/utils/dateUtils.ts (or projectToTimezone for timezone arithmetic), not inline {{api}}.',
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
