/// <reference types="vitest/config" />
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import devLogPlugin from './vite-plugin-dev-log';

/**
 * Vite 구성 파일
 * 
 * 모드(mode)와 환경 변수 설정:
 * - 기본적으로 'vite dev'는 'development' 모드로, 'vite build'는 'production' 모드로 실행됩니다.
 * - 모드는 '--mode' 옵션으로 변경할 수 있습니다. (예: vite build --mode staging)
 * - 각 모드에 따라 다른 .env 파일이 로드됩니다:
 *   - .env: 모든 모드에서 로드
 *   - .env.local: 모든 모드에서 로드 (git에서 무시됨)
 *   - .env.[mode]: 특정 모드에서만 로드 (예: .env.production)
 *   - .env.[mode].local: 특정 모드에서만 로드 (git에서 무시됨)
 * 
 * 환경 변수 우선순위:
 * 1. 명령줄에서 설정된 환경 변수 (예: VITE_SOME_KEY=123 vite build)
 * 2. 모드별 .env 파일 (.env.[mode])
 * 3. 일반 .env 파일 (.env)
 * 
 * NODE_ENV와 모드는 서로 다른 개념입니다:
 * - NODE_ENV는 'production' 또는 'development'로 설정되며 import.meta.env.PROD/DEV에 영향을 줍니다.
 * - 모드는 임의의 값(production, development, staging 등)이 될 수 있으며 import.meta.env.MODE에 반영됩니다.
 */
export default defineConfig(({ mode }) => {
  // 환경 변수 로드 - 로컬 .env 파일에서 먼저 로드
  // 빈 문자열 접두사를 사용하여 VITE_ 접두사가 없는 변수도 로드합니다
  const env = loadEnv(mode, process.cwd(), '');
  
  // 환경 변수 설정 - 로컬 .env 파일 또는 CI/CD 환경 변수 사용
  const getEnvVariable = (key: string) => {
    // 로컬 .env 파일에서 로드된 값이 있으면 사용
    if (env[key]) {
      return env[key];
    }
    // 없으면 process.env에서 가져옴 (GitHub Actions/Firebase Hosting)
    return process.env[key] || '';
  };
  
  // Firebase 설정 변수
  const firebaseConfig = {
    apiKey: getEnvVariable('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVariable('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVariable('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVariable('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVariable('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVariable('VITE_FIREBASE_APP_ID'),
  };
  
  // Sentry 설정 변수
  const sentryAuthToken = getEnvVariable('SENTRY_AUTH_TOKEN');
  
  // 개발 환경 여부 확인
  // 참고: mode === 'development'는 import.meta.env.MODE === 'development'와 동일하지만
  // import.meta.env.DEV는 NODE_ENV에 따라 결정됩니다
  const isDevelopment = mode === 'development';
  
  // Firebase 에뮬레이터 사용 여부
  // 이 설정은 모드별로 다르게 구성할 수 있습니다 (예: .env.development에서는 true, .env.production에서는 false)
  const useFirebaseEmulator = getEnvVariable('VITE_USE_FIREBASE_EMULATOR') === 'true';
  
  console.log(`Building for ${mode} mode`);
  console.log(`Firebase emulator: ${useFirebaseEmulator ? 'enabled' : 'disabled'}`);
  
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
      chunkSizeWarningLimit: 1000,
      target: 'es2020'
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTest.ts'],
      include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'json', 'lcov'],
        reportOnFailure: true,
        exclude: ['node_modules/', 'src/setupTest.ts']
      },
      deps: {
        inline: ['chai', '@testing-library/jest-dom']
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'es2020'
      }
    },
    plugins: [
      react(),
      devLogPlugin(),
      // Sentry 플러그인은 마지막에 추가
      sentryVitePlugin({
        authToken: sentryAuthToken,
        org: 'bumgeun-song',
        project: 'daily-writing-friends',
        disable: !sentryAuthToken || isDevelopment, // 개발 환경이나 토큰이 없으면 비활성화
      })
    ],
    define: {
      // 클라이언트 코드에서 사용할 환경 변수 정의
      // Vite는 기본적으로 import.meta.env를 통해 VITE_ 접두사가 있는 환경 변수를 노출합니다
      // 여기서는 firebaseConfig 객체에서 가져온 값으로 명시적으로 정의합니다
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(firebaseConfig.apiKey),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(firebaseConfig.authDomain),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(firebaseConfig.projectId),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(firebaseConfig.storageBucket),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(firebaseConfig.messagingSenderId),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(firebaseConfig.appId),
      'import.meta.env.VITE_USE_FIREBASE_EMULATOR': JSON.stringify(useFirebaseEmulator),
      
      // NODE_ENV 값은 여전히 필요할 수 있으므로 유지
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@board': path.resolve(__dirname, './src/board'),
        '@post': path.resolve(__dirname, './src/post'),
        '@comment': path.resolve(__dirname, './src/comment'),
        '@draft': path.resolve(__dirname, './src/draft'),
        '@notification': path.resolve(__dirname, './src/notification'),
        '@user': path.resolve(__dirname, './src/user'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@login': path.resolve(__dirname, './src/login'),
        '@stats': path.resolve(__dirname, './src/stats'),
        '#minpath': path.resolve(__dirname, 'node_modules/vfile/lib/minpath.browser.js'),
        '#minproc': path.resolve(__dirname, 'node_modules/vfile/lib/minproc.browser.js'),
        '#minurl': path.resolve(__dirname, 'node_modules/vfile/lib/minurl.browser.js'),
      },
    },
  };
});
