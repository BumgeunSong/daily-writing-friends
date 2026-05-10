/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Block new fetch*FromSupabase exports inside apps/web/src/shared/api/. ' +
        'Feature-specific reads must live in <feature>/api/ to keep shared/api/ as cross-feature infrastructure only.',
    },
    messages: {
      featureFetchInShared:
        "'{{name}}' must live in <feature>/api/, not shared/api/. " +
        'shared/api/ is reserved for cross-feature infrastructure (supabaseClient, httpClient).',
    },
    schema: [],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    if (!filename.includes('apps/web/src/shared/api/')) return {};
    // Allow infrastructure files
    if (filename.endsWith('supabaseClient.ts') || filename.endsWith('httpClient.ts')) return {};
    // Allow test files (they import from these modules and may re-export for testing)
    if (filename.endsWith('.test.ts')) return {};

    function checkName(node, name) {
      if (typeof name === 'string' && /^fetch.*FromSupabase$/.test(name)) {
        context.report({ node, messageId: 'featureFetchInShared', data: { name } });
      }
    }

    return {
      ExportNamedDeclaration(node) {
        const decl = node.declaration;
        if (!decl) {
          // Re-export form: export { fetchFooFromSupabase } from '...'
          for (const spec of node.specifiers || []) {
            checkName(spec, spec.exported?.name);
          }
          return;
        }
        if (decl.type === 'FunctionDeclaration') {
          checkName(node, decl.id?.name);
        } else if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            checkName(node, d.id?.type === 'Identifier' ? d.id.name : null);
          }
        }
      },
      ExportDefaultDeclaration(node) {
        const decl = node.declaration;
        if (!decl) return;
        if (decl.type === 'FunctionDeclaration' && decl.id) {
          checkName(node, decl.id.name);
        }
      },
    };
  },
};
