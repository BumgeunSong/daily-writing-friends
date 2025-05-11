Task: AI 기반 자동 테스트 생성 (Vitest + React Testing Library)

이 문서는 React + Vite 프로젝트에서 Vitest와 React Testing Library를 활용한 AI 기반 자동 테스트 생성 시스템 구축 가이드입니다. 아래 요구사항과 예시를 참고하여 프로젝트에 맞게 적용하세요.

⸻

1. 프로젝트 환경 및 범위
	1. 패키지 버전: package.json을 참고하세요. (React 18, TypeScript 5, Vite 6, Vitest 3, React Testing Library 16 등)
	2. 테스트 파일 위치: 각 feature module(예: src/features/FeatureName/) 내에 별도의 test 디렉토리 생성 후, 해당 디렉토리에 테스트 파일을 생성합니다.
	   예시: src/features/MyFeature/MyComponent.tsx → src/features/MyFeature/test/MyComponent.test.tsx

⸻

2. Test Helper Wrapper 생성
	1. 파일: src/test/utils/renderWithProviders.tsx
	2. 목적: 모든 테스트에서 공통 Provider(React Query, Router, Auth 등) 래핑
	3. 예시 코드:

import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from 'YOUR_AUTH_CONTEXT_PATH';

const queryClient = new QueryClient({ defaultOptions: {/* no retries */} });

export function renderWithProviders(ui, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route);
  return render(
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}

⸻

3. AI 프롬프트 템플릿 정의
	1. 파일: testgen-template.md
	2. 내용: 아래 템플릿을 사용하여 AI에게 테스트 파일 생성을 요청합니다.

You are a Vitest + React Testing Library expert. Generate a test file for the given React component that:
- Uses TypeScript and Vitest (no snapshots).
- Imports via project path aliases.
- Wraps rendering in `renderWithProviders` from `src/test/utils/renderWithProviders`.
- Mocks unsupported dependencies (e.g. Sentry, analytics) so that all such imports return void or empty.
- Connects to Firebase Local Emulator Suite or production based on the `USE_FIREBASE_EMULATOR` flag. (Firebase Storage, Realtime Database, Cloud Functions는 테스트하지 않음)
- Focuses on:
  1. React Query data-fetching states (loading, success, error)
  2. Edge cases and prop variations
  3. Core interactions (clicks, form submits)
- Does NOT include UI styling or accessibility tests.
- For each test, add a comment explaining why the test is needed.
- Place output as `test/Component.test.tsx` next to the component file.
- At the end, output a summary: "총 N개의 테스트가 생성되었습니다."

```tsx
[PASTE COMPONENT CODE HERE]
```

---

4. Firebase Emulator Suite 연동 가이드
	1. 아직 Firebase Emulator Suite를 사용하지 않는 경우, 아래 절차를 따라 설정하세요.
	2. Firebase Emulator Suite 설치 및 실행:
	   - `npm install -g firebase-tools`
	   - `firebase init emulators`
	   - `firebase emulators:start`
	3. Firebase 설정 코드 예시 (src/lib/firebase.ts):

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

if (process.env.USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}

export { db, auth };

⸻

5. 자동 테스트 생성 스크립트
	1. 파일: scripts/ai-testgen.js
	2. 주요 기능:
	   - OpenAI API Key를 환경변수 또는 입력값으로 받아 사용 (API Key는 직접 입력 또는 .env에 저장)
	   - AI 모델(gpt-4o-mini 등)은 옵션으로 지정 가능
	   - 기본적으로 최근 변경된 컴포넌트만 대상으로 하며, 옵션으로 특정 파일 지정 가능
	   - 관련 hooks, utils도 자동 탐지하여 테스트 생성
	   - 기존 테스트 파일이 있으면, 새 테스트와 병합 (중복 테스트 방지)
	   - 테스트 생성 후, 각 테스트마다 "이 테스트가 필요한 이유" 주석 추가
	   - CLI에 생성된 테스트 수 요약 출력
	3. 예시 코드 (pseudo):

// scripts/ai-testgen.js
const fs = require('fs');
const { execSync } = require('child_process');
const openai = require('openai'); // configure with your API key

// 1. 환경변수/옵션으로 모델, API Key, 파일 지정
const apiKey = process.env.OPENAI_API_KEY || 'YOUR_API_KEY';
const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const targetFile = process.argv[2]; // 옵션으로 파일 지정 가능
const useEmulator = process.env.USE_FIREBASE_EMULATOR === 'true';

// 2. 변경된 파일 또는 지정 파일 탐색
let files = [];
if (targetFile) {
  files = [targetFile];
} else {
  const diff = execSync('git diff --name-only HEAD~1 HEAD | grep "src/.*\\.tsx$" || true').toString().trim();
  files = diff ? diff.split('\n') : [];
}
if (!files.length) {
  console.log('No target components found.');
  process.exit(0);
}

files.forEach(async (file) => {
  const componentCode = fs.readFileSync(file, 'utf-8');
  let prompt = fs.readFileSync('testgen-template.md', 'utf-8');
  prompt = prompt.replace('[PASTE COMPONENT CODE HERE]', componentCode);
  prompt = `USE_FIREBASE_EMULATOR: ${useEmulator}\nMODEL: ${model}\n` + prompt;

  const response = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    apiKey,
  });

  const testContent = response.choices[0].message.content;
  const testDir = file.replace(/\/[^/]+\.tsx$/, '/test');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir);
  const testPath = testDir + '/' + file.split('/').pop().replace('.tsx', '.test.tsx');

  // 기존 테스트 파일 병합 로직 (pseudo)
  if (fs.existsSync(testPath)) {
    // 기존 테스트와 새 테스트를 병합 (중복 제거)
    // ...
  }
  fs.writeFileSync(testPath, testContent);
  console.log(`Generated test for: ${file}`);
});

// 마지막에 전체 생성 테스트 수 요약 출력
console.log(`총 ${files.length}개의 테스트가 생성되었습니다.`);

⸻

6. NPM Script 및 사용법
	1. package.json에 스크립트 추가:

"scripts": {
  "generate:tests": "node scripts/ai-testgen.js",
  "test:emulator": "USE_FIREBASE_EMULATOR=true npm run generate:tests",
  "test:prod": "USE_FIREBASE_EMULATOR=false npm run generate:tests"
}

	2. 사용 예시:
	   - 특정 파일 테스트 생성: `npm run generate:tests src/features/MyFeature/MyComponent.tsx`
	   - 변경된 컴포넌트 전체: `npm run generate:tests`
	   - Firebase Emulator 모드: `npm run test:emulator`
	   - Production 모드: `npm run test:prod`

⸻

7. 워크플로우 요약
	1. 개발자가 컴포넌트/훅/유틸을 수정
	2. `npm run generate:tests` 실행
	3. 각 feature module의 test 디렉토리에 테스트 파일 생성/병합
	4. 각 테스트에는 "이 테스트가 필요한 이유" 주석 포함
	5. CLI에 전체 생성 테스트 수 요약 출력
	6. 개발자가 수동 리뷰 후 커밋

⸻

*End of Task Document.*