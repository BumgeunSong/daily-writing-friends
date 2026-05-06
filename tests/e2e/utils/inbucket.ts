/**
 * Local-Supabase email helper.
 *
 * Note: the local stack ships Mailpit (the modern Inbucket replacement) at
 * port 54324, not classic Inbucket. The path stays under `tests/e2e/utils/inbucket.ts`
 * so callers reading the design docs find it, but the implementation hits Mailpit's
 * `/api/v1/messages` and `/api/v1/message/<id>` endpoints.
 */

const MAILPIT_BASE = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const POLL_INTERVAL_MS = 250;
const DEFAULT_TIMEOUT_MS = 10_000;

interface MailpitListItem {
  ID: string;
  To: { Address: string }[];
  Subject: string;
  Created: string;
}

interface MailpitListResponse {
  messages: MailpitListItem[];
}

interface MailpitMessageDetail {
  Subject: string;
  Text?: string;
  HTML?: string;
}

const SIX_DIGIT = /\b\d{6}\b/;

async function listMessagesForEmail(email: string): Promise<MailpitListItem[]> {
  const url = `${MAILPIT_BASE}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mailpit list failed: ${res.status}`);
  const json = (await res.json()) as MailpitListResponse;
  return [...json.messages].sort((a, b) => Date.parse(b.Created) - Date.parse(a.Created));
}

async function getMessageBody(id: string): Promise<string> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/message/${id}`);
  if (!res.ok) throw new Error(`Mailpit fetch failed: ${res.status}`);
  const detail = (await res.json()) as MailpitMessageDetail;
  return `${detail.Text ?? ''}\n${detail.HTML ?? ''}`;
}

export async function readLatestOtpForEmail(
  email: string,
  options: { timeoutMs?: number } = {},
): Promise<string> {
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const messages = await listMessagesForEmail(email);
      if (messages.length > 0) {
        const body = await getMessageBody(messages[0].ID);
        const match = SIX_DIGIT.exec(body);
        if (match) return match[0];
      }
    } catch (err) {
      lastErr = err;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(
    `No OTP found for ${email} within ${options.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms${lastErr ? ` (last error: ${String(lastErr)})` : ''}`,
  );
}

export async function clearMailpitInbox(): Promise<void> {
  const res = await fetch(`${MAILPIT_BASE}/api/v1/messages`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Mailpit clear failed: ${res.status}`);
}
