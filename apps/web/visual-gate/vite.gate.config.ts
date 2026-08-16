import { fileURLToPath } from 'node:url';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import componentDebugger from 'vite-plugin-component-debugger';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const src = path.resolve(webRoot, 'src');
const fakeClient = path.resolve(src, 'shared/external/__fixtures__/supabaseClient.ts');

// VG_FIXTURES=1 switches the harness from the offline fake client to the real
// Supabase client + MSW: the fake alias short-circuits the network, so it must be
// dropped for MSW to see any request. Legacy ?component= scenarios keep the fake.
const useFixtures = process.env.VG_FIXTURES === '1';

const alias = [
  { find: /^@\//, replacement: src + '/' },
];
if (!useFixtures) {
  // Specific alias must precede the generic `@` alias so it wins.
  alias.unshift({ find: /^@\/shared\/external\/supabaseClient$/, replacement: fakeClient });
}

// Standalone dev server for the visual-gate harness. Root stays apps/web so the
// repo's tailwind/postcss config apply.
export default defineConfig({
  root: webRoot,
  plugins: [
    // Must precede react(): its line numbers must be counted before babel injects
    // the HMR preamble, or every data-vg-id source line is off by ~19.
    componentDebugger({ enabled: true, attributePrefix: 'data-vg', preset: 'minimal' }),
    react(),
  ],
  // Point the real client and the MSW handlers at the same interceptable origin.
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://localhost:54321'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
  },
  resolve: { alias },
  server: { port: 5199, strictPort: true },
  optimizeDeps: { entries: ['visual-gate/main.tsx'] },
});
