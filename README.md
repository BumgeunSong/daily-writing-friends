# 매일 글쓰기 프렌즈 (Daily Writing Friends)

글을 잘 쓰고 싶고, 생각이 깊어지고 싶다면? '매일 쓰는 습관'만큼 좋은 건 없다! 1달 동안 당신을 매일 쓰는 사람으로 만들어드립니다.

## 프로젝트 설명

'매일 글쓰기 프렌즈'는 사용자가 매일 글을 쓰는 습관을 기를 수 있도록 돕는 모노레포 기반 웹 서비스입니다. 현재 저장소에는 사용자용 웹 앱(`apps/web`)과 운영용 어드민 앱(`apps/admin`)이 함께 포함되어 있습니다.

## 사용한 기술

- **Monorepo / Package Manager:** pnpm workspace (pnpm 9)
- **Web App:** React 18, Vite 6, TypeScript 5
- **Admin App:** Next.js 16, React 18, TypeScript 5
- **Styling:** Tailwind CSS (web: v3, admin: v4)
- **State Management:** TanStack Query (web: v4, admin: v5)
- **Routing (web):** React Router v6
- **Editor:** Tiptap v3
- **Backend / DB / Auth:** Supabase (Postgres, Auth, RLS)
- **BaaS 연동:** Firebase (Storage, Remote Config, Analytics, Performance)
- **Server Functions:** Supabase Edge Functions (Deno)
- **Monitoring:** Sentry
- **Testing:** Vitest, Playwright

## 기능

- Supabase 기반 로그인/회원가입/비밀번호 재설정 및 계정 설정
- 게시판(코호트) 탐색 및 권한 기반 글 읽기
- 게시글 작성/수정/상세 보기 (Tiptap 에디터)
- 프리라이팅 모드 (튜토리얼, 타이머 기반 작성)
- 임시저장(드래프트) 자동 저장 및 불러오기
- 댓글/답글/리액션 기능
- 알림 목록 조회 및 상태 관리
- 글쓰기 통계, 기여도 그래프, 연속 글쓰기 스트릭/뱃지
- 사용자 설정(다크 모드, 차단 사용자 관리, 캐시 정리)
- 후원자(Donator) 배지 표시

## 설치 방법

1. **저장소 클론:**

   ```bash
   git clone https://github.com/BumgeunSong/daily-writing-friends.git
   cd daily-writing-friends
   ```

2. **pnpm 활성화 및 의존성 설치:**

   ```bash
   corepack enable
   corepack pnpm install
   ```

3. **환경 변수 설정:**
   `.env.example`을 참고해 프로젝트 루트에 `.env` 파일을 생성합니다.

   ```plaintext
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MESSAGING_VAPID_KEY=your_vapid_key
   VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project_id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
   NEXT_PUBLIC_CLOUD_FUNCTIONS_URL=https://us-central1-your_project_id.cloudfunctions.net

   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   SUPABASE_ANON_KEY=your_anon_key_here
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

   SENTRY_AUTH_TOKEN=your_sentry_auth_token_here
   SENTRY_READ_TOKEN=your_sentry_read_token_here

   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   ANTHROPIC_API_KEY=your_anthropic_api_key_here

   USE_FIREBASE_EMULATOR=false
   SONAR_TOKEN=your_sonar_token_here
   ```

## 개발 명령어

```bash
pnpm run dev         # web 개발 서버 시작
pnpm run build       # web 프로덕션 빌드
pnpm run test        # web 테스트(watch)
pnpm run test:run    # web 테스트(1회 실행)
pnpm run type-check  # web TypeScript 타입 검사
pnpm run lint        # web ESLint 검사
pnpm run validate    # type-check + lint + test:run
pnpm run prepare     # husky 훅 설치
```

## 로컬에서 프로젝트 실행하기

1. **의존성 설치 및 환경 변수 준비:**

   ```bash
   corepack enable
   corepack pnpm install
   ```

2. **개발 서버 시작:**

   ```bash
   pnpm run dev
   ```

3. **브라우저에서 열기:**
   개발 서버가 시작되면 브라우저에서 `http://localhost:5173`을 열어 웹 앱을 확인할 수 있습니다.

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 배포됩니다.

## 연락처

- **이메일:** isp1195@gmail.com
