// Frozen configuration for the Web Vitals measurement harness.
// LOCKED FILE — the optimization loop may NOT edit anything under scripts/perf-harness/.
//
// Routes, traffic weights, metric targets, and normalization constants live here so
// every measurement and score is computed identically run-to-run.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

// --- Local Supabase (public defaults from `supabase start`; safe to commit) ---
export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
export const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Authenticated test user (frozen fixture member — active on the primary board).
export const MEMBER_EMAIL = process.env.PERF_MEMBER_EMAIL || 'e2e@example.com';
export const MEMBER_PASSWORD = process.env.PERF_MEMBER_PASSWORD || 'test1234';

// --- Preview server (production build served by `vite preview`) ---
export const PREVIEW_PORT = Number(process.env.PERF_PREVIEW_PORT || 4178);
export const PREVIEW_ORIGIN = `http://localhost:${PREVIEW_PORT}`;
export const BUILD_MODE = 'local-supabase';

// Supabase-js stores the JWT in localStorage under sb-<ref>-auth-token,
// where <ref> = first hostname label. For http://127.0.0.1:54321 -> "127".
export function storageKeyFor(url = SUPABASE_URL) {
  const ref = new URL(url).hostname.split('.')[0];
  return `sb-${ref}-auth-token`;
}

// --- Scoring (Google "good" thresholds) ---
export const TARGETS = { lcp: 2500, fcp: 1800, cls: 0.1 };

// Per-metric weight within a single route_score (must sum to 1).
// LCP and CLS are Core Web Vitals; FCP is a secondary loading signal.
export const METRIC_WEIGHTS = { lcp: 0.5, fcp: 0.2, cls: 0.3 };

// Objective Sentry 30-day traffic per route (used as traffic weights).
export const TRAFFIC = {
  root: 830,
  notifications: 369,
  boardFeed: 181,
  postDetail: 136,
};

// Median-of-N per measurement (validated: median-3 noise ~ median-5).
export const MEDIAN_RUNS = Number(process.env.PERF_MEDIAN_RUNS || 3);

// --- Frozen fixture manifest (routes to measure) ---
export function loadManifest() {
  const p = join(repoRoot, 'tests', 'fixtures', 'perf-fixture.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}

// Returns [{ key, path, traffic }] in a stable order.
export function loadRoutes() {
  const manifest = loadManifest();
  const order = ['root', 'boardFeed', 'postDetail', 'notifications'];
  return order.map((key) => ({
    key,
    path: manifest.routes[key],
    traffic: TRAFFIC[key],
  }));
}

export const paths = {
  repoRoot,
  webDir: join(repoRoot, 'apps', 'web'),
  distDir: join(repoRoot, 'apps', 'web', 'dist'),
  reportsDir: join(repoRoot, '.perf-harness'),
  baselineFile: join(repoRoot, '.perf-harness', 'baseline.json'),
  bestFile: join(repoRoot, '.perf-harness', 'best.json'),
  ledgerFile: join(repoRoot, '.perf-harness', 'ledger.jsonl'),
  epsilonFile: join(repoRoot, '.perf-harness', 'epsilon.json'),
};

// --- Loop stop conditions (design §6: A + C) ---
export const STAGNATION_LIMIT = Number(process.env.PERF_STAGNATION_LIMIT || 10);
// Target overall F2 to stop at — set realistically after baseline ε is known.
export const TARGET_OVERALL = Number(process.env.PERF_TARGET_OVERALL || 0.7);
