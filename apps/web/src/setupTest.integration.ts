import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './test/msw/server';
import { handlerResets } from './test/msw/handlers';

if (!import.meta.env.VITE_SUPABASE_URL) {
  throw new Error(
    'VITE_SUPABASE_URL is required for integration tests. ' +
      'Set it to http://localhost:54321 in the test env.',
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  handlerResets.forEach((reset) => reset());
});
afterAll(() => server.close());
