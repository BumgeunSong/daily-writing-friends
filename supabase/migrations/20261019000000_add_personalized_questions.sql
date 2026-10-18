-- 3줄쓰기 개인화 질문: 사용자의 최근 public 글에서 파생된 후속 질문을 저장한다.
-- 질문은 글의 요지를 드러내므로 본인만 SELECT할 수 있고, 생성(INSERT)·삭제는
-- service_role(Edge Function)만 한다. 20260611 기본 GRANT가 anon/authenticated에도
-- 쓰기 권한을 부여하므로 REVOKE로 명시적으로 잠그고, 클라이언트에는
-- answered_at 컬럼 단위 UPDATE만 열어 둔다.

BEGIN;

CREATE TABLE personalized_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_post_id TEXT NOT NULL UNIQUE REFERENCES posts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX personalized_questions_user_id_idx ON personalized_questions (user_id);

ALTER TABLE personalized_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personalized questions are viewable by their owner"
  ON personalized_questions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Personalized questions are answerable by their owner"
  ON personalized_questions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON personalized_questions FROM anon, authenticated;
GRANT SELECT ON personalized_questions TO authenticated;
GRANT UPDATE (answered_at) ON personalized_questions TO authenticated;

-- public 글이 발행되면 질문 생성 Edge Function을 호출한다. 비공개 글은 함수에
-- 도달하지 않는다. 실패는 감수한다: 후보 하나가 빠져도 공통 질문 폴백이 있다.
-- INSERT에만 걸기 때문에 비공개로 썼다가 공개로 바꾼 글은 질문이 생성되지 않는다.
CREATE OR REPLACE FUNCTION notify_on_public_post() RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.visibility = 'public' THEN
    PERFORM net.http_post(
      url := get_app_config('edge_function_url') || '/generate-personalized-question',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || get_app_config('service_role_key')
      ),
      body := jsonb_build_object('post_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION notify_on_public_post() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trigger_generate_personalized_question
  AFTER INSERT ON posts
  FOR EACH ROW EXECUTE FUNCTION notify_on_public_post();

COMMIT;
