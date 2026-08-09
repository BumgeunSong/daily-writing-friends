# 멘션 기능 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 댓글과 답글에서 게시판 멤버를 `@`로 멘션하고, 멘션된 사용자에게 새 유형의 알림을 보낸다.

**Architecture:** 댓글/답글 입력을 최소 TipTap 에디터(Mention 확장)로 교체해 멘션을 user_id 품은 구조화 노드로 저장한다. 저장은 게시글 패턴을 그대로 따라 `content`(라이브 `editor.getHTML()` 결과) + 신규 `content_json`(JSONB) 이중 저장이며, `content`는 content_json에서 나오는 단방향 파생 캐시다. 알림은 기존 comment/reply INSERT 트리거를 재사용하되 `create-notification` Edge Function을 1인 수신자에서 N인 수신자로 재작성한다. 함수가 content_json 노드 트리를 순회해 멘션 user_id를 뽑고, 구조적 수신자와 합쳐 멘션 우선 억제/자기 제외/중복 병합을 적용한 뒤 수신자마다 알림 행을 하나씩 insert한다.

**Tech Stack:** React 18 + TypeScript, TipTap 3 (`@tiptap/react`, `@tiptap/starter-kit`, 신규 `@tiptap/extension-mention` + `@tiptap/suggestion`), TanStack Query v4, Supabase (Postgres + RLS + pg_net 트리거 + Deno Edge Functions), DOMPurify, Vitest + Testing Library + MSW.

**설계 근거:** `docs/plans/2026-08-02-mention-feature-design.md` 참조. 결정 사항(범위=댓글/답글, 후보=게시판 멤버, 멘션 우선 억제, 최초 생성만 알림, 한글 IME 음절 완성 기준 갱신, 파생 캐시)은 그 문서에서 확정됐다.

---

## PR 스택 개요

각 PR은 독립적으로 리뷰/머지 가능하도록 쌓는다. 아래 순서가 의존 순서다.

| PR | 제목 | 핵심 | 의존 |
| --- | --- | --- | --- |
| 1 | DB 마이그레이션 | comments/replies에 `content_json` 추가, notifications type CHECK에 멘션 2종 추가 | 없음 |
| 2 | 댓글/답글 이중 저장 배선 | 모델에 `contentJson`, createComment/createReply가 content_json 저장, 매퍼가 읽음 | PR1 |
| 3 | 멘션 후보 조회 + MentionableInput | 게시판 멤버 후보 훅, TipTap Mention 입력, 한글 IME 처리, Comment/ReplyInput 교체 | PR2 |
| 4 | 멘션 렌더 + 정제 | content_json 있는 댓글의 정제 경로 분기, 멘션 chip 표시, 프로필 링크 | PR2 |
| 5 | 알림 도메인 타입 | NotificationType 2종 추가, parser 케이스, mapper, 클라이언트 렌더 | PR1 |
| 6 | Edge Function N인 재작성 | content_json SELECT, 멘션 추출, 억제, 수신자별 행 insert, 미리보기 평문화 | PR1, PR5 |

병렬 가능: PR3과 PR4는 PR2 위에서 독립. PR5는 PR1 위에서 독립. PR6은 PR5 머지 후.

각 PR 브랜치는 이전 PR 브랜치 위에 쌓는다(pr-stacking 스킬 규약). 예: `git checkout -b BumgeunSong/mention-db` (from mention-feature), 이후 PR은 직전 브랜치에서 분기.

**공통 검증 게이트** (모든 PR에서 커밋 전 실행):
```bash
cd apps/web && pnpm type-check   # #732가 CI 게이트로 강제
cd apps/web && pnpm test         # vitest 단위 + 통합
```

---

## PR 1: DB 마이그레이션

**Files:**
- Create: `supabase/migrations/20260802000000_add_content_json_and_mention_notifications.sql`

타임스탬프 형식은 `YYYYMMDDHHmmss` (기존 최신: `20260611000000`).

**Step 1: 마이그레이션 작성**

```sql
-- comments/replies에 파생 저장용 content_json 추가 (게시글 패턴과 동일, nullable)
ALTER TABLE comments ADD COLUMN content_json JSONB;
ALTER TABLE replies ADD COLUMN content_json JSONB;

-- notifications type CHECK에 멘션 2종 추가
ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'comment_on_post',
  'reply_on_comment',
  'reply_on_post',
  'reaction_on_comment',
  'reaction_on_reply',
  'like_on_post',
  'mention_on_comment',
  'mention_on_reply'
));
```

