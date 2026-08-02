# 멘션 기능 설계

작성일: 2026-08-02
범위: 댓글, 답글에서 다른 사용자를 멘션하고 멘션된 사용자에게 알림을 보낸다. 게시글은 이번 범위에서 제외한다.

## 설계 검증 정정 (크리틱 리뷰 반영)

초안의 "기존 것 재사용" 주장 세 개가 실제 코드와 맞지 않아 정정했다. 아래 본문은 정정된 내용이다.

- `useUserSearch`는 최소 글자수 게이트가 없고(빈 검색이면 빈 배열 반환), `boardPermissions` 인자는 무시된다(전체 유저 검색). 게시판 권한 스코핑과 "열자마자 멤버 전체" 동작은 재사용이 아니라 신규 작업이다.
- `generateHTML`, `@tiptap/extension-mention`, `@tiptap/suggestion`는 미설치다. 파생 캐시 생성과 멘션 입력은 새 의존성 + 새 코드다.
- 댓글 렌더 파이프라인은 평문 전제라 TipTap HTML을 그대로 넣으면 깨진다(C1). 알림 미리보기의 35자 슬라이스도 HTML을 뭉갠다(C2). 둘 다 이번 범위 안에서 처리한다.
- `create-notification` Edge Function은 한 실행에 수신자 1명만 만든다. 멘션 우선 억제(5-1)는 함수를 1인에서 N인 구조로 재작성해야 한다. 기존 트리거는 그대로 재사용한다.

## 배경과 목표

글쓰기 커뮤니티(등록 사용자 약 100~200명)에서 댓글과 답글을 통한 대화가 활발하다. 특정 사람을 대화에 끌어들이려면 그 사람을 지목할 방법이 필요하다. 멘션은 대화 안에서 사람을 가리키는 기능이고, 멘션된 사람은 알림을 받는다.

멘션이 가장 중요한 자리는 댓글과 답글이다. 게시글은 이미 TipTap 리치 에디터를 쓰고 있어 멘션을 붙이기 쉽지만, 사용 맥락상 우선순위가 낮아 이번 범위에서 뺀다.

핵심 요구사항은 세 가지다.
- 멘션 대상 목록이 빠르게 뜬다.
- 모바일과 데스크톱 양쪽에서 직관적이다.
- 멘션된 사용자가 새로운 유형의 알림을 받는다.

## 핵심 결정 요약

| 항목 | 결정 |
| --- | --- |
| 범위 | 댓글, 답글만 (게시글 제외) |
| 멘션 표현 | user_id를 품은 구조화된 chip 노드 (닉네임 충돌 무관) |
| 입력 방식 | 최소 TipTap contentEditable + Mention 확장 |
| 목록 트리거 | `@` 입력 시 자동 오픈 (버튼 없음, Slack/Discord 방식) |
| 목록 초기 내용 | 열리면 게시판 멤버 전체, 타이핑하면 좁혀짐 |
| 목록 정렬 | 글타래 참여자 먼저, 그다음 가나다순 |
| 목록 표현 | 반응형 (데스크톱 팝오버, 모바일 키보드 위 목록) |
| 멘션 후보군 | 해당 게시판 권한 보유자만 |
| 한글 IME 갱신 | 음절 조합 완성 기준, 조합 중 빈 결과면 직전 목록 유지 |
| 저장 | comments/replies에 content_json JSONB 추가, content는 단방향 파생 캐시 |
| 알림 진실의 원천 | 서버가 content_json을 파싱해 멘션 추출 |
| 알림 시점 | 최초 생성(INSERT) 때만, 수정/삭제 시 없음 |
| 알림 중복 규칙 | 멘션 우선(구조적 알림 억제), 자기 자신 제외, 한 댓글 내 중복은 1건 |
| 표시 | 파란 chip, 클릭 시 프로필 이동, 이름은 작성 시점 스냅샷 |

## 입력 UI

댓글과 답글 입력창을 기존 `<textarea>`에서 최소 TipTap contentEditable로 교체한다. 확장은 Mention 하나만 넣는다. 리치 텍스트 도구모음은 붙이지 않는다.

