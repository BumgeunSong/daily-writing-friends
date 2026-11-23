# E2E 테스트 (Playwright)

로컬 Supabase와 실제 브라우저로 도는 E2E 테스트의 실행 방법과 구조를 적는다. 무엇을 E2E로 쓰고 무엇을 아래 계층으로 내릴지, 단언과 데이터 규칙은 `.agents/skills/testing/references/e2e.md`가 정본이다. 이 문서는 환경과 명령만 다룬다.

## 구조

E2E는 저장소 루트의 `tests/` 한 곳과 루트 `playwright.config.ts` 하나만 쓴다.

```
tests/
├── data-flows/      # 로컬 DB에 실제로 쓰고 읽는 흐름 (CI에서 돈다)
├── e2e/             # 가입 OTP 같은 메일 여정과 그 헬퍼
├── fixtures/        # auth 픽스처, 시드된 도메인 ID(e2e-domain.json)
├── helpers/         # 에디터 조작, IME 시뮬레이션, 시드 정리
├── qa/              # 수동 실행 스크립트(spec 아님)
├── utils/           # Supabase 인증 헬퍼
├── auth.setup.ts    # 로그인해서 storageState 파일을 만든다
├── global-setup.ts  # 로컬 Supabase 확인과 시드
└── *.spec.ts
```

## 준비

1. 로컬 Supabase를 띄운다: `supabase start`. 마이그레이션이 모두 적용되어 있어야 한다.
2. 의존성을 설치한다: `pnpm install`. 브라우저가 없으면 `pnpm exec playwright install chromium`.
3. dev 서버는 Playwright가 띄운다(`webServer`). 기본 포트는 `5174`이고 `E2E_PORT`로 바꾼다.

`global-setup.ts`가 `http://127.0.0.1:54321/auth/v1/health`로 Supabase를 확인하고 아래 두 스크립트로 시드한다. Supabase가 꺼져 있으면 실패한다.

- `scripts/seed-e2e-users.ts`: 테스트 사용자 생성
- `scripts/seed-e2e-domain.ts`: 게시판, 글, 댓글 시드. 생성한 ID를 `tests/fixtures/e2e-domain.json`에 쓴다

## 실행

루트에서 실행한다.

```bash
pnpm e2e --project=chromium-data-flows        # CI와 같은 프로젝트
pnpm e2e tests/editor-korean-ime.spec.ts --project=chromium
pnpm e2e --ui                                  # UI 모드
pnpm e2e --headed                              # 브라우저 표시
pnpm e2e --debug                               # 디버거
pnpm e2e --list --project=chromium-data-flows  # 수집되는 spec만 확인
pnpm e2e --project=chromium --repeat-each=10 --retries=0   # flaky 점검
```

- `pnpm e2e`에 `--`를 붙이지 않는다. `pnpm run e2e -- --list`는 인자가 그대로 넘어가 "No tests found"가 난다.
- 프로젝트를 지정하지 않으면 모든 spec이 모든 엔진(chromium, firefox, webkit, Mobile Chrome)에서 돈다. 보통 `--project`를 붙인다.
- `SKIP_SEED=1`이면 Supabase 확인과 시드를 건너뛴다(`--list`만 볼 때).

## 인증

`tests/auth.setup.ts`가 Supabase Auth REST API로 Node에서 로그인하고(브라우저를 쓰지 않는다) `tests/storageState.auth.json`(멤버)과 `tests/storageState.non-member.json`(비멤버)을 만든다. 프로젝트가 이 파일을 불러와 로그인된 상태로 시작한다. 이 파일은 `.gitignore`에 있다.

| 사용자 | 용도 |
|---|---|
| `e2e@example.com` | 멤버. 대부분의 spec |
| `e2e2@example.com` | 비멤버. 보드 접근 차단 확인 |

비로그인 spec은 `*.logged-out.spec.ts`로 이름을 짓고, 세션을 비우는 `chromium-no-auth` 프로젝트에서만 돈다. 인증된 프로젝트는 이 파일들을 건너뛴다.

## 프로젝트

`playwright.config.ts`의 `projects`가 어느 spec이 어디서 도는지 정한다. 표는 시한성이 있으니 어긋나면 설정이 정본이다.

| 프로젝트 | 대상 | 세션 |
|---|---|---|
| `setup`, `cleanup` | `auth.setup.ts`, `auth.teardown.ts` | - |
| `chromium`, `firefox`, `webkit`, `Mobile Chrome` | 루트 `tests/`의 spec | 멤버 |
| `chromium-no-auth` | `*.logged-out.spec.ts` | 없음 |
| `chromium-data-flows` | `tests/data-flows/` (non-member 제외) | 멤버 |
| `chromium-non-member` | `tests/data-flows/*.non-member.spec.ts` | 비멤버 |

## CI

`.github/workflows/run-playwright.yml`이 PR마다 `chromium-data-flows`와 `chromium-non-member`만 실행한다. 그 밖의 spec은 CI에서 돌지 않는다.

`node scripts/e2e/check-collection.mjs`가 CI 프로젝트가 수집하지 않는 spec 파일을 찾아 실패시키고, 실제 실행 수가 수집 수와 다르면 실패시킨다. CI가 아직 돌릴 수 없는 spec은 이유와 함께 `tests/ci-uncollected.baseline.json`에 있고, 이 목록은 줄이기만 한다. 프로젝트에 `testIgnore`를 따로 주면 최상위 `testIgnore`를 대체한다(추가가 아니다).

## 자주 만나는 문제

- **다른 worktree의 dev 서버가 응답한다.** `webServer`는 로컬에서 `reuseExistingServer`라서 같은 포트에 떠 있는 서버를 그대로 쓴다. 변경이 안 보이면 `lsof -i :5174`로 확인하고 `E2E_PORT`를 바꾼다.
- **실행 뒤 `tests/fixtures/e2e-domain.json`이 바뀐다.** 시드가 매번 새 ID를 쓴다. 커밋하지 않고 `git checkout`으로 되돌린다.
- **가입 OTP spec이 "No OTP found"로 실패한다.** spec은 `supabase/config.toml`의 `[auth.email] enable_confirmations = true`를 전제하는데 설정이 `false`면 메일이 가지 않는다. 메일함은 Mailpit(`http://127.0.0.1:54324`)이다.
- **이미지는 Supabase Storage로 올라간다.** spec은 요청을 가로채서(`page.route`) 실제 버킷 없이 돈다. `tests/avatar-resize.spec.ts`가 예시다.
- **macOS에서 단축키가 먹지 않는다.** 에디터 단축키는 `Control`을 쓴다(`modPress`, `modShiftPress`). `Meta+Shift+Z`는 redo로 전달되지 않는다.

## 운영 환경

`E2E_ENV=production`이면 시드와 비멤버 로그인을 건너뛰고 `E2E_REGULAR_EMAIL`/`E2E_REGULAR_PASSWORD`로 로그인한다. 운영 데이터에 쓰는 spec은 만들지 않는다.
