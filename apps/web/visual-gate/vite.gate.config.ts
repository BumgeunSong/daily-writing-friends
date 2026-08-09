import { fileURLToPath } from 'node:url';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const src = path.resolve(webRoot, 'src');
const fakeClient = path.resolve(src, 'shared/external/__fixtures__/supabaseClient.ts');

// Standalone dev server for the visual-gate harness. Root stays apps/web so the
// repo's tailwind/postcss config apply. The only override vs the app is swapping
// the Supabase client factory for the offline fake — the specific alias must come
// before the generic `@` alias so it wins.
export default defineConfig({
  root: webRoot,
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\/shared\/external\/supabaseClient$/, replacement: fakeClient },
      { find: /^@\//, replacement: src + '/' },
    ],
  },
  server: { port: 5199, strictPort: true },
  optimizeDeps: { entries: ['visual-gate/main.tsx'] },
});
