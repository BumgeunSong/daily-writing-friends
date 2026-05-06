import { assertEquals } from 'jsr:@std/assert@1';
import {
  extractDwfUserId,
  parseFairyPayload,
  resolveMatchMethod,
  verifyHmacSignature,
} from '../_helpers.ts';

// Real test payload from Fairy webhook spec docs.
const PAYLOAD = {
  event: 'payment.completed',
  timestamp: '2026-04-16T10:30:00.000Z',
  data: {
    paymentId: 'test_1713231000000',
    amount: 1000,
    fairyName: '테스트 Fairy',
    fairyEmail: 'test@example.com',
    fairyMessage: '테스트 웹훅 메시지입니다.',
    projectName: 'daily-writing-friends',
    source: 'test',
  },
};

const RAW_BODY = JSON.stringify(PAYLOAD);
const SECRET = 'shhh';
// Computed once via the same SHA256 HMAC algorithm; locked in by verify-passes test.
async function hmacHex(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.test('verifyHmacSignature', async (t) => {
  const validSig = await hmacHex(RAW_BODY, SECRET);

  await t.step('returns true for matching signature', async () => {
    assertEquals(await verifyHmacSignature(RAW_BODY, validSig, SECRET), true);
  });

  await t.step('returns false for tampered body', async () => {
    assertEquals(await verifyHmacSignature(RAW_BODY + 'x', validSig, SECRET), false);
  });

  await t.step('returns false for wrong secret', async () => {
    assertEquals(await verifyHmacSignature(RAW_BODY, validSig, 'other'), false);
  });

  await t.step('returns false for empty signature', async () => {
    assertEquals(await verifyHmacSignature(RAW_BODY, '', SECRET), false);
  });

  await t.step('returns false for malformed signature length', async () => {
    assertEquals(await verifyHmacSignature(RAW_BODY, 'abc', SECRET), false);
  });

  await t.step('accepts uppercase hex signature', async () => {
    assertEquals(await verifyHmacSignature(RAW_BODY, validSig.toUpperCase(), SECRET), true);
  });
});

Deno.test('parseFairyPayload', async (t) => {
  await t.step('parses Fairy spec test payload', () => {
    const result = parseFairyPayload(RAW_BODY);
    assertEquals(result?.data.paymentId, 'test_1713231000000');
    assertEquals(result?.data.fairyEmail, 'test@example.com');
    assertEquals(result?.data.source, 'test');
  });

  await t.step('accepts null fairyName and fairyMessage per spec', () => {
    const body = JSON.stringify({
      ...PAYLOAD,
      data: { ...PAYLOAD.data, fairyName: null, fairyMessage: null },
    });
    const result = parseFairyPayload(body);
    assertEquals(result?.data.fairyName, null);
    assertEquals(result?.data.fairyMessage, null);
  });

  await t.step('returns null for non-JSON', () => {
    assertEquals(parseFairyPayload('not-json'), null);
  });

  await t.step('returns null when event missing', () => {
    const body = JSON.stringify({ data: PAYLOAD.data });
    assertEquals(parseFairyPayload(body), null);
  });

  await t.step('returns null when paymentId missing', () => {
    const body = JSON.stringify({ ...PAYLOAD, data: { ...PAYLOAD.data, paymentId: undefined } });
    assertEquals(parseFairyPayload(body), null);
  });

  await t.step('returns null when fairyEmail missing', () => {
    const body = JSON.stringify({ ...PAYLOAD, data: { ...PAYLOAD.data, fairyEmail: undefined } });
    assertEquals(parseFairyPayload(body), null);
  });

  await t.step('returns null when amount is not a number', () => {
    const body = JSON.stringify({ ...PAYLOAD, data: { ...PAYLOAD.data, amount: '1000' } });
    assertEquals(parseFairyPayload(body), null);
  });

  await t.step('returns null when source missing', () => {
    const body = JSON.stringify({ ...PAYLOAD, data: { ...PAYLOAD.data, source: undefined } });
    assertEquals(parseFairyPayload(body), null);
  });
});

Deno.test('extractDwfUserId', async (t) => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  await t.step('extracts dwf_user_id from object payload (Fairy spec)', () => {
    const body = { ...PAYLOAD, data: { ...PAYLOAD.data, payload: { dwf_user_id: userId } } };
    assertEquals(extractDwfUserId(body as never), userId);
  });

  await t.step('returns null when payload absent (test webhooks)', () => {
    assertEquals(extractDwfUserId(PAYLOAD as never), null);
  });

  await t.step('returns null when dwf_user_id missing', () => {
    const body = { ...PAYLOAD, data: { ...PAYLOAD.data, payload: { other: 'x' } } };
    assertEquals(extractDwfUserId(body as never), null);
  });

  await t.step('returns null for empty string dwf_user_id', () => {
    const body = { ...PAYLOAD, data: { ...PAYLOAD.data, payload: { dwf_user_id: '' } } };
    assertEquals(extractDwfUserId(body as never), null);
  });
});

Deno.test('resolveMatchMethod', async (t) => {
  await t.step('prefers dwf_user_id over email', () => {
    assertEquals(resolveMatchMethod('user-1', 'user-2'), 'dwf_user_id');
  });

  await t.step('falls back to email when dwf match missing', () => {
    assertEquals(resolveMatchMethod(null, 'user-2'), 'email');
  });

  await t.step('returns null when neither matches', () => {
    assertEquals(resolveMatchMethod(null, null), null);
  });
});
