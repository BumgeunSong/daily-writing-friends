# 매일 글쓰기 프렌즈 (Daily Writing Friends)

글을 잘 쓰고 싶고, 생각이 깊어지고 싶다면? '매일 쓰는 습관'만큼 좋은 건 없다! 1달 동안 당신을 매일 쓰는 사람으로 만들어드립니다.

## 목차
- [매일 글쓰기 프렌즈 (Daily Writing Friends)](#매일-글쓰기-프렌즈-daily-writing-friends)
  - [목차](#목차)
  - [프로젝트 설명](#프로젝트-설명)
  - [사용한 기술](#사용한-기술)
  - [기능](#기능)
  - [설치 방법](#설치-방법)
  - [로컬에서 프로젝트 실행하기](#로컬에서-프로젝트-실행하기)
  - [개발 환경 설정](#개발-환경-설정)
  - [라이선스](#라이선스)
  - [연락처](#연락처)

## 프로젝트 설명
'매일 글쓰기 프렌즈'는 사용자가 매일 글을 쓰는 습관을 기를 수 있도록 돕는 웹 애플리케이션입니다. 

## 사용한 기술
- Framework: **Vite**
- Language:  **TypeScript**
- Backend: **Firebase**

## 기능
- 사용자 인증 및 프로필 관리
- 게시물 작성 및 편집
- 댓글 및 답글 기능
- 게시물 및 댓글에 대한 실시간 업데이트

## 설치 방법
개발 환경을 설정하는 방법을 단계별로 설명합니다.

1. **저장소 클론:**
   ```bash
   git clone https://github.com/yourusername/daily-writing-friends.git
   cd daily-writing-friends
   ```

2. **의존성 설치:**
   ```bash
   npm install
   ```

3. **환경 변수 설정:**
   Firebase 프로젝트에 대한 접근 권한을 요청하여 환경 변수를 설정합니다. `.env` 파일을 프로젝트 루트에 생성하고 다음과 같이 설정합니다:
   ```plaintext
   VITE_API_KEY=your_api_key
   VITE_AUTH_DOMAIN=your_auth_domain
   VITE_PROJECT_ID=your_project_id
   VITE_STORAGE_BUCKET=your_storage_bucket
   VITE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_APP_ID=your_app_id
   ```

## 로컬에서 프로젝트 실행하기
로컬 개발 환경에서 프로젝트를 실행하는 방법을 설명합니다.

1. **개발 서버 시작:**
   ```bash
   npm run dev
   ```

2. **브라우저에서 열기:**
   개발 서버가 시작되면 브라우저에서 `http://localhost:5173`을 열어 애플리케이션을 확인할 수 있습니다. (Vite의 기본 포트는 5173입니다.)

## 개발 환경 설정
개발 환경에 대한 정보를 제공합니다. Firebase 프로젝트에 대한 접근 권한을 얻기 위해 유지보수자에게 요청해야 합니다.

## 라이선스
이 프로젝트는 MIT 라이선스에 따라 배포됩니다.

## 연락처
개발자와 연락할 수 있는 방법을 제공합니다.
- **이메일:** isp1195@gmail.com