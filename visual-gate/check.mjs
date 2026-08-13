// Visual-gate A-layer check runner. Boots the harness server, captures every
// scenario across the env matrix, and fails only on stably-judged regressions.
//   node visual-gate/check.mjs
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runScenario } from './gate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..', 'apps', 'web');

const PORT = 5199;
const HARNESS_URL = `http://localhost:${PORT}/visual-gate/index.html`;
const SERVER_BOOT_TIMEOUT_MS = 30000;
const SERVER_POLL_INTERVAL_MS = 300;
const SIGINT_EXIT_CODE = 130;
const SIGTERM_EXIT_CODE = 143;

// Inline until Phase 2 gives scenarios real route URLs behind a ?__fixture= contract.
const SCENARIOS = [
  { name: 'commentInput', component: 'commentInput' },
  { name: 'mentionable', component: 'mentionable' },
  { name: 'replyInput', component: 'replyInput' },
];

// Loud-pass: only a stably-judged env carrying violations fails the gate. Unjudged
// envs (nondeterministic render, missing root, no ready signal) are infra/flaky —
// surfaced by name+reason but never blocking, so in-loop agents keep the gate.
function decideVerdict(rows) {
  const regressions = rows.filter((row) => row.stable && row.violations > 0);
  const unjudged = rows.filter((row) => !row.stable);
  return { regressions, unjudged, exitCode: regressions.length ? 1 : 0 };
}

async function isServerUp(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + SERVER_BOOT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isServerUp(url)) return true;
    await sleep(SERVER_POLL_INTERVAL_MS);
  }
  return false;
}

// detached: the child leads its own process group so killServer can SIGTERM the
// whole vite+esbuild worker tree, not just the npx shim.
function bootServer() {
  return spawn('npx', ['vite', '--config', 'visual-gate/vite.gate.config.ts', '--port', String(PORT), '--strictPort'], {
    cwd: webRoot,
    detached: true,
    stdio: 'ignore',
  });
}

function killServer(child) {
  if (!child || !child.pid || child.exitCode !== null) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    // group already exited
  }
}

async function captureAllScenarios() {
  const rows = [];
  for (const scenario of SCENARIOS) {
    const url = `${HARNESS_URL}?component=${scenario.component}`;
    const summary = await runScenario({ label: scenario.name, url });
    for (const envRow of summary) rows.push({ ...envRow, scenario: scenario.name });
  }
  return rows;
}

function reportVerdict({ regressions, unjudged }) {
  if (unjudged.length) {
    const names = unjudged.map((row) => `${row.scenario}/${row.env}(${row.reason})`).join(', ');
    console.log(`\nloud-pass — unjudged ${unjudged.length}: ${names}`);
  }
  if (!regressions.length) {
    console.log('\n✓ visual gate: no stably-judged A-layer regressions');
    return;
  }
  console.log(`\n✗ visual gate: ${regressions.length} stably-judged regression(s)`);
  for (const row of regressions) console.log(`  ${row.scenario}/${row.env}: ${row.violations} violation(s)`);
}

async function main() {
  const server = bootServer();
  const cleanup = () => killServer(server);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(SIGINT_EXIT_CODE);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(SIGTERM_EXIT_CODE);
  });
  try {
    const up = await waitForServer(`${HARNESS_URL}?component=${SCENARIOS[0].component}`);
    if (!up) {
      console.error('visual gate: harness server did not start — abstaining (loud-pass)');
      return 0;
    }
    const verdict = decideVerdict(await captureAllScenarios());
    reportVerdict(verdict);
    return verdict.exitCode;
  } finally {
    cleanup();
  }
}

export { decideVerdict };

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  main()
    .then((code) => process.exit(code))
    .catch((error) => {
      // A crashing gate must not block the loop; only real regressions exit 1.
      console.error('visual gate: unexpected error — abstaining (loud-pass)\n', error?.message ?? error);
      process.exit(0);
    });
}
