-- 3줄쓰기(just-three-questions) 질문 풀을 admin에서 동적으로 관리할 수 있도록
-- DB 테이블로 옮긴다. boards와 동일한 패턴: 공개 SELECT, 쓰기는 service_role
-- (admin 앱)만 가능. 20260611 기본 GRANT가 anon/authenticated에도 쓰기 권한을
-- 부여하므로, 20260823010000과 동일하게 REVOKE로 명시적으로 잠근다.

CREATE TABLE just_three_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE just_three_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Just-three-questions are viewable by everyone"
  ON just_three_questions FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE ON just_three_questions FROM anon, authenticated;

-- 기존 하드코딩 배열(apps/web/src/post/data/justThreeQuestions.ts)의 23개
-- 질문을 그대로 시드해 전환 시 풀이 비지 않게 한다.
INSERT INTO just_three_questions (question) VALUES
  ('오늘 속으로 가장 많이 한 말은?'),
  ('오늘 기분 좋았던 일을 5자로 적는다면?'),
  ('내일의 나에게 한마디?'),
  ('오늘을 되돌아봤을 때 기록해두고 싶은 3단어는?'),
  ('매일 4시간만 자도 개운한 것 vs 먹고 싶은 거 다 먹어도 살 안 찌는 것, 고른다면?'),
  ('오늘 가장 아쉬웠던 순간은?'),
  ('지금 가장 듣고 싶은 말은?'),
  ('오늘 나를 웃게 한 건?'),
  ('요즘 제일 미루고 있는 일은?'),
  ('오늘 하루를 색깔로 표현한다면?'),
  ('지금 머릿속에 맴도는 노래는?'),
  ('오늘 처음 한 생각은?'),
  ('요즘 자주 검색하는 단어는?'),
  ('오늘 가장 편했던 순간은?'),
  ('지금 냉장고에 있는 것 중 먹고 싶은 건?'),
  ('오늘 고마웠던 사람은?'),
  ('이번 주말에 하고 싶은 건?'),
  ('요즘 반복되는 고민은?'),
  ('오늘 나를 가장 웃게 만든 사람은?'),
  ('지금 당장 떠나고 싶은 곳은?'),
  ('오늘 배운 것 한 가지는?'),
  ('요즘 가장 자주 듣는 말은?'),
  ('내일 꼭 하고 싶은 일 하나는?');
