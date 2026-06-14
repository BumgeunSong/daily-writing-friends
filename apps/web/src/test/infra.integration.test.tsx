import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from './msw/server';
import { deferred } from './utils/deferred';
import { createTestQueryClient } from './utils/withProviders';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
const TOKEN_URL = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
const USER_URL = `${SUPABASE_URL}/auth/v1/user`;

async function signInAs(email: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'pw' }),
  });
  if (!res.ok) {
    throw new Error(`sign-in failed: ${res.status}`);
  }
}

/**
 * Guard-rail tests for the integration test infrastructure itself.
 * Each test pins one cross-cutting invariant that, if broken, would
 * silently corrupt every component-level test downstream.
 */
describe('integration infra guard-rails', () => {
  describe('G-1 — auth handler state isolates between tests', () => {
    it('test A signs in via password grant', async () => {
      await signInAs('alice@test.local');
      const res = await fetch(USER_URL);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { id: string };
      expect(body.id).toBe('alice');
    });

    it('test B in the same file sees no signed-in user', async () => {
      const res = await fetch(USER_URL);
      expect(res.status).toBe(401);
    });
  });

  it('G-2 — setSession flows end-to-end: POST /token then GET /user returns the same user', async () => {
    await signInAs('bob@test.local');
    const res = await fetch(USER_URL);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: string; email: string };
    expect(body).toEqual({ id: 'bob', email: 'bob@test.local' });
  });

  it('G-3 — deferred() drives a React Query loading→success transition deterministically', async () => {
    const gate = deferred<string>();
    const queryClient = createTestQueryClient();

    function Harness() {
      const { data, isLoading } = useQuery({
        queryKey: ['g3'],
        queryFn: () => gate.promise,
      });
      return <div data-testid="state">{isLoading ? 'loading' : (data ?? 'no-data')}</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent(/^loading$/);
    // Pump microtasks: the harness MUST stay loading until gate.resolve.
    // Catches a regression where deferred() returns an already-resolved promise.
    await Promise.resolve();
    expect(screen.getByTestId('state')).toHaveTextContent(/^loading$/);

    gate.resolve('done');
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent(/^done$/));
  });

  it('G-4 — createTestQueryClient retry:false surfaces an error on the first 500 (no retries)', async () => {
    let calls = 0;
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/__g4`, () => {
        calls += 1;
        return HttpResponse.json({ message: 'boom' }, { status: 500 });
      }),
    );
    const queryClient = createTestQueryClient();

    function Harness() {
      const { status } = useQuery({
        queryKey: ['g4'],
        queryFn: async () => {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/__g4`);
          if (!res.ok) throw new Error(`status ${res.status}`);
          return res.json();
        },
      });
      return <div data-testid="state">{status}</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'));
    expect(calls).toBe(1);
  });

  it("G-5 — onUnhandledRequest: 'error' throws when a test fetches an un-mocked URL", async () => {
    await expect(fetch(`${SUPABASE_URL}/rest/v1/__never_handled__`)).rejects.toThrow();
  });
});
