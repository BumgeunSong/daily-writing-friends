-- Add onboarding_complete + kakao_id columns to users.
-- Backfill existing onboarded users (board permission, waiting list, or phone_number).
-- Enforce contact-required-when-onboarded via NOT VALID + VALIDATE for short ACCESS lock.

-- 1. Boolean column with constant-time DEFAULT (no row scan in Postgres 11+).
ALTER TABLE public.users
  ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT false;

-- 2. Kakao ID column.
ALTER TABLE public.users
  ADD COLUMN kakao_id TEXT;

-- 3. Kakao ID format CHECK. Cheap because column is freshly NULL for all rows.
ALTER TABLE public.users
  ADD CONSTRAINT users_kakao_id_format
  CHECK (
    kakao_id IS NULL
    OR (char_length(kakao_id) BETWEEN 1 AND 50 AND kakao_id ~ '^[A-Za-z0-9._-]+$')
  );

-- 4. Backfill: mark users as onboarded if they show any pre-existing onboarding signal,
--    AND they have at least one contact value. The contact-AND clause defends against
--    permission/waitlist rows that somehow lack phone_number — without it, step 5's
--    VALIDATE would crash the migration. In real production data this never fires
--    (permission-granted users always have phone_number), but the guard is cheap.
UPDATE public.users SET onboarding_complete = true
WHERE
  (
    id IN (SELECT DISTINCT user_id FROM public.user_board_permissions)
    OR id IN (SELECT DISTINCT user_id FROM public.board_waiting_users)
    OR phone_number IS NOT NULL
  )
  AND (phone_number IS NOT NULL OR kakao_id IS NOT NULL);

-- 5. Contact-required-when-onboarded constraint. NOT VALID + VALIDATE pattern uses
--    SHARE UPDATE EXCLUSIVE rather than ACCESS EXCLUSIVE during the row scan.
ALTER TABLE public.users
  ADD CONSTRAINT users_contact_required_when_onboarded
  CHECK (NOT onboarding_complete OR phone_number IS NOT NULL OR kakao_id IS NOT NULL)
  NOT VALID;

ALTER TABLE public.users
  VALIDATE CONSTRAINT users_contact_required_when_onboarded;
