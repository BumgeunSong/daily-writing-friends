-- SQL tests for migration 20260505000000_add_onboarding_complete_and_kakao_id.
--
-- Run with:
--   docker exec -i supabase_db_DailyWritingFriends \
--     psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
--     < tests/e2e/sql/users-onboarding-constraints.test.sql
--
-- The script creates rows under public.users (FK to auth.users) using auth.admin
-- via the auth.uid foreign key — so we first stage user IDs in auth.users.

BEGIN;

-- Set up four fixture rows in auth.users + users. We bypass RLS by using the
-- postgres superuser connection.
WITH inserted AS (
  INSERT INTO auth.users (id, instance_id, email, aud, role, email_confirmed_at, created_at, updated_at)
  VALUES
    ('a0000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-onboarded-permission@example.com', 'authenticated', 'authenticated', now(), now(), now()),
    ('a0000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-onboarded-waitlist@example.com',   'authenticated', 'authenticated', now(), now(), now()),
    ('a0000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-onboarded-phone@example.com',      'authenticated', 'authenticated', now(), now(), now()),
    ('a0000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'fixture-no-signal@example.com',            'authenticated', 'authenticated', now(), now(), now())
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
SELECT count(*) AS inserted_auth_users FROM inserted;

INSERT INTO public.users (id, real_name, phone_number)
VALUES
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'Phone Person', '01012345678');

INSERT INTO public.users (id, real_name)
VALUES
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Permission Person'),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Waitlist Person'),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'No Signal Person');

-- T.10: CHECK constraint rejects onboarded row without contact info.
-- Capture the constraint name so this test fails if the violation is masked by
-- some unrelated CHECK that gets added later.
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  BEGIN
    UPDATE public.users
       SET onboarding_complete = true
     WHERE id = 'a0000000-0000-0000-0000-000000000004'::uuid;
    RAISE EXCEPTION 'expected users_contact_required_when_onboarded violation but UPDATE succeeded';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint <> 'users_contact_required_when_onboarded' THEN
      RAISE EXCEPTION 'expected users_contact_required_when_onboarded but got %', v_constraint;
    END IF;
  END;
END $$;

-- T.10: valid path — set onboarding_complete on a row that already has contact info.
UPDATE public.users
   SET onboarding_complete = true
 WHERE id = 'a0000000-0000-0000-0000-000000000003'::uuid;

-- T.12: kakao_id format CHECK rejects forbidden chars.
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  BEGIN
    UPDATE public.users
       SET kakao_id = '<script>alert(1)</script>'
     WHERE id = 'a0000000-0000-0000-0000-000000000004'::uuid;
    RAISE EXCEPTION 'expected users_kakao_id_format violation';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    IF v_constraint <> 'users_kakao_id_format' THEN
      RAISE EXCEPTION 'expected users_kakao_id_format but got %', v_constraint;
    END IF;
  END;
END $$;

-- T.12: valid kakao_id passes.
UPDATE public.users
   SET kakao_id = 'valid_id-123'
 WHERE id = 'a0000000-0000-0000-0000-000000000004'::uuid;

ROLLBACK;