주의: 실제 제약 이름을 먼저 확인한다. `\d notifications` 또는 information_schema로 constraint 이름 확인 후 DROP 대상 이름을 맞춘다(자동 생성 이름이 `notifications_type_check`가 아닐 수 있음).

**Step 2: 로컬 적용 검증**

Run: `supabase db reset` (로컬 Supabase 스택에서) 또는 `supabase migration up`
Expected: 에러 없이 적용. `comments`/`replies`에 `content_json` 컬럼 존재, notifications에 멘션 타입 insert 가능.

메모리 참조: 로컬 Supabase 실행은 `project_local_supabase.md`(모든 마이그레이션 + 알림 트리거 처리 필요) 참고.

**Step 3: 생성 타입 갱신 (있다면)**

DB 타입을 코드로 생성하는 스크립트가 있으면 실행한다. `apps/web/src`에서 `database.types.ts` 또는 유사 파일 검색:
```bash
grep -rl "content_json\|notifications" apps/web/src/**/database*.ts 2>/dev/null
```
있으면 재생성, 없으면 스킵.

**Step 4: 커밋**

```bash
git add supabase/migrations/20260802000000_add_content_json_and_mention_notifications.sql
git commit -m "feat: 댓글/답글 content_json과 멘션 알림 타입 스키마 추가

- 멘션을 구조화 노드로 저장하기 위해 comments/replies에 content_json 컬럼 추가
- 멘션 알림을 위해 notifications type에 mention_on_comment/reply 허용"
```

---

## PR 2: 댓글/답글 이중 저장 배선

**Files:**
- Modify: `apps/web/src/comment/model/Comment.ts` (contentJson 필드)
- Modify: `apps/web/src/comment/model/Reply.ts` (contentJson 필드)
- Modify: `apps/web/src/comment/external/comment.api.ts:32-54` (createComment)
- Modify: `apps/web/src/comment/external/reply.api.ts:32-55` (createReply)
- Modify: 해당 매퍼/리드 경로 (comment 로우 → 도메인 매핑에서 content_json 읽기)
- Test: `apps/web/src/comment/external/comment.api.test.ts` (있으면 확장, 없으면 생성)

**설계 노트:** `content_json` 타입은 게시글의 `ProseMirrorDoc`(`apps/web/src/post/model/Post.ts`)을 재사용한다. 도메인 필드명은 `contentJson?: ProseMirrorDoc`.

**Step 1: 모델에 필드 추가 (실패 테스트 먼저)**

`Comment.ts`, `Reply.ts`의 인터페이스에 `contentJson?: ProseMirrorDoc;` 추가. import는 post 모델에서.

**Step 2: createComment/createReply가 content_json을 받도록 확장**

`createComment` 시그니처 끝에 optional 파라미터 추가:
```typescript
export async function createComment(
  _boardId: string,
  postId: string,
  content: string,
  userId: string,
  userName: string,
  userProfileImage: string,
  contentJson?: ProseMirrorDoc,   // 신규
) {
  // ... 기존 insert 객체에 조건부 추가 (게시글 createPost 패턴 미러)
  throwOnError(await supabase.from('comments').insert({
    id, post_id: postId, user_id: userId,
    user_name: userName, user_profile_image: userProfileImage,
    content,
    count_of_replies: 0,
    created_at: createdAt,
    ...(contentJson !== undefined ? { content_json: contentJson } : {}),
  }));
}
```
`createReply`도 동일 패턴으로 `content_json` 조건부 추가.

**Step 3: 읽기 경로에서 content_json 매핑**

comment/reply 로우 → 도메인 매퍼에 `contentJson: row.content_json ?? undefined` 추가. SELECT 컬럼 목록에 `content_json` 포함.

**Step 4: 테스트**

Run: `cd apps/web && pnpm test comment/external`
Expected: content_json 있는/없는 두 경우 모두 통과. 레거시(없음) 시 undefined.

**Step 5: 커밋**

```bash
git commit -m "feat: 댓글/답글 content_json 이중 저장 배선

- 멘션 구조를 담을 content_json을 작성·조회 경로에 추가 (게시글 패턴 미러)
- content_json 없는 레거시 댓글은 undefined로 하위 호환"
```

---

## PR 3: 멘션 후보 조회 + MentionableInput