동작:
- 사용자가 `@`를 입력하면 멘션 대상 목록이 자동으로 열린다. 별도 버튼은 두지 않는다. 모바일 메신저(Slack, Discord, 카카오톡)에서 이미 익숙한 방식이라 `@` 트리거만으로 모바일에서도 문제없다.
- 목록이 열리면 해당 게시판 멤버 전체가 바로 보인다. 타이핑하면 좁혀진다. 기존 `useUserSearch`는 빈 검색어에 빈 배열을 반환하고 게시판 스코핑이 없으므로 그대로는 못 쓴다. 멘션 전용 후보 조회를 새로 만든다(빈 쿼리 = 게시판 멤버 전체, 타이핑 시 클라이언트 필터).
- 정렬은 이 글타래에 이미 참여한 사람을 먼저 보여주고, 그다음 가나다순이다. 멘션 대상은 대개 그 대화에 이미 있는 사람이라 적중률이 높다.
- 목록 표현은 반응형이다. 데스크톱은 커서 옆에 떠다니는 팝오버, 모바일은 키보드에 가려지지 않도록 키보드 바로 위에 붙는 가로 목록 또는 바텀시트로 띄운다.
- 후보군은 해당 게시판에 권한이 있는 사람만이다. `useUserSearch`의 `boardPermissions` 인자는 현재 무시되므로(전체 유저 검색), 게시판 권한으로 좁히는 조회는 신규 작업이다.
- 사용자가 목록에서 대상을 고르면 user_id를 품은 원자적 chip 노드가 삽입된다. 선택 시점에 user_id가 확정되므로 닉네임 충돌 문제가 없다. chip은 한 단위로 삭제된다.

### 한글 IME 조합 처리

한글은 자소가 조합되어 음절이 된다. "민수"를 입력하면 `ㅁ, 미, 민, 민ㅅ, 민수` 순으로 입력값이 흐른다. `민ㅅ` 같은 조합 중간 상태로 검색하면 매칭이 없어 목록이 순간 비었다가 다시 채워지는 깜빡임이 생긴다.

결정: 목록은 음절 조합이 완성될 때 갱신한다. 조합 중(`isComposing`)에는 필터를 미루고 음절이 확정되면 갱신한다. 이는 카카오톡, Slack 한글 입력의 체감 동작과 같다. TipTap 멘션은 `@tiptap/suggestion`(ProseMirror) 기반이고 IME 조합 텍스트는 `compositionend` 전까지 문서에 확정 반영되지 않으므로, 이 동작은 기본 동작에 가깝다. 자소별 실시간 갱신을 억지로 만들면 조합 이벤트를 직접 가로채야 하고 결과도 깜빡여 손해다.

안전장치: 조합 중 매칭 결과가 0이면 목록을 비우지 않고 직전의 비어있지 않은 목록을 유지한다.

검증 필요: ProseMirror + CJK IME + suggestion 조합은 미묘한 버그가 있던 영역이다. 정확한 동작은 구현 단계에서 TipTap suggestion의 IME 처리를 공식 문서와 실기기 한글 입력 테스트로 검증한다.

## 저장 모델

comments와 replies 테이블에 `content_json JSONB` 컬럼을 추가한다. 게시글이 이미 쓰는 패턴과 동일하다.

- `content_json`: 진실의 원천. TipTap이 뱉는 ProseMirror 문서 구조. 멘션은 여기에 user_id를 담은 구조화 노드로 들어간다. 서버는 이 컬럼을 파싱해 멘션 대상을 추출한다.
- `content` (기존 TEXT): content_json에서 생성되는 단방향 파생 캐시다. 저장 시점에 에디터 HTML을 한 번 만들어 박아둔다. 멘션은 HTML에 `<span data-mention data-user-id="...">@민수</span>` 형태로 직렬화된다.

신규 의존성: `@tiptap/extension-mention`, `@tiptap/suggestion`는 미설치라 추가한다. JSON에서 HTML을 만드는 방식은 두 갈래다. 게시글이 쓰는 라이브 `editor.getHTML()` 방식을 그대로 따르거나, `@tiptap/core`의 `generateHTML(json, extensions)`를 도입한다. 서버(Edge Function)는 브라우저 에디터가 없으므로, 서버에서 content_json을 다룰 땐 라이브 에디터를 못 쓴다. 이 점 때문에 알림용 멘션 추출은 HTML이 아니라 content_json 노드 트리를 직접 순회해 user_id를 뽑는다(직렬화 불필요).

