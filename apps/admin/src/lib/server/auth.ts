import 'server-only';

import type { NextRequest } from 'next/server';
import { getDefaultVerifier, type FirebaseTokenClaims, type Verifier } from './verify-token';

export class AdminAuthError extends Error {
  readonly code: 'unauthorized' | 'forbidden';
  readonly status: 401 | 403;
  constructor(code: 'unauthorized' | 'forbidden', message: string) {
    super(message);
    this.name = 'AdminAuthError';
    this.code = code;
    this.status = code === 'unauthorized' ? 401 : 403;
  }
}

function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);

if (adminEmails.length === 0) {
  throw new Error(
    'ADMIN_EMAILS is empty or unset. The admin server routes refuse to start without an allowlist. ' +
      'Set ADMIN_EMAILS to a comma-separated list of admin email addresses.',
  );
}

const ADMIN_EMAIL_SET: ReadonlySet<string> = new Set(adminEmails);

export function getAdminEmails(): readonly string[] {
  return adminEmails;
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAIL_SET.has(email.trim().toLowerCase());
}

function extractBearerToken(req: NextRequest | Request): string {
  const header = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!header) {
    throw new AdminAuthError('unauthorized', 'Missing Authorization header.');
  }
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) {
    throw new AdminAuthError('unauthorized', "Authorization header must be 'Bearer <token>'.");
  }
  return match[1];
}

export type RequireAdminResult = {
  email: string;
  claims: FirebaseTokenClaims;
};

export async function verifyAdmin(
  req: NextRequest | Request,
  verifier: Verifier = getDefaultVerifier(),
): Promise<RequireAdminResult> {
  const token = extractBearerToken(req);

  let claims: FirebaseTokenClaims;
  try {
    claims = await verifier(token);
  } catch (e) {
    throw new AdminAuthError(
      'unauthorized',
      e instanceof Error ? `Token verification failed: ${e.message}` : 'Token verification failed.',
    );
  }

  const rawEmail = claims.email;
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
  if (email.length === 0) {
    throw new AdminAuthError('unauthorized', 'Token has no email claim.');
  }

  if (!ADMIN_EMAIL_SET.has(email.toLowerCase())) {
    throw new AdminAuthError('forbidden', 'Account is not in admin allowlist.');
  }

  return { email, claims };
}

export async function requireAdmin(
  req: NextRequest | Request,
  verifier?: Verifier,
): Promise<RequireAdminResult> {
  return verifyAdmin(req, verifier);
}

export type AuthenticatedIdentity = {
  email: string;
  claims: FirebaseTokenClaims;
  isAdmin: boolean;
};

export async function authenticateOptional(
  req: NextRequest | Request,
  verifier: Verifier = getDefaultVerifier(),
): Promise<AuthenticatedIdentity> {
  const token = extractBearerToken(req);
  let claims: FirebaseTokenClaims;
  try {
    claims = await verifier(token);
  } catch (e) {
    throw new AdminAuthError(
      'unauthorized',
      e instanceof Error ? `Token verification failed: ${e.message}` : 'Token verification failed.',
    );
  }
  const email = typeof claims.email === 'string' ? claims.email.trim() : '';
  if (email.length === 0) {
    throw new AdminAuthError('unauthorized', 'Token has no email claim.');
  }
  return {
    email,
    claims,
    isAdmin: ADMIN_EMAIL_SET.has(email.toLowerCase()),
  };
}