**Files:**
- Create: `apps/web/src/user/hooks/useMentionCandidates.ts` (게시판 멤버 후보)
- Create: `apps/web/src/comment/components/MentionableInput.tsx` (공용 TipTap 입력)
- Create: `apps/web/src/comment/components/MentionList.tsx` (suggestion 팝오버 UI)
- Modify: `apps/web/src/comment/components/CommentInput.tsx` (MentionableInput 사용)
- Modify: `apps/web/src/comment/components/ReplyInput.tsx` (MentionableInput 사용)
- Modify: `apps/web/package.json` (`@tiptap/extension-mention`, `@tiptap/suggestion`)
- Test: `apps/web/src/comment/components/MentionableInput.integration.test.tsx`

**의존성 추가:**
```bash
cd apps/web && pnpm add @tiptap/extension-mention @tiptap/suggestion
```
버전은 기존 TipTap과 맞춘다 (현재 `^3.27.1`). 설치 후 `pnpm type-check` 통과 확인.

**IMPORTANT — TipTap Mention + 한글 IME는 미묘한 영역이다.** 구현 착수 전 최신 공식 문서를 확인한다: `dependency-expert` 에이전트 또는 Context7 MCP(`resolve-library-id` → `query-docs`, library `@tiptap/extension-mention`)로 3.x 멘션/서제스션 API와 `render` 콜백, `command` 시그니처를 확정한다. IME는 실기기 한글 입력으로 검증한다(설계 문서 결정: 음절 완성 기준 갱신, 조합 중 빈 결과면 직전 목록 유지).

**Step 1: 후보 훅 (실패 테스트 먼저)**

`useMentionCandidates(boardId, query)`:
- 빈 `query`면 해당 게시판 멤버 전체 반환.
- `query` 있으면 nickname/email 부분일치 필터.
- 정렬: 글타래 참여자(옵션 인자 `participantIds`) 먼저, 그다음 가나다순(nickname 기준, locale 'ko').
- 데이터 소스: `fetchUsersWithBoardPermission([boardId])` (user.api.ts:76). `useUserSearch`는 게이트 없고 boardPermissions 무시하므로 쓰지 않는다.

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchUsersWithBoardPermission } from '@/user/external/user.api';
import type { User } from '@/user/model/User';

export function useBoardMembers(boardId: string) {
  return useQuery({
    queryKey: ['boardMembers', boardId],
    queryFn: () => fetchUsersWithBoardPermission([boardId]),
    staleTime: 1000 * 60 * 10,
    enabled: !!boardId,
  });
}

