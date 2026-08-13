// Visual-gate fixture: replaces the real Supabase client factory so the app
// shell (auth + any incidental reads) renders deterministically offline.
// Aliased in via visual-gate/vite.gate.config.ts. NEVER shipped/committed.
import type { SupabaseClient } from '@supabase/supabase-js';

// Pure helpers have no network side effects, so reuse the real ones. The
// relative path bypasses the `@/shared/external/supabaseClient` alias, so this
// is not circular.
export {
  throwOnError,
  executeTrackedWrite,
  detectSlowWrite,
  SupabaseWriteError,
  SupabaseNetworkError,
  isNetworkError,
} from '../supabaseClient';
export type { SlowWriteReport } from '../supabaseClient';

const FAKE_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'gate@dwf.app',
  user_metadata: { name: '게이트' },
};

// A chainable PostgREST-shaped stub: every builder method returns itself, and
// awaiting it (or calling single/maybeSingle) resolves to an empty result. The
// harness feeds components via props, so no table needs real rows yet.
function chain() {
  const empty = Promise.resolve({ data: [], error: null, count: 0 });
  const builder: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return empty.then.bind(empty);
      if (prop === 'single' || prop === 'maybeSingle') {
        return () => Promise.resolve({ data: null, error: null });
      }
      return () => builder;
    },
    apply() {
      return builder;
    },
  });
  return builder;
}

export function getSupabaseClient(): SupabaseClient {
  const client = {
    auth: {
      onAuthStateChange(cb: (event: string, session: unknown) => void) {
        cb('INITIAL_SESSION', { user: FAKE_USER });
        return { data: { subscription: { unsubscribe() {} } } };
      },
      getSession: async () => ({ data: { session: { user: FAKE_USER } }, error: null }),
      getUser: async () => ({ data: { user: FAKE_USER }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => chain(),
    channel: () => ({
      on() {
        return this;
      },
      subscribe() {
        return this;
      },
      unsubscribe() {},
    }),
    removeChannel() {},
  };
  return client as unknown as SupabaseClient;
}