### C1: 렌더 파이프라인 충돌 처리 (in-scope)

기존 `renderCommentBodyHtml`(`contentUtils.ts`)는 평문 전제다. DOMPurify 전에 `convertQuotesToBlockquotes`와 광범위한 `convertUrlsToLinks` 정규식을 raw 문자열에 돌린다. TipTap이 만든 HTML을 그대로 먹이면 정규식이 태그 속성 안까지 매칭해 마크업이 깨지고, 링크가 중첩된다. 또 이 경로의 DOMPurify는 `USE_PROFILES:{html:true}`라 `data-*`와 `class`를 날려 멘션 chip 정보가 사라진다.

처리: content_json이 있는(=새 멘션형) 댓글은 평문 변환 단계를 건너뛰고, `data-user-id`와 mention class를 보존하는 정제 경로로 렌더한다. 게시글 정제기(`sanitizeHtml.ts`)는 `FORBID_ATTR:['style','class','id']` + `ALLOW_DATA_ATTR:false`라 그대로는 못 쓰므로, 멘션 span 속성만 선별 허용하는 설정을 둔다(XSS 범위는 넓히지 않음). content_json이 없는 레거시 댓글은 기존 평문 경로 그대로.

두 컬럼은 따로 수정하지 않는다. 항상 content_json에서 content로 한 방향으로만 생성하므로 불일치(드리프트)가 구조적으로 불가능하다. content는 중복 데이터가 아니라 파생 캐시다.

파생 캐시를 저장하는 이유:
- 댓글 목록마다 JSON을 렌더링하면 TipTap 스키마 로드와 매 댓글 직렬화 비용이 붙는다.
- 기존 표시 경로 `renderCommentBodyHtml`가 HTML 문자열과 DOMPurify 기반이라, content를 없애려면 표시 경로 전체를 JSON 렌더러로 교체해야 한다.
- content는 표시용만이 아니다. 알림 메시지 미리보기(내용 35자 잘라 쓰기)와 목록 프리뷰가 이 평문에서 나온다.
- 게시글이 이미 content와 content_json을 둘 다 들고 있어 패턴이 일관된다.

### content(TEXT) 제거는 언제 가능한가

이번 기능에서는 제거하지 않는다. 별도 후속 마이그레이션 과제로 남긴다. 다음 세 조건을 모두 끝낸 뒤에야 안전하게 drop할 수 있다.
1. 레거시 백필: 기존 평문 댓글을 전부 content_json으로 변환한다. 평문에서 TipTap JSON으로의 대량 변환은 그 자체로 위험한 작업이다.
2. 표시와 프리뷰 경로 이전: 렌더링과 알림/목록 미리보기를 전부 JSON 기반으로 재작성한다.
3. 컬럼 제약 정리: `comments.content`의 `NOT NULL` 제약을 완화한다.

## 알림

### 진실의 원천

서버가 저장된 content_json을 직접 파싱해 멘션된 user_id를 추출한다. 클라이언트가 "이 사람들에게 알림 보내라"는 목록을 따로 보내지 않는다. 이렇게 하면 댓글에 실제로 들어있는 사람과 알림 받는 사람이 항상 일치하고, 실제로 멘션하지 않은 사람에게 알림을 쏘는 스팸 경로가 원천 차단된다.

### 파이프라인

기존 comment/reply INSERT 트리거는 그대로 재사용한다. 새 트리거는 추가하지 않는다. 다만 `create-notification` Edge Function은 현재 한 실행에 수신자 1명, 알림 1행만 만드는 구조라, 이를 1인에서 N인 구조로 재작성한다.

- comment/reply가 INSERT되면 기존 트리거가 pg_net으로 Edge Function을 한 번 호출한다.
- 그 한 번의 실행 안에서 함수가 (1) 구조적 수신자(글/댓글 작성자)를 계산하고, (2) content_json 노드 트리를 순회해 멘션된 user_id 집합을 추출한 뒤, (3) 멘션 우선 억제를 적용해 최종 알림들을 한꺼번에 생성한다. 구조적 알림과 멘션 알림이 별도 실행으로 갈리지 않으므로 교차 실행 조율 문제나 경합이 없다.

