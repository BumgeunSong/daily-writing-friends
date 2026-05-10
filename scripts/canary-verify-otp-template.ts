/**
 * Production canary: verify the email template emits an OTP body, not a magic-link.
 *
 * Run as part of the release checklist whenever the production Supabase email template
 * is updated. Signs up a sentinel email, polls the configured inbox, and asserts the
 * body contains a 6-digit code with no `verify?token=...` URL.
 *
 * MANUAL PRODUCTION DASHBOARD STEP (run before this script):
 *   1. Open https://app.supabase.com/project/<project-id>/auth/templates
 *   2. Select "Confirm signup" template
 *   3. Replace body with the contents of supabase/templates/confirmation.html
 *      (must use {{ .Token }}, must not use {{ .ConfirmationURL }})
 *   4. Save
 *
 * Then run with the env vars below set (the script does NOT parse CLI flags;
 * `--target=production` and similar belong in the env, not on argv):
 *   CANARY_SUPABASE_URL=…    \
 *   CANARY_ANON_KEY=…        \
 *   CANARY_TARGET_INBOX_API=…\
 *   CANARY_EMAIL_DOMAIN=…    \
 *   npm run canary:otp
 *
 * Env vars required:
 *   CANARY_SUPABASE_URL       — production project URL
 *   CANARY_ANON_KEY           — production anon (publishable) key
 *   CANARY_TARGET_INBOX_API   — URL of an inbox the engineer controls
 *                               (Mailpit-style /api/v1/messages endpoint)
 *   CANARY_EMAIL_DOMAIN       — allow-listed domain for the sentinel address
 */

const SIX_DIGIT = /\b\d{6}\b/;
const URL_HINTS = ['/auth/v1/verify', 'verify?token=', 'ConfirmationURL', 'magic-link'];

interface RunOptions {
  supabaseUrl: string;
  anonKey: string;
  inboxApi: string;
  emailDomain: string;
  timeoutMs: number;
}

interface MailListItem {
  ID: string;
  Created: string;
  To?: Array<{ Address?: string }>;
}

interface MailListResponse {
  messages: MailListItem[];
}

interface MailDetailResponse {
  Subject?: string;
  Text?: string;
  HTML?: string;
  To?: Array<{ Address?: string }>;
}

async function signUpSentinel(opts: RunOptions, email: string): Promise<void> {
  const res = await fetch(`${opts.supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: opts.anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: `Canary-${Date.now()}!` }),
  });
  if (!res.ok) {
    throw new Error(`signUp failed: HTTP ${res.status} ${await res.text()}`);
  }
}

async function pollMessageBodyForRecipient(
  opts: RunOptions,
  recipient: string,
): Promise<{ id: string; body: string }> {
  // Fetching the most recent message blindly would let an unrelated email (a
  // password-reset, a previous canary run, anything with a 6-digit substring)
  // satisfy the assertion. Filter by recipient so the only message we accept
  // is the one this run just produced.
  const recipientLower = recipient.toLowerCase();
  const apiBase = opts.inboxApi.replace(/\/messages.*/, '');
  const deadline = Date.now() + opts.timeoutMs;
  while (Date.now() < deadline) {
    const listRes = await fetch(
      `${apiBase}/search?query=${encodeURIComponent(`to:${recipient}`)}&limit=5`,
    );
    if (!listRes.ok) {
      await sleep(500);
      continue;
    }
    const list = (await listRes.json()) as MailListResponse;
    const match = list.messages.find((m) =>
      (m.To ?? []).some((to) => (to.Address ?? '').toLowerCase() === recipientLower),
    );
    if (match) {
      const detailRes = await fetch(`${apiBase}/message/${match.ID}`);
      if (detailRes.ok) {
        const detail = (await detailRes.json()) as MailDetailResponse;
        const detailRecipientOk = (detail.To ?? []).some(
          (to) => (to.Address ?? '').toLowerCase() === recipientLower,
        );
        if (!detailRecipientOk) {
          // Defensive: search said yes but the detail body disagrees; skip and retry.
          await sleep(500);
          continue;
        }
        return { id: match.ID, body: `${detail.Text ?? ''}\n${detail.HTML ?? ''}` };
      }
    }
    await sleep(500);
  }
  throw new Error(`No mail received for ${recipient} within ${opts.timeoutMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertOtpBody(body: string): void {
  const code = body.match(SIX_DIGIT);
  if (!code) throw new Error('Email body does not contain a 6-digit code');
  for (const hint of URL_HINTS) {
    if (body.includes(hint)) {
      throw new Error(`Email body still contains a magic-link/URL hint: ${hint}`);
    }
  }
  console.log(`canary OK — code received: ${code[0]}`);
}

async function main(): Promise<void> {
  const opts: RunOptions = {
    supabaseUrl: required('CANARY_SUPABASE_URL'),
    anonKey: required('CANARY_ANON_KEY'),
    inboxApi: required('CANARY_TARGET_INBOX_API'),
    emailDomain: required('CANARY_EMAIL_DOMAIN'),
    timeoutMs: Number(process.env.CANARY_TIMEOUT_MS ?? 30_000),
  };
  const sentinelEmail = `dwf-canary+${Date.now()}@${opts.emailDomain}`;
  console.log(`canary signing up: ${sentinelEmail}`);
  await signUpSentinel(opts, sentinelEmail);
  const { body } = await pollMessageBodyForRecipient(opts, sentinelEmail);
  assertOtpBody(body);
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing env var: ${name}`);
  return v;
}

main().catch((err) => {
  console.error('canary FAILED:', err);
  process.exit(1);
});
