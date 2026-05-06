import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  extractDwfUserId,
  FairyWebhookPayload,
  MatchMethod,
  parseFairyPayload,
  resolveMatchMethod,
  verifyHmacSignature,
} from './_helpers.ts';

// Postgres unique-violation error code. Fairy retries up to 3 times in seconds; the
// donations.payment_id UNIQUE constraint plus this short-circuit makes retries safe.
const UNIQUE_VIOLATION = '23505';

// Fairy uses the X-Fairy-Signature header per its webhook spec.
const SIGNATURE_HEADER = 'X-Fairy-Signature';

// Per Fairy spec, the only event type currently sent. Any future event types are
// rejected with 200/ignored so a signed unrelated event cannot accidentally grant a badge.
const ALLOWED_EVENT = 'payment.completed';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    // Last-resort guard: any unexpected throw lands here and returns a controlled JSON
    // 500 so Fairy retries (instead of seeing a raw stack trace from the runtime).
    console.error('fairy-webhook: unhandled error', err instanceof Error ? err.stack : err);
    return jsonResponse(500, { error: 'internal_error' });
  }
});

async function handleRequest(req: Request): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get(SIGNATURE_HEADER) ?? '';
  const secret = Deno.env.get('FAIRY_WEBHOOK_SECRET') ?? '';

  if (!secret) {
    console.error('FAIRY_WEBHOOK_SECRET not configured');
    return new Response('Server misconfigured', { status: 500 });
  }

  const signatureValid = await verifyHmacSignature(rawBody, signature, secret);
  if (!signatureValid) {
    console.warn('fairy-webhook: signature verification failed', { timestamp: new Date().toISOString() });
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = parseFairyPayload(rawBody);
  if (!payload) {
    console.warn('fairy-webhook: malformed payload');
    return new Response('Bad request', { status: 400 });
  }

  const logBase = {
    event: payload.event,
    timestamp: payload.timestamp,
    paymentId: payload.data.paymentId,
    amount: payload.data.amount,
    projectName: payload.data.projectName,
    source: payload.data.source,
  };

  if (payload.event !== ALLOWED_EVENT) {
    console.log('fairy-webhook: ignored unsupported event', logBase);
    return jsonResponse(200, { status: 'ignored', reason: 'unsupported_event' });
  }

  // Fairy's "send test" feature should never grant a real badge.
  if (payload.data.source === 'test') {
    console.log('fairy-webhook: test source acknowledged', logBase);
    return jsonResponse(200, { status: 'test_ok' });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { userId, method } = await resolveDonatorUser(supabase, payload);
  const insertResult = await insertDonation(supabase, payload, userId, method);

  if (insertResult === 'duplicate') {
    console.log('fairy-webhook: duplicate paymentId, idempotent ack', { ...logBase, userId, method });
    return jsonResponse(200, { status: 'duplicate' });
  }

  if (insertResult === 'error') {
    return jsonResponse(500, { error: 'insert_failed' });
  }

  console.log('fairy-webhook: donation recorded', { ...logBase, userId, method });
  return jsonResponse(200, { status: 'recorded', matched: method !== null });
}

async function resolveDonatorUser(
  supabase: SupabaseClient,
  payload: FairyWebhookPayload,
): Promise<{ userId: string | null; method: MatchMethod }> {
  const dwfUserId = extractDwfUserId(payload);
  const dwfUserMatch = dwfUserId ? await lookupUserById(supabase, dwfUserId) : null;
  const emailMatch = dwfUserMatch ? null : await lookupUserByEmail(supabase, payload.data.fairyEmail);
  const userId = dwfUserMatch ?? emailMatch ?? null;
  const method = resolveMatchMethod(dwfUserMatch, emailMatch);
  return { userId, method };
}

async function lookupUserById(supabase: SupabaseClient, id: string): Promise<string | null> {
  const { data, error } = await supabase.from('users').select('id').eq('id', id).maybeSingle();
  if (error) {
    console.warn('fairy-webhook: dwf_user_id lookup failed', { id, error: error.message });
    return null;
  }
  return data?.id ?? null;
}

async function lookupUserByEmail(supabase: SupabaseClient, email: string): Promise<string | null> {
  // Postgres ILIKE treats % and _ as wildcards. RFC 5321 allows underscore in the local
  // part of an email, so we escape both (and the backslash itself) to force a literal
  // case-insensitive match. Without this, donor "a_b@c.com" would also match "axb@c.com".
  const literal = email.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .ilike('email', literal)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('fairy-webhook: email lookup failed', { email, error: error.message });
    return null;
  }
  return data?.id ?? null;
}

async function insertDonation(
  supabase: SupabaseClient,
  payload: FairyWebhookPayload,
  userId: string | null,
  method: MatchMethod,
): Promise<'inserted' | 'duplicate' | 'error'> {
  const { data } = payload;
  const { error } = await supabase.from('donations').insert({
    payment_id: data.paymentId,
    user_id: userId,
    amount_krw: Math.round(data.amount),
    donated_at: payload.timestamp ?? new Date().toISOString(),
    fairy_name: data.fairyName,
    fairy_email: data.fairyEmail,
    fairy_message: data.fairyMessage,
    source: data.source,
    raw_payload: payload as unknown as Record<string, unknown>,
    match_method: method,
  });

  if (!error) return 'inserted';
  if (error.code === UNIQUE_VIOLATION) return 'duplicate';
  console.error('fairy-webhook: donation insert failed', { code: error.code, message: error.message });
  return 'error';
}
