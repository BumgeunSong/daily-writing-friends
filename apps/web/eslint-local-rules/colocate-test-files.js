// Single implementation lives at the repo root (where its RuleTester test runs);
// re-exported here because `pnpm --filter web lint` resolves this directory.
export { default } from '../../../eslint-local-rules/colocate-test-files.js';
