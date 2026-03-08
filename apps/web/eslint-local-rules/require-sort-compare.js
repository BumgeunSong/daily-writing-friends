/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Array.prototype.sort() without a compare function. ' +
        'The default sort converts elements to strings and compares by UTF-16 code units, ' +
        'which produces unreliable ordering. Use localeCompare for strings or an explicit comparator.',
    },
    messages: {
      missingSortCompare:
        'Provide a compare function to .sort(). ' +
        'For strings use .sort((a, b) => a.localeCompare(b)).',
    },
    schema: [],
  },

  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== 'MemberExpression') return;
        if (callee.property.type !== 'Identifier') return;
        if (callee.property.name !== 'sort') return;
        if (node.arguments.length > 0) return;

        context.report({ node, messageId: 'missingSortCompare' });
      },
    };
  },
};
