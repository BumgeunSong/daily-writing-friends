import { getSupabaseClient } from '@/shared/api/supabaseClient';
import { ROUTES } from '@/login/constants';
import type { AuthUser } from '@/shared/hooks/useAuth';
import type { VerifyOtpOutcome } from '@/login/utils/verifyEmailState';

/**
 * Sign in with Google OAuth via Supabase (redirect flow).
 * User is redirected to Google, then back to the app.
 * Supabase client auto-extracts session from URL hash on return.
 */
export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();

  // Detect Kakao in-app browser and redirect to external browser
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('kakaotalk')) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.origin)}`;
    throw new Error('카카오톡 인앱 브라우저에서는 로그인할 수 없습니다. 외부 브라우저로 이동합니다.');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) throw error;
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Sign in with email/password (local testing only).
 */
export async function signInWithTestCredentials(
  email: string,
  password: string,
): Promise<void> {
  if (import.meta.env.PROD) { throw new Error('signInWithTestCredentials is not available in production.'); }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Update the current user's auth metadata (displayName, avatar).
 */
export async function updateAuthUserMetadata(metadata: {
  full_name?: string;
  avatar_url?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ data: metadata });
  if (error) throw error;
}

/**
 * Sign up with email + password. Triggers Supabase OTP confirmation email.
 * Spike 2026-05-05: emailRedirectTo dropped — the OTP flow does not use a callback URL.
 */
export async function signUpWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

/**
 * Verify a 6-digit OTP for an email/password signup. Wrapper only — no decision logic.
 * The classification of auth errors uses the canonical mapping from spike report 2026-05-05.
 */
export async function verifyOtpForSignup(email: string, token: string): Promise<VerifyOtpOutcome> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) {
    return { ok: false, errorCode: classifySupabaseAuthError(error) };
  }
  const providers = (data.user?.identities ?? [])
    .map((i) => i.provider)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  return { ok: true, providers };
}

/**
 * Map a Supabase auth error to the canonical errorCode used by `decideVerifySuccessState`.
 * Per spike report (docs/plans/2026-05-05-otp-spike-report.md) Supabase merges expired and
 * invalid into a single `otp_expired` (HTTP 403) code; we collapse them to `invalid_or_expired`.
 */
export function classifySupabaseAuthError(
  err: unknown,
): Extract<VerifyOtpOutcome, { ok: false }>['errorCode'] {
  const e = err as { status?: number; code?: string; message?: string } | null;
  const status = e?.status;
  const code = e?.code ?? '';
  const message = String(e?.message ?? '');
  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    code === 'over_request_rate_limit' ||
    /rate.*limit/i.test(message)
  ) {
    return 'rate_limit';
  }
  // The OTP-merged code is the primary signal. Only fall back to message-string
  // matching when status confirms a 4xx auth failure, so unrelated errors like
  // "Invalid login credentials" (signInWithPassword) don't get misclassified.
  if (code === 'otp_expired') return 'invalid_or_expired';
  if (status === 403 && /token.*(expired|invalid)|otp/i.test(message)) {
    return 'invalid_or_expired';
  }
  if (typeof code === 'string' && code !== '') {
    console.warn('classifySupabaseAuthError: unmapped Supabase code', { code, status, message });
  }
  return 'unknown';
}

/**
 * Sign in with email + password.
 * Throws "Email not confirmed" when verification is pending.
 */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Send password reset link. Redirects user back to /set-password with token.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${ROUTES.SET_PASSWORD}`,
  });
  if (error) throw error;
}

/**
 * Resend the verification email for an unconfirmed signup.
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

/**
 * Set or change the password for the currently authenticated user.
 * Used by Settings flow — requires active session.
 */
export async function setPasswordForCurrentUser(newPassword: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

function asNonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function mapToAuthUser(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: asNonEmptyString(user.user_metadata?.full_name),
    photoURL: asNonEmptyString(user.user_metadata?.avatar_url),
  };
}
