-- ================================================
-- Historical Identity: Denormalized User Info
-- Migration: 20260106000003_historical_identity
-- ================================================
--
-- DESIGN DECISION: Store user name/photo at action time (historical identity)
-- rather than always showing current user info (current identity).
--
-- Rationale:
-- 1. Performance: Avoids JOINs when loading PostDetailPage with many
--    comments, replies, and reactions
-- 2. Authenticity: Preserves the identity at the moment of interaction
--    (e.g., comment by "John" stays "John" even if user renames to "Johnny")
-- 3. Consistency with Firestore: Matches existing data model
--
-- Trade-off: User profile updates won't reflect in past interactions.
-- This is acceptable for a writing community where historical context matters.

-- ================================================
-- Comments: Add historical user info
-- ================================================
ALTER TABLE comments ADD COLUMN user_name TEXT NOT NULL DEFAULT '';
ALTER TABLE comments ADD COLUMN user_profile_image TEXT;

-- ================================================
-- Replies: Add historical user info
-- ================================================
ALTER TABLE replies ADD COLUMN user_name TEXT NOT NULL DEFAULT '';
ALTER TABLE replies ADD COLUMN user_profile_image TEXT;

-- ================================================
-- Likes: Add historical user info
-- ================================================
ALTER TABLE likes ADD COLUMN user_name TEXT;
ALTER TABLE likes ADD COLUMN user_profile_image TEXT;

-- ================================================
-- Reactions: Add historical user info
-- ================================================
ALTER TABLE reactions ADD COLUMN user_name TEXT;
ALTER TABLE reactions ADD COLUMN user_profile_image TEXT;
