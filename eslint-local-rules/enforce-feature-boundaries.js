// Three tiers (ADR-0001). shared(0) < core(1) < app(2).
// - core features form the cohesive domain model; they may import each other freely.
// - app features are peers; they compose core + shared but must not import each other.
// - import type is always exempt; shared/ may import no feature.
const CORE = { donator: 1, user: 1, post: 1, comment: 1 };
const APP = { board: 2, draft: 2, stats: 2, notification: 2, login: 2, preview: 2 };
const TIERS = { ...CORE, ...APP };

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
  return TIERS[first] ? first : null;
}

function featureOfImport(source, importerDir) {
  const aliasMatch = source.match(/^@\/?([a-z]+)\//);
  if (aliasMatch) {
    const name = aliasMatch[1];
    if (name === 'shared') return 'shared';
    return TIERS[name] ? name : null;
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
        'Enforce the three feature tiers from ADR-0001: shared < core < app. core features ' +
        'may import each other; app features are peers and may not; shared/ imports no ' +
        'feature; import type is exempt.',
    },
    messages: {
      sharedImportsFeature:
        "shared/ may not import feature '{{to}}' at runtime. Move the imported code into shared/, " +
        'or invert the dependency so the feature depends on shared. See docs/adr/0001-feature-dependency-layers.md.',
      coreImportsApp:
        "core feature '{{from}}' may not import app feature '{{to}}' at runtime — the domain core must " +
        "not depend on a derived feature. Invert the dependency (have '{{to}}' consume '{{from}}'), move the " +
        'shared piece into shared/, or use `import type`. See docs/adr/0001-feature-dependency-layers.md.',
      crossAppFeature:
        "app feature '{{from}}' may not import app feature '{{to}}' — app features are peers. Route shared " +
        'code through shared/ or a core feature, or use `import type`. See docs/adr/0001-feature-dependency-layers.md.',
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

        const fromTier = TIERS[fromFeature];
        const toTier = TIERS[toFeature];
        if (fromTier === 1 && toTier === 2) {
          context.report({ node, messageId: 'coreImportsApp', data: { from: fromFeature, to: toFeature } });
        } else if (fromTier === 2 && toTier === 2) {
          context.report({ node, messageId: 'crossAppFeature', data: { from: fromFeature, to: toFeature } });
        }
        // core -> core and app -> core are allowed.
      },
    };
  },
};
