import path, { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import replace from '@rollup/plugin-replace';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const apiKey = env.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = env.VITE_FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID;
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN;

  return {
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'firebase-vendor': ['firebase/app', 'firebase/firestore'],
          }
        }
      },
      chunkSizeWarningLimit: 1000
    },
    plugins: [
      react(),
      replace({
        'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(apiKey),
        'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(authDomain),
        'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(projectId),
        'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(storageBucket),
        'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(messagingSenderId),
        'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(appId),
        preventAssignment: true
      }),
      // Put the Sentry vite plugin after all other plugins
      sentryVitePlugin({
        authToken: sentryAuthToken,
        org: 'bumgeun-song',
        project: 'daily-writing-friends',
      })
    ],
    define: {
      'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(apiKey),
      'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(authDomain),
      'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(projectId),
      'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(storageBucket),
      'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(messagingSenderId),
      'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(appId),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '#minpath': path.resolve(__dirname, 'node_modules/vfile/lib/minpath.browser.js'),
        '#minproc': path.resolve(__dirname, 'node_modules/vfile/lib/minproc.browser.js'),
        '#minurl': path.resolve(__dirname, 'node_modules/vfile/lib/minurl.browser.js'),
      },
    },
  };
});