### 새 알림 타입

`NotificationType`에 두 값을 추가한다.
- `MENTION_ON_COMMENT = 'mention_on_comment'`
- `MENTION_ON_REPLY = 'mention_on_reply'`

수정할 곳:
- `notification/model/Notification.ts` enum
- notifications 테이블 type CHECK 제약 (마이그레이션)
- `notification/external/notification.parser.ts` 판별 유니온 (필요한 ID 검증)
- `notification/external/notification.mapper.ts` 매핑

### 알림 규칙

- 시점: 최초 생성(INSERT) 때만 알림을 보낸다. 수정과 삭제 시에는 보내지 않는다. 수정으로 새 멘션을 추가해도 알림은 가지 않는다. 이유: 알림이 지금 INSERT 트리거만 있어 UPDATE 경로를 새로 만들어야 하고, 이전 멘션과 비교하는 상태 추적은 버그가 나기 쉽다. 소규모 커뮤니티에서 수정으로 멘션을 추가하는 경우는 드물다.
- 중복 억제 (멘션 우선): 같은 사람에게 갈 구조적 알림(reply_on_comment, comment_on_post 등)이 이미 있으면 그것을 억제하고 멘션 알림만 보낸다. 멘션이 더 의도적이고 구체적인 신호다. idempotency 인덱스는 `type`이 키 컬럼이라 `mention_on_comment`와 `reply_on_comment`가 자동으로 안 겹친다. 따라서 억제는 인덱스가 아니라 함수 안의 명시적 로직으로 처리한다(위 N인 재작성에서 한 실행 안에 구조적 수신자와 멘션 집합을 모두 알고 있으므로 겹치는 대상은 멘션만 남긴다).
- 자기 자신 제외: 기존 `shouldSkipNotification`의 self-skip을 그대로 적용한다.
- 한 댓글 내 중복 멘션: 같은 사람을 여러 번 멘션해도 알림은 1건으로 합친다.

### 알림 메시지와 이동

기존 메시지 빌더 패턴을 따른다. 멘션 알림은 작성자 이름과 내용 미리보기를 포함한다. 후보군을 게시판 권한 보유자로 좁혔으므로, 미리보기가 알림에 노출되어도 권한 없는 사람에게 내용이 새는 문제가 없다. 알림을 누르면 기존 방식대로 해당 글/댓글로 이동한다.

C2 처리 (in-scope): 현재 메시지 빌더는 `content`를 raw로 받아 35자로 자른다. content에 멘션 span HTML이 들어가면 `<span data-mention data-user-id="`처럼 태그 중간에서 잘려 미리보기가 깨지고 멘션 이름이 유실된다. 미리보기는 자르기 전에 content_json에서 평문을 추출해 사용한다(기존 `extractPlainText` 활용 또는 노드 트리 순회).

## 표시

- 멘션 chip은 파란 글씨로 표시하고, 클릭하면 해당 사용자 프로필(`/user/{uid}`)로 이동한다. 멘션은 사람을 가리키므로 프로필로 가는 것이 자연스럽다.
- DOMPurify 허용목록에 mention span의 class와 `data-user-id`를 추가한다. 현재 댓글 경로(`USE_PROFILES:{html:true}`)와 게시글 경로(`FORBID_ATTR`로 class/id 제거 + `ALLOW_DATA_ATTR:false`) 둘 다 이 속성을 지우므로, 멘션 span 속성만 선별 허용하는 설정이 필요하다(C1과 동일 사안).
- 표시 이름은 작성 시점의 스냅샷이다. 멘션된 사람이 나중에 닉네임을 바꿔도 옛 댓글은 작성 당시 이름으로 남는다. 이는 댓글이 이미 작성 시점 작성자 이름(user_name)을 스냅샷으로 저장하는 기존 패턴과 동일하다. 링크(user_id)는 content_json에 그대로 있으므로 클릭하면 항상 최신 프로필로 간다.
- 렌더링할 때마다 user_id로 최신 닉네임을 다시 부르는 방식은 댓글 목록마다 유저 조회가 늘어나므로 채택하지 않는다.