// 조합/정렬은 순수 함수로 분리해 단위 테스트 (functional core)
export function filterAndRankCandidates(
  members: User[],
  query: string,
  participantIds: Set<string>,
): User[] {
  const q = query.trim().toLowerCase();
  const matched = q
    ? members.filter(m =>
        (m.nickname?.toLowerCase() ?? '').includes(q) ||
        (m.email?.toLowerCase() ?? '').includes(q))
    : members;
  return [...matched].sort((a, b) => {
    const ap = participantIds.has(a.uid) ? 0 : 1;
    const bp = participantIds.has(b.uid) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return (a.nickname ?? '').localeCompare(b.nickname ?? '', 'ko');
  });
}
```

`filterAndRankCandidates`의 단위 테스트를 먼저 작성한다(참여자 우선, 가나다순, 빈 쿼리=전체, 대소문자 무시).

**Step 2: MentionList 팝오버 컴포넌트**

`daily-writing-friends-design` 스킬을 따른다(디자인 토큰, 다크모드, 접근성). suggestion `render`가 넘기는 items/command로 리스트 렌더. 각 항목: 아바타(`profilePhotoURL`) + nickname. 키보드 위/아래/Enter 선택(데스크톱), 탭 선택(모바일). 반응형: 데스크톱 팝오버, 모바일 키보드 위 목록(설계 6-4 B). 위치 잡기는 실기기 검증 후 확정.

**Step 3: MentionableInput (TipTap)**

StarterKit는 과하다. 최소 확장만: 문단 + Mention + Placeholder. 멘션 노드는 `data-user-id`를 HTML로 직렬화하도록 `renderHTML` 설정.

```typescript
Mention.configure({
  HTMLAttributes: { class: 'mention' },
  renderHTML({ node, HTMLAttributes }) {
    return ['span',
      { ...HTMLAttributes, 'data-mention': '', 'data-user-id': node.attrs.id },
      `@${node.attrs.label ?? node.attrs.id}`];
  },
  suggestion: {
    char: '@',
    // items: useBoardMembers + filterAndRankCandidates로 채움
    // render: MentionList 마운트, 한글 IME 처리(조합 중 필터 보류, compositionend 갱신)
    // command: editor가 mention 노드 삽입 (id=user.uid, label=user.nickname)
  },
})
```

제출 시 `editor.getHTML()`(멘션 span 포함)과 `editor.getJSON()`을 함께 넘긴다. onSubmit 시그니처를 `(content: string, contentJson: ProseMirrorDoc) => Promise<void>`로 확장.

**Step 4: CommentInput/ReplyInput 교체**

두 컴포넌트가 `<Textarea>` 대신 `MentionableInput`을 쓰도록 변경. 상위 onSubmit이 content_json도 받아 PR2의 createComment/createReply에 전달하도록 연결.

**Step 5: 통합 테스트**

`MentionableInput.integration.test.tsx`: 기존 `CommentInput.integration.test.tsx`의 `deferred()` 게이트 + `withProviders()` 패턴을 따른다. 시나리오: `@` 입력 → 목록 표시(멤버 전체) → 항목 선택 → chip 삽입 → 제출 시 onSubmit이 html(멘션 span 포함) + json 받음. MSW로 boardMembers 쿼리 목킹.

주의: jsdom은 IME 조합 이벤트를 완전히 재현하지 못한다. 한글 IME 동작은 통합 테스트로 못 잡으므로 실기기/브라우저 검증(verify-browser 스킬)으로 별도 확인한다.

**Step 6: 검증 + 커밋**

Run: `cd apps/web && pnpm type-check && pnpm test comment/components`
```bash
git commit -m "feat: 댓글/답글 멘션 입력 컴포넌트 추가

- @ 입력 시 게시판 멤버 목록을 띄우는 TipTap Mention 입력 신설
- 후보 필터·정렬을 순수 함수로 분리하고 content_json을 함께 제출"
```

---

## PR 4: 멘션 렌더 + 정제

**Files:**
- Create: `apps/web/src/shared/content/sanitizeMention.ts` (멘션 span 허용 정제 설정) 또는 기존 정제기 확장
- Modify: `apps/web/src/shared/content/contentUtils.ts` (content_json 있는 댓글 정제 경로 분기)
- Modify: `apps/web/src/comment/components/CommentRow.tsx`, `ReplyRow.tsx` (멘션 chip 표시)
- Test: `apps/web/src/shared/content/contentUtils.test.ts` (또는 신규 sanitizeMention.test.ts)

**핵심 문제(C1/M1):** 기존 `renderCommentBodyHtml`(contentUtils.ts:224)은 평문 전제라 DOMPurify 전에 `convertQuotesToBlockquotes` + 광범위 `convertUrlsToLinks`를 돌린다. TipTap HTML을 그대로 먹이면 정규식이 태그 속성 안까지 매칭해 마크업이 깨진다. 또 댓글 경로 `USE_PROFILES:{html:true}`와 게시글 정제기(`FORBID_ATTR:['style','class','id']`, `ALLOW_DATA_ATTR:false`) 모두 `class`/`data-user-id`를 지운다.

**Step 1: 멘션 span 보존 정제 (실패 테스트 먼저)**

멘션 span의 `class="mention"`과 `data-user-id`만 선별 허용하는 DOMPurify 설정을 만든다. XSS 범위를 넓히지 않도록 `data-user-id`만 화이트리스트(`ADD_ATTR: ['data-user-id']` + 필요한 태그/속성만). 테스트: 멘션 span 통과, 다른 class/style/on* 속성 제거, 스크립트 제거.

**Step 2: content_json 있는 댓글은 평문 변환 건너뛰기**

렌더 진입점에서 분기: 댓글에 `contentJson`이 있으면(=새 멘션형) 평문 변환(`convertQuotesToBlockquotes`, `convertUrlsToLinks`)을 건너뛰고 멘션 보존 정제 경로로 간다. `contentJson`이 없으면 기존 `renderCommentBodyHtml` 경로 그대로(레거시 하위 호환).

**Step 3: 멘션 chip 표시 + 프로필 링크**

멘션 span을 파란 chip 스타일로. 클릭 시 `/user/{uid}`로 이동(`data-user-id` 사용). 표시 이름은 저장된 스냅샷(HTML에 박힌 `@nickname`). 스타일은 `daily-writing-friends-design` 토큰 사용.

**Step 4: 검증 + 커밋**

Run: `cd apps/web && pnpm type-check && pnpm test shared/content`
```bash
git commit -m "feat: 댓글 멘션 chip 렌더와 정제 경로 분기

