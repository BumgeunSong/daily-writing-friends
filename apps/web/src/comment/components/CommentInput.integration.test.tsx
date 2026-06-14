import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CommentInput } from './CommentInput';
import { deferred, type Deferred } from '@/test/utils/deferred';
import { withProviders } from '@/test/utils/withProviders';

/**
 * Pattern 4 reference test: form with `onSubmit` callback.
 *
 * The network is upstream of `CommentInput` — the parent owns `onSubmit`,
 * which is what fires the Supabase mutation. So MSW is the wrong tool here.
 * We stub `onSubmit` with `vi.fn()` and gate it with a `deferred()` to drive
 * the in-flight state deterministically (no fake timers, no waitFor races).
 */

const SIGNED_IN_USER = { uid: 'alice', email: 'alice@test.local', displayName: 'Alice', photoURL: null };

vi.mock('@/shared/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks/useAuth')>(
    '@/shared/hooks/useAuth',
  );
  return {
    ...actual,
    useAuth: () => ({ currentUser: SIGNED_IN_USER, loading: false }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

function renderInput(onSubmit: (content: string) => Promise<void>) {
  const { Wrapper } = withProviders();
  return render(
    <MemoryRouter>
      <Wrapper>
        <CommentInput onSubmit={onSubmit} />
      </Wrapper>
    </MemoryRouter>,
  );
}

describe('CommentInput — Pattern 4 (form with callback)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disables the submit button while the mutation is in flight and re-enables after resolve', async () => {
    const user = userEvent.setup({ delay: null });
    const gate: Deferred = deferred();
    const onSubmit = vi.fn(() => gate.promise);
    renderInput(onSubmit);

    const textarea = screen.getByPlaceholderText('재밌게 읽었다면 댓글로 글값을 남겨볼까요?');
    await user.type(textarea, '좋은 글이에요');

    const submit = screen.getByRole('button', { name: '댓글 등록' });
    expect(submit).not.toBeDisabled();

    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();

    gate.resolve();
    await vi.waitFor(() => expect(submit).not.toBeDisabled());
    expect(textarea).toHaveValue('');
  });

  it('does not fire onSubmit a second time on double-click while the first call is in flight', async () => {
    const user = userEvent.setup({ delay: null });
    const gate: Deferred = deferred();
    const onSubmit = vi.fn(() => gate.promise);
    renderInput(onSubmit);

    await user.type(
      screen.getByPlaceholderText('재밌게 읽었다면 댓글로 글값을 남겨볼까요?'),
      'race',
    );
    const submit = screen.getByRole('button', { name: '댓글 등록' });
    await user.click(submit);
    await user.click(submit);
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);

    gate.resolve();
  });

  it('rejects whitespace-only submissions without invoking onSubmit', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn(() => Promise.resolve());
    renderInput(onSubmit);

    const textarea = screen.getByPlaceholderText('재밌게 읽었다면 댓글로 글값을 남겨볼까요?');
    await user.type(textarea, '   \n  ');
    await user.click(screen.getByRole('button', { name: '댓글 등록' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('   \n  ');
  });

  it('retains the input value and re-enables the button when onSubmit rejects', async () => {
    const user = userEvent.setup({ delay: null });
    const gate: Deferred = deferred();
    const onSubmit = vi.fn(() => gate.promise);
    renderInput(onSubmit);

    const textarea = screen.getByPlaceholderText('재밌게 읽었다면 댓글로 글값을 남겨볼까요?');
    await user.type(textarea, '실패해도 입력은 남아야');
    const submit = screen.getByRole('button', { name: '댓글 등록' });
    await user.click(submit);

    gate.reject(new Error('network down'));

    await vi.waitFor(() => expect(submit).not.toBeDisabled());
    expect(textarea).toHaveValue('실패해도 입력은 남아야');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
