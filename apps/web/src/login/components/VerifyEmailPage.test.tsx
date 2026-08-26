import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VerifyEmailPage from './VerifyEmailPage';

vi.mock('@/shared/auth/supabaseAuth', () => ({
  verifyOtpForSignup: vi.fn(),
  resendVerificationEmail: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { verifyOtpForSignup } from '@/shared/auth/supabaseAuth';

const mockedVerify = verifyOtpForSignup as unknown as ReturnType<typeof vi.fn>;

function renderPage(initialState: { email?: string } = { email: 'verify@example.com' }) {
  // 키 입력 사이 지연을 없앤다. 기본값은 키마다 매크로태스크를 기다려서 뒤따르는
  // waitFor가 부하 상황에서 간헐적으로 시간을 초과한다.
  const user = userEvent.setup({ delay: null });
  render(
    <MemoryRouter initialEntries={[{ pathname: '/verify-email', state: initialState }]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/join/onboarding" element={<div>onboarding-stub</div>} />
        <Route path="/login" element={<div>login-stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

describe('VerifyEmailPage state machine', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockedVerify.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders entry state with the email visible', () => {
    renderPage();
    expect(screen.getByText('verify@example.com')).toBeInTheDocument();
    expect(screen.getByLabelText('인증 코드')).toBeInTheDocument();
  });

  it('shows inline error for invalid_or_expired', async () => {
    mockedVerify.mockResolvedValueOnce({ ok: false, errorCode: 'invalid_or_expired' });
    const user = renderPage();
    await user.type(screen.getByLabelText('인증 코드'), '123456');
    await user.click(screen.getByRole('button', { name: '인증 확인' }));
    await waitFor(() => {
      expect(screen.getByText(/올바르지 않거나 만료/)).toBeInTheDocument();
    });
  });

  it('locks the form on rate_limit', async () => {
    mockedVerify.mockResolvedValueOnce({ ok: false, errorCode: 'rate_limit' });
    const user = renderPage();
    await user.type(screen.getByLabelText('인증 코드'), '999999');
    await user.click(screen.getByRole('button', { name: '인증 확인' }));
    await waitFor(() => {
      expect(screen.getByText(/인증 시도가 너무 많습니다/)).toBeInTheDocument();
    });
    // Resend disabled in locked state.
    expect(screen.getByRole('button', { name: /다시 받기/ })).toBeDisabled();
  });

  it('navigates to /join/onboarding on success', async () => {
    mockedVerify.mockResolvedValueOnce({ ok: true, providers: ['email'] });
    const user = renderPage();
    await user.type(screen.getByLabelText('인증 코드'), '111111');
    await user.click(screen.getByRole('button', { name: '인증 확인' }));
    await waitFor(() => {
      expect(screen.getByText('onboarding-stub')).toBeInTheDocument();
    });
  });

  it('falls back to sessionStorage for the email when route state is missing', () => {
    sessionStorage.setItem('pendingVerificationEmail', 'fallback@example.com');
    renderPage({});
    expect(screen.getByText('fallback@example.com')).toBeInTheDocument();
  });

  it('disables the verify button until 6 digits are entered', async () => {
    const user = renderPage();
    const button = screen.getByRole('button', { name: '인증 확인' });
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('인증 코드'), '12345');
    expect(button).toBeDisabled();

    await user.type(screen.getByLabelText('인증 코드'), '6');
    expect(button).not.toBeDisabled();
  });
});
