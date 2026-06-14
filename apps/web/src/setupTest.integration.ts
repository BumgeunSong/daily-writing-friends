import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './test/msw/server';
import { handlerResets } from './test/msw/handlers';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  handlerResets.forEach((reset) => reset());
});
afterAll(() => server.close());
