// Build the app (optional) and serve the production build via `vite preview`.
// The harness ALWAYS measures a production build — dev-mode perf is meaningless.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PREVIEW_PORT, PREVIEW_ORIGIN, BUILD_MODE, paths } from './config.mjs';

/** Run `vite build --mode local-supabase`. Resolves on exit 0, rejects otherwise. */
export function build() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['--filter', 'web', 'build', '--mode', BUILD_MODE],
      { cwd: paths.repoRoot, stdio: 'inherit', env: process.env },
    );
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`build exited ${code}`)),
    );
  });
}

/**
 * Start `vite preview` on the fixed PREVIEW_PORT and wait until it answers.
 * Returns { origin, stop } — call stop() to terminate the server.
 */
export async function startPreview() {
  if (!existsSync(join(paths.distDir, 'index.html'))) {
    throw new Error(`No build at ${paths.distDir}. Run build() first.`);
  }
  const child = spawn(
    'pnpm',
    [
      '--filter',
      'web',
      'exec',
      'vite',
      'preview',
      '--mode',
      BUILD_MODE,
      '--port',
      String(PREVIEW_PORT),
      '--strictPort',
    ],
    { cwd: paths.repoRoot, stdio: ['ignore', 'pipe', 'pipe'], env: process.env },
  );

  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d.toString()));

  const stop = () =>
    new Promise((res) => {
      if (child.exitCode !== null) return res();
      child.once('exit', () => res());
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 3000);
    });

  await waitForServer(PREVIEW_ORIGIN, 30000).catch(async (e) => {
    await stop();
    throw new Error(`${e.message}\nvite preview stderr:\n${stderr.slice(-500)}`);
  });

  return { origin: PREVIEW_ORIGIN, stop };
}

async function waitForServer(origin, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(origin, { redirect: 'manual' });
      if (res.status > 0) return;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error(`Preview server did not respond at ${origin} within ${timeoutMs}ms`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
