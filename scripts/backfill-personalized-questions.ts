#!/usr/bin/env -S npx tsx

/**
 * Backfill: generate personalized 3줄쓰기 questions for recent public posts.
 *
 * The posts INSERT trigger only covers posts published after it was deployed,
 * so on launch day every user's pool would be empty. This calls the same
 * `generate-personalized-question` Edge Function for public posts from the
 * client's candidate window (10 days) that have no question row yet.
 * It is idempotent: the function tolerates the UNIQUE(source_post_id) conflict,
 * and posts that already have a row are skipped here.
 *
 * Prerequisites (the function, migration and ANTHROPIC_API_KEY secret must be
 * deployed to the target project first):
 *   - SUPABASE_URL                 e.g. https://<ref>.supabase.co
 *   - SUPABASE_SERVICE_ROLE_KEY    service_role key of that project
 *
 * Usage (dry run is the default; nothing is sent or written):
 *   npx tsx scripts/backfill-personalized-questions.ts
 *   npx tsx scripts/backfill-personalized-questions.ts --apply --limit 3
 *   npx tsx scripts/backfill-personalized-questions.ts --apply
 *   npx tsx scripts/backfill-personalized-questions.ts --apply --concurrency 3
 */

const WINDOW_DAYS = 10;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 60_000;

interface Options {
  apply: boolean;
  limit: number | null;
  concurrency: number;
}

function parseOptions(argv: readonly string[]): Options {
  const valueOf = (flag: string) => {
    const index = argv.indexOf(flag);
    if (index === -1) return null;
    const value = Number(argv[index + 1]);
    if (!Number.isInteger(value) || value <= 0) {
      console.error(`${flag} needs a positive integer`);
      process.exit(1);
    }
    return value;
  };
  return {
    apply: argv.includes('--apply'),
    limit: valueOf('--limit'),
    concurrency: valueOf('--concurrency') ?? DEFAULT_CONCURRENCY,
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing env var ${name}`);
    process.exit(1);
  }
  return value;
}

async function restGet<T>(baseUrl: string, serviceRoleKey: string, pathAndQuery: string): Promise<T> {
  const response = await fetch(`${baseUrl}/rest/v1/${pathAndQuery}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
  });
  if (!response.ok) throw new Error(`GET ${pathAndQuery} -> ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

async function findPostIdsMissingQuestion(baseUrl: string, serviceRoleKey: string): Promise<string[]> {
  const windowStart = new Date(Date.now() - WINDOW_DAYS * MILLISECONDS_PER_DAY).toISOString();
  const posts = await restGet<{ id: string }[]>(
    baseUrl,
    serviceRoleKey,
    `posts?select=id&visibility=eq.public&created_at=gte.${encodeURIComponent(windowStart)}&order=created_at.asc`,
  );
  const questions = await restGet<{ source_post_id: string }[]>(
    baseUrl,
    serviceRoleKey,
    'personalized_questions?select=source_post_id',
  );
  const alreadyGenerated = new Set(questions.map((row) => row.source_post_id));
  return posts.map((post) => post.id).filter((id) => !alreadyGenerated.has(id));
}

type Outcome = 'created' | 'skipped' | 'failed';

async function generateFor(baseUrl: string, serviceRoleKey: string, postId: string): Promise<Outcome> {
  try {
    const response = await fetch(`${baseUrl}/functions/v1/generate-personalized-question`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ post_id: postId }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.text();
    if (!response.ok) {
      console.error(`  ${postId}: ${response.status} ${body}`);
      return 'failed';
    }
    return body === 'created' ? 'created' : 'skipped';
  } catch (error) {
    console.error(`  ${postId}: ${error instanceof Error ? error.message : String(error)}`);
    return 'failed';
  }
}

async function runWithConcurrency<T>(items: readonly T[], concurrency: number, task: (item: T) => Promise<Outcome>) {
  const results: Record<Outcome, number> = { created: 0, skipped: 0, failed: 0 };
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      results[await task(item)]++;
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const baseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  const missing = await findPostIdsMissingQuestion(baseUrl, serviceRoleKey);
  const targets = options.limit === null ? missing : missing.slice(0, options.limit);
  console.log(`public posts in last ${WINDOW_DAYS}d without a question: ${missing.length} (target ${targets.length})`);

  if (!options.apply) {
    console.log('dry run: pass --apply to generate (each post is one LLM call)');
    return;
  }

  const { created, skipped, failed } = await runWithConcurrency(targets, options.concurrency, (postId) =>
    generateFor(baseUrl, serviceRoleKey, postId),
  );
  console.log(`done: ${created} created, ${skipped} skipped (e.g. no question), ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
