# 매일 글쓰기 프렌즈 (Daily Writing Friends)

글을 잘 쓰고 싶고, 생각이 깊어지고 싶다면? '매일 쓰는 습관'만큼 좋은 건 없다! 1달 동안 당신을 매일 쓰는 사람으로 만들어드립니다.

## 프로젝트 설명

'매일 글쓰기 프렌즈'는 사용자가 매일 글을 쓰는 습관을 기를 수 있도록 돕는 웹 애플리케이션입니다.

## 사용한 기술

- **Framework:** Vite 6, React 18
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3.x
- **State Management:** React Query (TanStack Query) v4
- **Routing:** React Router v6
- **Backend:** Firebase (Firestore, Auth, Storage, Remote Config, Cloud Functions)
- **Monitoring:** Sentry

## 기능

- 사용자 인증 및 프로필 관리
- 게시물 작성 및 편집 (Quill 에디터)
- 프리라이팅 모드 (타이머 기반 자유 글쓰기)
- 댓글 및 답글 기능
- 글쓰기/댓글 통계 및 기여 그래프
- 연속 글쓰기 스트릭 및 뱃지
- 알림 기능
- 음성 내레이션 (TTS)
- 다크 모드

## 설치 방법

1. **저장소 클론:**

   ```bash
   git clone https://github.com/BumgeunSong/daily-writing-friends.git
   cd daily-writing-friends
   ```

2. **의존성 설치:**

   ```bash
   npm install
   ```

3. **환경 변수 설정:**
   관리자에게 Firebase, Sentry 프로젝트에 대한 접근 권한을 요청하여 환경 변수를 설정합니다. `.env` 파일을 프로젝트 루트에 생성하고 다음과 같이 설정합니다. 환경 변수 템플릿은 `config/.env.example`을 참조하세요:
   ```plaintext
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MESSAGING_VAPID_KEY=your_firebase_messaging_vapid_key
   SENTRY_AUTH_TOKEN=your_sentry_token
   SENTRY_READ_TOKEN=your_sentry_read_token
   ```

## 개발 명령어

```bash
npm run dev           # 개발 서버 시작 (http://localhost:5173)
npm run build         # 프로덕션 빌드
npm run type-check    # TypeScript 타입 검사
npm run lint          # ESLint 검사
npm run test:run      # 테스트 실행
```

## 로컬에서 프로젝트 실행하기

1. **개발 서버 시작:**

   ```bash
   npm run dev
   ```

2. **브라우저에서 열기:**
   개발 서버가 시작되면 브라우저에서 `http://localhost:5173`을 열어 애플리케이션을 확인할 수 있습니다.

## 라이선스

이 프로젝트는 MIT 라이선스에 따라 배포됩니다.

## 연락처

- **이메일:** isp1195@gmail.com
