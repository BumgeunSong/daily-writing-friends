/**
 * Supabase Storage policy verification against a local Supabase stack.
 *
 * Run: `pnpm verify:supabase-storage` with `supabase start` up and the
 * migrations applied. Reads API_URL / PUBLISHABLE_KEY / SECRET_KEY from
 * `supabase status -o env`, or from the same-named environment variables.
 * The new-style keys are used because the local stack signs JWTs with ES256 and
 * rejects the legacy HS256 ANON_KEY / SERVICE_ROLE_KEY.
 *
 * Exercises the accept/reject matrix for the image buckets that replace the
 * Firebase Storage stopgap paths — see #593.
 */
import { execSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

function readStackEnv() {
  const keys = ['API_URL', 'PUBLISHABLE_KEY', 'SECRET_KEY'];
  if (keys.every((k) => process.env[k])) return Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const out = execSync('supabase status -o env', { encoding: 'utf8' });
  return Object.fromEntries(
    out.split('\n').map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
  );
}

const { API_URL, PUBLISHABLE_KEY, SECRET_KEY } = readStackEnv();
const admin = createClient(API_URL, SECRET_KEY, { auth: { persistSession: false } });
const runId = Date.now();
const smallImage = new Uint8Array(8 * 1024).fill(1);
const bigImage = new Uint8Array(21 * 1024 * 1024).fill(1);

let failures = 0;
function report(label, pass, detail) {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}: ${detail}`);
}

// `expect` is 'allow' or the RegExp the denial message must match. A deny
// scenario only passes for its intended reason, so an unrelated failure (server
// 500, network error, wrong policy firing) is reported instead of counted as a
// successful rejection.
async function attempt(label, fn, expect) {
  const { error } = await fn();
  if (expect === 'allow') {
    report(label, !error, error ? `denied (${error.message})` : 'allowed');
  } else if (!error) {
    report(label, false, 'allowed (expected denial)');
  } else {
    const message = String(error.message);
    const matched = expect.test(message);
    report(label, matched, `denied (${message})${matched ? '' : `; expected ${expect}`}`);
  }
}

// Sign-up (not the admin API): GoTrue's admin endpoints reject the new-style
// sb_secret_ key on the local stack, while sign-up works with the publishable key.
async function signedInClient(tag) {
  const client = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signUp({
    email: `storage-${tag}-${runId}@example.test`,
    password: `pw-${runId}-${tag}`,
  });
  if (error) throw error;
  if (!data.session) throw new Error('sign-up returned no session; enable auto-confirm locally');
  return { client, uid: data.user.id };
}

const alice = await signedInClient('alice');
const bob = await signedInClient('bob');
const anon = createClient(API_URL, PUBLISHABLE_KEY, { auth: { persistSession: false } });
const png = { contentType: 'image/png' };
const RLS_DENIED = /row-level security policy/i;
const MIME_DENIED = /mime type .* is not supported/i;
const SIZE_DENIED = /exceeded the maximum allowed size/i;

for (const bucket of ['post-images', 'profile-photos', 'feedback-screenshots']) {
  const mine = `${alice.uid}/${runId}/ok.png`;
  const b = (c) => c.storage.from(bucket);

  await attempt(`${bucket} owner uploads png to own folder`, () => b(alice.client).upload(mine, smallImage, png), 'allow');
  await attempt(`${bucket} owner uploads to another user's folder`, () => b(alice.client).upload(`${bob.uid}/${runId}/x.png`, smallImage, png), RLS_DENIED);
  await attempt(`${bucket} owner uploads to bucket root (no uid folder)`, () => b(alice.client).upload(`${runId}-root.png`, smallImage, png), RLS_DENIED);
  await attempt(`${bucket} anonymous upload`, () => b(anon).upload(`${alice.uid}/${runId}/anon.png`, smallImage, png), RLS_DENIED);
  await attempt(`${bucket} svg upload`, () => b(alice.client).upload(`${alice.uid}/${runId}/x.svg`, smallImage, { contentType: 'image/svg+xml' }), MIME_DENIED);
  await attempt(`${bucket} text/html upload`, () => b(alice.client).upload(`${alice.uid}/${runId}/x.html`, smallImage, { contentType: 'text/html' }), MIME_DENIED);
  await attempt(`${bucket} 21MB upload`, () => b(alice.client).upload(`${alice.uid}/${runId}/big.png`, bigImage, png), SIZE_DENIED);
  await attempt(`${bucket} overwrite own file (upsert)`, () => b(alice.client).upload(mine, smallImage, { ...png, upsert: true }), RLS_DENIED);

  // remove() reports success with an empty list when RLS hides the row, so
  // assert on the object still existing rather than on the error.
  await b(alice.client).remove([mine]);
  await b(bob.client).remove([mine]);
  await b(anon).remove([mine]);
  const { data: stillThere } = await admin.storage.from(bucket).list(`${alice.uid}/${runId}`);
  report(`${bucket} object survives delete attempts`, stillThere?.some((o) => o.name === 'ok.png'), 'checked via service_role');

  const { data: listed } = await b(alice.client).list(`${alice.uid}/${runId}`);
  report(`${bucket} client cannot list objects`, !listed || listed.length === 0, `${listed?.length ?? 0} listed`);

  const res = await fetch(b(anon).getPublicUrl(mine).data.publicUrl);
  report(`${bucket} public URL readable without auth`, res.ok, `HTTP ${res.status}`);
}

console.log(failures === 0 ? '\nAll scenarios passed' : `\n${failures} scenario(s) failed`);
process.exit(failures === 0 ? 0 : 1);
