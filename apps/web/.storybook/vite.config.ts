import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const src = path.resolve(__dirname, '../src');

// Minimal config: skips Sentry/dev-log plugins and Firebase env defines from the app config.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': src,
      '@board': `${src}/board`,
      '@post': `${src}/post`,
      '@comment': `${src}/comment`,
      '@draft': `${src}/draft`,
      '@notification': `${src}/notification`,
      '@user': `${src}/user`,
      '@shared': `${src}/shared`,
      '@login': `${src}/login`,
      '@stats': `${src}/stats`,
    },
  },
});