## 후보군 접근 권한 근거

멘션 후보를 해당 게시판 권한 보유자로 한정하는 이유는 접근 권한과 알림 링크의 정합성 때문이다. 게시판마다 읽기 권한이 나뉘어 있고 알림은 특정 글로 연결되는 링크를 담는다. 권한 없는 사람을 멘션하면 그 사람은 알림을 받아도 글을 볼 수 없고(RLS 차단), 알림 미리보기로 볼 권한 없는 내용을 엿보게 된다. 후보군을 게시판 멤버로 좁히면 이 문제가 애초에 생기지 않고, 목록도 짧아져 고르기 쉽다.

## 영향 받는 파일 (참고)

구현 시 손댈 주요 지점이다. 상세는 구현 계획에서 확정한다.

알림:
- `apps/web/src/notification/model/Notification.ts` (타입 추가)
- `apps/web/src/notification/external/notification.parser.ts` (판별 유니온)
- `apps/web/src/notification/external/notification.mapper.ts` (매핑)
- `supabase/functions/create-notification/index.ts` (1인 → N인 재작성: 구조적 수신자 + content_json 멘션 추출 + 멘션 우선 억제를 한 실행에서. SELECT에 content_json 추가)
- `supabase/functions/_shared/notificationMessages.ts` (멘션 메시지, 미리보기는 content_json 평문 추출 후 슬라이스)

댓글/답글:
- `apps/web/src/comment/model/Comment.ts`, `Reply.ts` (content_json 필드)
- 신규 공용 `MentionableInput` 컴포넌트. `CommentInput.tsx`와 `ReplyInput.tsx`는 공유 베이스 없는 별개 `<Textarea>`라, TipTap+Mention 입력을 공용 컴포넌트로 만들어 둘 다 교체한다.
- `apps/web/src/comment/components/CommentRow.tsx`, `ReplyRow.tsx` (멘션 표시)
- `apps/web/src/shared/content/contentUtils.ts` (멘션형 댓글용 정제 경로 분기, C1)

사용자/검색:
- 멘션 후보 조회 신규(빈 쿼리 = 게시판 멤버 전체, 게시판 권한 스코핑). `useUserSearch`는 게이트가 없고 `boardPermissions`를 무시하므로 그대로 재사용 불가. `MIN_QUERY_LENGTH`(`user/search/constants.ts`)는 이 훅이 쓰지 않으므로 건드릴 필요 없다.

의존성:
- `@tiptap/extension-mention`, `@tiptap/suggestion` 추가. JSON→HTML 직렬화 방식(라이브 `editor.getHTML()` vs `@tiptap/core generateHTML`)은 구현 시 확정.

DB:
- comments/replies에 content_json JSONB 추가 마이그레이션
- notifications type CHECK 제약에 두 멘션 타입 추가 마이그레이션

## 미해결/후속

- content(TEXT) 제거는 레거시 백필 완료 후 별도 마이그레이션.
- TipTap suggestion의 한글 IME 동작은 구현 단계에서 실기기 검증.
- 멘션 chip의 반응형 모바일 표현(키보드 위 목록 대 바텀시트)은 구현 시 실제 기기에서 확정. 현재 댓글 입력이 `<Textarea>` 기반이라 팝오버 위치 잡기의 실현성도 함께 확인.
- 권한 상실 후 알림: 작성 시점엔 게시판 멤버였으나 이후 권한을 잃은 사용자가 이미 받은 멘션 알림을 누르면 RLS에 막히고 미리보기로 내용이 샐 수 있다. 후보 스코핑이 막으려던 바로 그 위험이 시점 차로 재발한다. 1차 버전은 이 잔여 위험을 감수하되, 알림 클릭 후 접근 불가 시 우아한 처리(권한 없음 안내)를 백로그로 남긴다.
- 수정 경로가 delete+insert로 구현되면 INSERT 기반 멘션 추출이 재발화해 재알림될 수 있다. 수정은 UPDATE로 구현하거나, 재발화 방지 가드를 둔다.
