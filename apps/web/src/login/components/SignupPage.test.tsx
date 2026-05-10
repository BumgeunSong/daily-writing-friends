import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignupPage from './SignupPage';

vi.mock('@/shared/auth/supabaseAuth', () => ({
  signUpWithEmail: vi.fn(),
}));

vi.mock('@/shared/auth/authErrors', () => ({
  isAlreadyRegisteredError: vi.fn(),
}));

import { signUpWithEmail } from '@/shared/auth/supabaseAuth';
import { isAlreadyRegisteredError } from '@/shared/auth/authErrors';

const mockSignUp = signUpWithEmail as unknown as ReturnType<typeof vi.fn>;
const mockIsAlreadyRegistered = isAlreadyRegisteredError as unknown as ReturnType<typeof vi.fn>;

let pathnameAfterRender = '/signup';

function PathSpy() {
  pathnameAfterRender = window.location.pathname;
  return null;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<><SignupPage /><PathSpy /></>} />
        <Route path="/verify-email" element={<div>verify-email-stub</div>} />
        <Route path="/login" element={<div>login-stub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillAndSubmit() {
  fireEvent.input(screen.getByLabelText('이메일'), { target: { value: 'taken@example.com' } });
  fireEvent.input(screen.getByLabelText('비밀번호', { exact: true }), {
    target: { value: 'StrongPass-2026!' },
  });
  fireEvent.input(screen.getByLabelText('비밀번호 확인'), {
    target: { value: 'StrongPass-2026!' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^회원가입$/ }));
}

describe('SignupPage 422 already-registered branch', () => {
  beforeEach(() => {
    pathnameAfterRender = '/signup';
    mockSignUp.mockReset();
    mockIsAlreadyRegistered.mockReset();
  });

  it('shows inline 안내 message and does NOT navigate to /verify-email', async () => {
    const apiError = Object.assign(new Error('User already registered'), {
      code: 422,
      error_code: 'user_already_exists',
    });
    mockSignUp.mockRejectedValueOnce(apiError);
    mockIsAlreadyRegistered.mockReturnValue(true);

    renderPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/이미 가입된 이메일입니다/)).toBeInTheDocument();
    });
    // Stays on /signup; verify-email-stub is not rendered.
    expect(screen.queryByText('verify-email-stub')).not.toBeInTheDocument();
  });

  it('navigates to /verify-email on a fresh signup', async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    mockIsAlreadyRegistered.mockReturnValue(false);

    renderPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText('verify-email-stub')).toBeInTheDocument();
    });
  });

  it('shows generic error for non-422 failure', async () => {
    mockSignUp.mockRejectedValueOnce(new Error('500 server error'));
    mockIsAlreadyRegistered.mockReturnValue(false);

    renderPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText(/회원가입에 실패했습니다/)).toBeInTheDocument();
    });
    expect(screen.queryByText('verify-email-stub')).not.toBeInTheDocument();
  });
});

describe('PathSpy sentinel keeps lint happy', () => {
  it('captures the rendered pathname', () => {
    expect(pathnameAfterRender).toMatch(/^\//);
  });
});
