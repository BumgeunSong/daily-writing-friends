-- ================================================
-- Reactions Table: Proper FK Relationships
-- Migration: 20260106000002_reactions_proper_fks
-- ================================================
-- Replace polymorphic entity_type/entity_id with proper nullable FKs.
-- This provides referential integrity and better query performance.
-- NON-DESTRUCTIVE: Uses ALTER TABLE to preserve existing data.

-- Step 1: Add new FK columns (nullable initially)
ALTER TABLE reactions ADD COLUMN comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE reactions ADD COLUMN reply_id TEXT REFERENCES replies(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data from polymorphic to proper FKs
UPDATE reactions SET comment_id = entity_id WHERE entity_type = 'comment';
UPDATE reactions SET reply_id = entity_id WHERE entity_type = 'reply';

-- Step 3: Drop the old polymorphic constraint and columns
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_entity_type_check;
ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_entity_type_entity_id_user_id_key;
ALTER TABLE reactions DROP COLUMN entity_type;
ALTER TABLE reactions DROP COLUMN entity_id;

-- Step 4: Add new constraint - exactly one of comment_id or reply_id must be set
ALTER TABLE reactions ADD CONSTRAINT reactions_single_entity CHECK (
  (comment_id IS NOT NULL AND reply_id IS NULL) OR
  (comment_id IS NULL AND reply_id IS NOT NULL)
);

-- Step 5: Add indexes for lookups
CREATE INDEX IF NOT EXISTS idx_reactions_comment ON reactions(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_reply ON reactions(reply_id) WHERE reply_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);

-- Step 6: Add unique constraints - one reaction per user per entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_comment_user ON reactions(comment_id, user_id) WHERE comment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reactions_reply_user ON reactions(reply_id, user_id) WHERE reply_id IS NOT NULL;