- content_json 있는 댓글은 평문 변환을 건너뛰어 TipTap HTML 손상 방지
- 멘션 span의 data-user-id만 선별 허용하고 클릭 시 프로필로 이동"
```

---

## PR 5: 알림 도메인 타입

**Files:**
- Modify: `apps/web/src/notification/model/Notification.ts:3-10` (enum + 유니온 멤버)
- Modify: `apps/web/src/notification/external/notification.parser.ts:16-72` (케이스 2종)
- Modify: `apps/web/src/notification/external/notification.mapper.ts` (필요 시 SELECT 확인)
- Modify: `apps/web/src/notification/components/NotificationItem.tsx` (멘션 메시지/이동)
- Test: `apps/web/src/notification/external/notification.parser.test.ts`

**설계 노트:** 멘션 알림은 신규 컬럼이 필요 없다. `mention_on_comment`는 `comment_id`, `mention_on_reply`는 `reply_id`를 재사용한다(구조적 알림과 동일 컬럼). 판별 유니온에서 필요한 ID만 검증한다.

**Step 1: enum 확장 (실패 테스트 먼저)**

`notification.parser.test.ts`에 두 케이스 추가:
```typescript
it('parses MENTION_ON_COMMENT', () => {
  const row = makeRow({ type: 'mention_on_comment', comment_id: 'c1' });
  const result = parseNotificationRow(row);
  expect(result.type).toBe(NotificationType.MENTION_ON_COMMENT);
  expect((result as MentionOnCommentNotification).commentId).toBe('c1');
});
// mention_on_reply + reply_id 누락 시 throw 테스트도 추가
```

**Step 2: enum + 유니온 멤버 추가**

```typescript
export enum NotificationType {
  // ... 기존 6종
  MENTION_ON_COMMENT = 'mention_on_comment',
  MENTION_ON_REPLY = 'mention_on_reply',
}
```
`MentionOnCommentNotification`(commentId 필수), `MentionOnReplyNotification`(replyId 필수) 인터페이스 추가 후 `Notification` 유니온에 편입.

**Step 3: parser 케이스 추가**

기존 `COMMENT_ON_POST` 케이스 패턴(contentUtils 참조 아님, parser 24-28)을 따라:
```typescript
case NotificationType.MENTION_ON_COMMENT:
  if (!row.comment_id) throw new Error(`Notification ${row.id}: MENTION_ON_COMMENT missing commentId`);
  return { ...base, type: NotificationType.MENTION_ON_COMMENT, commentId: row.comment_id };
case NotificationType.MENTION_ON_REPLY:
  if (!row.reply_id) throw new Error(`Notification ${row.id}: MENTION_ON_REPLY missing replyId`);
  return { ...base, type: NotificationType.MENTION_ON_REPLY, replyId: row.reply_id };
```

**Step 4: NotificationItem 렌더**

멘션 알림 아이콘/문구, 클릭 시 이동(mention_on_comment → 해당 댓글, mention_on_reply → 해당 답글). 기존 이동 로직 재사용.

**Step 5: 검증 + 커밋**

Run: `cd apps/web && pnpm type-check && pnpm test notification`
```bash
git commit -m "feat: 멘션 알림 도메인 타입 추가

