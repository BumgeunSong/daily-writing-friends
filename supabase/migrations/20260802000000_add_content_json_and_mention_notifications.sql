-- 멘션을 구조화 노드(user_id 포함)로 저장하기 위한 파생 저장 컬럼.
-- 게시글(posts.content_json) 패턴과 동일하게 nullable JSONB로 두고,
-- content(TEXT)는 content_json에서 파생되는 단방향 캐시로 유지한다.
ALTER TABLE comments ADD COLUMN content_json JSONB;
ALTER TABLE replies ADD COLUMN content_json JSONB;

-- notifications type CHECK에 멘션 2종 추가.
-- 제약은 CREATE TABLE 인라인 CHECK라 Postgres가 notifications_type_check로 자동 명명한다.
-- NOT VALID로 먼저 붙여 신규 insert만 즉시 검사하고, VALIDATE는 SHARE UPDATE
-- EXCLUSIVE 락으로 기존 행을 스캔한다. 새 제약이 구 허용값의 상위집합이라 기존
-- 행은 모두 만족하므로 VALIDATE가 실패하지 않는다.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'comment_on_post',
  'reply_on_comment',
  'reply_on_post',
  'reaction_on_comment',
  'reaction_on_reply',
  'like_on_post',
  'mention_on_comment',
  'mention_on_reply'
)) NOT VALID;
ALTER TABLE notifications VALIDATE CONSTRAINT notifications_type_check;
