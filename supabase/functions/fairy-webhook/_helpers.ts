// Pure helpers for the Fairy donation webhook. No Supabase, no fetch, no env reads.

export interface FairyDonor {
  name?: string;
  email: string;
  message?: string;
}

export interface FairyPaymentData {
  paymentId: string;
  amount: number;
  donor: FairyDonor;
  source?: string;
  payload?: string | Record<string, unknown> | null;
  projectName?: string;
  [key: string]: unknown;
}

export interface FairyWebhookPayload {
  event: string;
  timestamp?: string;
  data: FairyPaymentData;
}

export type MatchMethod = 'dwf_user_id' | 'email' | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseFairyPayload(rawBody: string): FairyWebhookPayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;
  if (typeof parsed.event !== 'string') return null;
  if (!isRecord(parsed.data)) return null;

  const data = parsed.data;
  if (typeof data.paymentId !== 'string' || data.paymentId.length === 0) return null;
  if (typeof data.amount !== 'number' || !Number.isFinite(data.amount)) return null;
  if (!isRecord(data.donor) || typeof data.donor.email !== 'string') return null;

  return parsed as unknown as FairyWebhookPayload;
}

export function extractDwfUserId(payload: FairyWebhookPayload): string | null {
  const raw = payload.data.payload;
  if (raw === null || raw === undefined) return null;

  let parsed: unknown;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  } else {
    parsed = raw;
  }

  if (!isRecord(parsed)) return null;
  const id = parsed.dwf_user_id;
  if (typeof id !== 'string' || id.length === 0) return null;
  return id;
}

export async function verifyHmacSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const expected = bytesToHex(new Uint8Array(signed));
  return constantTimeEqual(expected, signature.toLowerCase());
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function resolveMatchMethod(
  dwfUserMatch: string | null,
  emailMatch: string | null,
): MatchMethod {
  if (dwfUserMatch) return 'dwf_user_id';
  if (emailMatch) return 'email';
  return null;
}
