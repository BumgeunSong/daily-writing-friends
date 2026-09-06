import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { deferred, type Deferred } from '@/test/utils/deferred';
import { withProviders } from '@/test/utils/withProviders';

import { MentionableInput } from './MentionableInput';

/**
 * Pattern 4 reference test: form with `onSubmit` callback.
 *
 * The network is upstream of `MentionableInput` — the parent owns `onSubmit`,
 * which is what fires the Supabase mutation. So MSW is the wrong tool here.
 * We stub `onSubmit` with `vi.fn()` and gate it with a `deferred()` to drive
 * the in-flight state deterministically (no fake timers, no waitFor races).
 *
 * Content is seeded via `initialContent` rather than typed: ProseMirror's
 * contenteditable typing is unreliable under jsdom, and the `@`-mention
 * suggestion + Korean IME flow is verified in a real browser instead.
 */

const SIGNED_IN_USER = { uid: 'alice', email: 'alice@test.local', displayName: 'Alice', photoURL: null };

vi.mock('@/shared/hooks/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/shared/hooks/useAuth')>(
    '@/shared/hooks/useAuth',
  );
  return {
    ...actual,
    useAuth: () => ({
      authState: { status: 'signedIn', user: SIGNED_IN_USER },
      currentUser: SIGNED_IN_USER,
      verifiedUser: SIGNED_IN_USER,
      loading: false,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Keep the editor offline: no board-member fetch during these callback tests.
vi.mock('@/user/hooks/useMentionCandidates', async () => {
  const actual = await vi.importActual<typeof import('@/user/hooks/useMentionCandidates')>(
    '@/user/hooks/useMentionCandidates',
  );
  return { ...actual, useBoardMembers: () => ({ data: [] }) };
});

// TipTap's Placeholder extension tracks the editor viewport via ResizeObserver
// and IntersectionObserver, neither of which jsdom implements; stub both so the
// editor can mount.
beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  vi.stubGlobal('ResizeObserver', NoopObserver);
  vi.stubGlobal('IntersectionObserver', NoopObserver);
});

function renderInput(
  onSubmit: (content: string, contentJson: unknown) => Promise<void>,
  initialContent = '좋은 글이에요',
) {
  const { Wrapper } = withProviders();
  return render(
    <MemoryRouter>
      <Wrapper>
        <MentionableInput boardId="b1" initialContent={initialContent} onSubmit={onSubmit} />
      </Wrapper>
    </MemoryRouter>,
  );
}

const editorText = () => document.querySelector('.ProseMirror')?.textContent ?? '';

describe('MentionableInput — Pattern 4 (form with callback)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the editor as a textbox named by its placeholder', () => {
    // The comment-flow e2e locates the input via getByRole('textbox', { name }).
    // A bare contenteditable has no accessible name, so this guards the aria-label.
    renderInput(vi.fn(() => Promise.resolve()));

    expect(screen.getByRole('textbox', { name: /댓글|글값/ })).toBeInTheDocument();
  });

  it('passes both html content and a structured content_json to onSubmit', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn((_content: string, _contentJson: unknown) => Promise.resolve());
    renderInput(onSubmit);

    await user.click(screen.getByRole('button', { name: '댓글 등록' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [content, contentJson] = onSubmit.mock.calls[0];
    expect(content).toContain('좋은 글이에요');
    expect(contentJson).toMatchObject({ type: 'doc' });
  });

  it('disables the submit button while the mutation is in flight and clears after resolve', async () => {
    const user = userEvent.setup({ delay: null });
    const gate: Deferred = deferred();
    const onSubmit = vi.fn(() => gate.promise);
    renderInput(onSubmit);

    const submit = screen.getByRole('button', { name: '댓글 등록' });
    expect(submit).not.toBeDisabled();

    await user.click(submit);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();

    gate.resolve();
    await vi.waitFor(() => expect(submit).not.toBeDisabled());
    expect(editorText().trim()).toBe('');
  });

  it('does not fire onSubmit a second time on double-click while the first call is in flight', async () => {
    const user = userEvent.setup({ delay: null });
    const gate: Deferred = deferred();
    const onSubmit = vi.fn(() => gate.promise);
    renderInput(onSubmit);

    const submit = screen.getByRole('button', { name: '댓글 등록' });
    await user.click(submit);
    await user.click(submit);
    await user.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    gate.resolve();
  });

  it('rejects empty submissions without invoking onSubmit', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn(() => Promise.resolve());
    renderInput(onSubmit, '');

    await user.click(screen.getByRole('button', { name: '댓글 등록' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('retains the input value and re-enables the button when onSubmit rejects', async () => {
    const user = userEvent.setup({ delay: null });
    const gate: Deferred = deferred();
    const onSubmit = vi.fn(() => gate.promise);
    renderInput(onSubmit, '실패해도 입력은 남아야');

    const submit = screen.getByRole('button', { name: '댓글 등록' });
    await user.click(submit);

    gate.reject(new Error('network down'));

    await vi.waitFor(() => expect(submit).not.toBeDisabled());
    expect(editorText()).toContain('실패해도 입력은 남아야');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not submit when Enter or Shift+Enter is pressed', async () => {
    const user = userEvent.setup({ delay: null });
    const onSubmit = vi.fn(() => Promise.resolve());
    renderInput(onSubmit);

    const editor = screen.getByRole('textbox', { name: /댓글|글값/ });

    editor.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