- NotificationType에 mention_on_comment/reply 추가하고 판별 유니온에 편입
- 멘션 알림은 기존 comment_id/reply_id 컬럼을 재사용해 스키마 확장 불필요"
```

---

## PR 6: Edge Function N인 재작성

**Files:**
- Modify: `supabase/functions/create-notification/index.ts` (전 구간)
- Modify: `supabase/functions/_shared/notificationMessages.ts` (멘션 메시지 + 평문화)
- Create: `supabase/functions/_shared/extractMentions.ts` (content_json 노드 순회)
- Test: `supabase/functions/_shared/extractMentions.test.ts` (Deno test)

**설계 노트(핵심 재작성):** 현재 함수는 `recipientId` 단일 변수 + 단일 insert(index.ts:145-160). 이를 "수신자 목록 → 각자 행 insert"로 바꾼다.

**Step 1: content_json에서 멘션 추출 순수 함수 (실패 테스트 먼저)**

```typescript
// ProseMirror 노드 트리를 재귀 순회해 type==='mention' 노드의 attrs.id 수집, 중복 제거
export function extractMentionUserIds(doc: unknown): string[] {
  const ids = new Set<string>();
  function walk(node: any) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'mention' && node.attrs?.id) ids.add(String(node.attrs.id));
    if (Array.isArray(node.content)) node.content.forEach(walk);
  }
  walk(doc);
  return [...ids];
}
```
Deno 테스트: 멘션 0개/1개/중복/중첩 문단. 한 댓글 내 같은 사람 여러 번 → 1개(중복 병합).

**Step 2: 함수 SELECT에 content_json 추가**

comment/reply 조회 SELECT에 `content_json` 포함 (index.ts:89, 109 부근). 예: comments SELECT `user_id, post_id, content, content_json`.

**Step 3: 수신자 집합 계산 (억제 규칙)**

```
structuralRecipient = 기존 로직 결과 (글/댓글 작성자)
mentionIds = extractMentionUserIds(content_json)
  - 방어적 게시판 권한 재확인: mentionIds를 해당 board 읽기 권한 보유자로 필터 (설계의 프라이버시 근거 방어층)
  - self 제외: actor 본인 제거
recipients = []
  - 각 mentionId → { recipient_id: mentionId, type: mention_on_comment|reply }
  - structuralRecipient가 mentionIds에 포함되면: 구조적 알림 생략 (멘션 우선), 멘션만 유지
  - structuralRecipient가 mentionIds에 없고 self 아니면: 구조적 알림 유지 (기존 동작)
```

**Step 4: 수신자별 행 insert (단일 → 다중)**

기존 단일 insert(145-160)를 recipients 배열 순회 insert로 교체. 각 행은 해당 type과 comment_id 또는 reply_id를 담는다. 멘션 행 dedup은 idempotency 인덱스(`recipient_id, type, post_id, COALESCE(comment_id,''), COALESCE(reply_id,''), actor_id`)가 보장하므로, 트리거가 답글에 대해 함수를 두 번(reply_on_comment/reply_on_post) 호출해도 멘션 행 중복 insert는 자동 무시된다.

**Step 5: 미리보기 평문화 (C2)**

`buildNotificationMessage`가 받는 미리보기를 content(HTML)가 아니라 content_json에서 뽑은 평문으로 만든다. content_json이 있으면 노드 트리에서 텍스트만 이어붙여(멘션은 `@nickname`으로) 35자 슬라이스. content_json이 없으면(레거시) 기존 content 사용. 슬라이스 전에 평문화되므로 태그가 잘리지 않는다.

**Step 6: 로컬 검증**

로컬 Supabase에서 멘션 포함 댓글 작성 → 멘션된 사용자에게 mention_on_comment 행 생성, 구조적 알림과 겹치면 멘션만, self는 없음, 중복 멘션은 1건 확인. `project_local_supabase.md`의 트리거 처리 참고. Edge Function 로컬 서빙 방법 확인 필요.

**Step 7: 커밋**

```bash
git commit -m "feat: 멘션 알림을 위해 create-notification을 다중 수신자로 재작성

- content_json에서 멘션 user_id를 추출해 수신자마다 알림 행을 생성
- 멘션 우선 억제·자기 제외·중복 병합을 한 실행에서 적용
- 알림 미리보기를 평문화해 HTML 태그 절단 방지"
```

---

## 통합 검증 (전체 스택 머지 전)

- `verify-browser` 스킬: 실제 브라우저에서 `@` 입력 → 목록 → 선택 → 제출 → 표시 → 알림 수신 end-to-end.
- 한글 IME: 실기기(모바일 포함)에서 음절 조합 중 목록 갱신 타이밍과 chip 삽입 확인.
- 모바일 팝오버: 키보드 겹침 없는 위치 확정.
- 회귀: 레거시(content_json 없는) 댓글이 여전히 정상 렌더/알림.

## 미해결 (설계 문서와 동일)

- content(TEXT) 제거는 레거시 백필 후 별도 마이그레이션.
- 권한 상실 후 알림 클릭 시 우아한 처리(백로그).
- 수정이 delete+insert로 구현될 경우 재알림 방지 가드.
