import '@/index.css';

import { QueryClientProvider } from '@tanstack/react-query';
import ReactDOM from 'react-dom/client';

import { ThemeProvider } from '@/shared/contexts/ThemeContext';
import { AuthProvider } from '@/shared/hooks/useAuth';
import { queryClient } from '@/shared/lib/queryClient';
import { makeWorker } from '@/test/msw/browser';
import { authSessionFromEmail, seedAuthSession, testEmailFor } from '@/test/msw/handlers/auth';

import { Harness } from './Harness';
import { getFixture } from './fixtures';
import type { Fixture } from './fixtures';

// MSW must be intercepting before the app fires its first request, so start the
// worker (start() resolves after service-worker activation) BEFORE render.
async function bootstrap() {
  const fixture = getFixture(new URLSearchParams(location.search).get('__fixture'));

  if (fixture) {
    if (fixture.auth) {
      localStorage.setItem('currentUser', JSON.stringify(fixture.auth));
      seedAuthSession(authSessionFromEmail(testEmailFor(fixture.auth.uid)));
    }
    const worker = makeWorker(fixture.handlers());
    await worker.start({
      onUnhandledRequest: 'warn',
      serviceWorker: { url: '/mockServiceWorker.js' },
      quiet: true,
    });
  }

  render(fixture);
}

function render(fixture: Fixture | null) {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Harness fixture={fixture} />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

void bootstrap();
