const LAYERS = {
  donator: 1,
  user: 2,
  stats: 3,
  comment: 4,
  draft: 4,
  post: 5,
  board: 6,
  login: 7,
  notification: 7,
  preview: 7,
};

const SRC_MARKER = 'apps/web/src/';

function segmentAfterSrc(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.indexOf(SRC_MARKER);
  if (idx === -1) return null;
  return normalized.slice(idx + SRC_MARKER.length);
}

function featureOfFile(filePath) {
  const rel = segmentAfterSrc(filePath);
  if (!rel) return null;
  const first = rel.split('/')[0];
  if (first === 'shared') return 'shared';
  return LAYERS[first] ? first : null;
}

function featureOfImport(source, importerDir) {
  const aliasMatch = source.match(/^@\/?([a-z]+)\//);
  if (aliasMatch) {
    const name = aliasMatch[1];
    if (name === 'shared') return 'shared';
    return LAYERS[name] ? name : null;
  }
  if (source.startsWith('.')) {
    const joined = `${importerDir}/${source}`.replace(/\\/g, '/');
    const parts = [];
    for (const seg of joined.split('/')) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') parts.pop();
      else parts.push(seg);
    }
    return featureOfFile(parts.join('/'));
  }
  return null;
}

function isTypeOnly(node) {
  if (node.importKind === 'type') return true;
  const specifiers = node.specifiers || [];
  return specifiers.length > 0 && specifiers.every((s) => s.importKind === 'type');
}

/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce the feature dependency layers from ADR-0001. Runtime imports must flow ' +
        'from higher layers to lower layers; import type is exempt; shared/ may not ' +
        'import features.',
    },
    messages: {
      upwardImport:
        "'{{from}}' (layer {{fromLayer}}) may not import '{{to}}' (layer {{toLayer}}) at runtime. " +
        'Move the shared code to shared/, or use `import type` if only types are needed. See docs/adr/0001-feature-dependency-layers.md.',
      sharedImportsFeature:
        "shared/ may not import feature '{{to}}' at runtime. Move the imported code into shared/. See docs/adr/0001-feature-dependency-layers.md.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          baseline: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const rel = segmentAfterSrc(filename);
    if (!rel) return {};
    if (/\.test\.|\.integration\./.test(rel)) return {};

    const fromFeature = featureOfFile(filename);
    if (!fromFeature) return {};

    const options = context.options[0] || {};
    const baseline = new Set(options.baseline || []);
    const importerDir = filename.replace(/\\/g, '/').split('/').slice(0, -1).join('/');

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        const toFeature = featureOfImport(source, importerDir);
        if (!toFeature || toFeature === 'shared' || toFeature === fromFeature) return;
        if (isTypeOnly(node)) return;
        if (baseline.has(`${rel} -> ${toFeature}`)) return;

        if (fromFeature === 'shared') {
          context.report({ node, messageId: 'sharedImportsFeature', data: { to: toFeature } });
          return;
        }
        if (LAYERS[toFeature] >= LAYERS[fromFeature]) {
          context.report({
            node,
            messageId: 'upwardImport',
            data: {
              from: fromFeature,
              fromLayer: String(LAYERS[fromFeature]),
              to: toFeature,
              toLayer: String(LAYERS[toFeature]),
            },
          });
        }
      },
    };
  },
};
