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

serve(async (req) => {
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

  // Fairy's "send test" feature should never grant a real badge.
  if (payload.data.source === 'test') {
    console.log('fairy-webhook: test source acknowledged', logBase);
    return new Response(JSON.stringify({ status: 'test_ok' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { userId, method } = await resolveDonatorUser(supabase, payload);
  const insertResult = await insertDonation(supabase, payload, userId, method);

  if (insertResult === 'duplicate') {
    console.log('fairy-webhook: duplicate paymentId, idempotent ack', { ...logBase, userId, method });
    return new Response(JSON.stringify({ status: 'duplicate' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (insertResult === 'error') {
    return new Response(JSON.stringify({ error: 'insert_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log('fairy-webhook: donation recorded', { ...logBase, userId, method });
  return new Response(JSON.stringify({ status: 'recorded', matched: method !== null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

async function resolveDonatorUser(
  supabase: SupabaseClient,
  payload: FairyWebhookPayload,
): Promise<{ userId: string | null; method: MatchMethod }> {
  const dwfUserId = extractDwfUserId(payload);
  const dwfUserMatch = dwfUserId ? await lookupUserById(supabase, dwfUserId) : null;
  const emailMatch = dwfUserMatch ? null : await lookupUserByEmail(supabase, payload.data.donor.email);
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
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .ilike('email', email)
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
    fairy_name: data.donor.name ?? null,
    fairy_email: data.donor.email,
    fairy_message: data.donor.message ?? null,
    source: data.source ?? 'unknown',
    raw_payload: payload as unknown as Record<string, unknown>,
    match_method: method,
  });

  if (!error) return 'inserted';
  if (error.code === UNIQUE_VIOLATION) return 'duplicate';
  console.error('fairy-webhook: donation insert failed', { code: error.code, message: error.message });
  return 'error';
}
