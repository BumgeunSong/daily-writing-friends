-- ================================================
-- Reactions Table: Proper FK Relationships
-- Migration: 20260106000002_reactions_proper_fks
-- ================================================
-- Replace polymorphic entity_type/entity_id with proper nullable FKs.
-- This provides referential integrity and better query performance.

-- Drop existing reactions table (which uses polymorphic pattern)
DROP TABLE IF EXISTS reactions;

-- Recreate with proper FK relationships
-- Historical Identity: user_name/user_profile_image stored at reaction time
CREATE TABLE reactions (
  id TEXT PRIMARY KEY,
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  reply_id TEXT REFERENCES replies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,  -- emoji character
  user_name TEXT NOT NULL DEFAULT '',
  user_profile_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Exactly one of comment_id or reply_id must be set
  CONSTRAINT reactions_single_entity CHECK (
    (comment_id IS NOT NULL AND reply_id IS NULL) OR
    (comment_id IS NULL AND reply_id IS NOT NULL)
  )
);

-- Indexes for lookups
CREATE INDEX idx_reactions_comment ON reactions(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_reactions_reply ON reactions(reply_id) WHERE reply_id IS NOT NULL;
CREATE INDEX idx_reactions_user ON reactions(user_id);

-- One reaction per user per comment
CREATE UNIQUE INDEX idx_reactions_comment_user ON reactions(comment_id, user_id) WHERE comment_id IS NOT NULL;

-- One reaction per user per reply
CREATE UNIQUE INDEX idx_reactions_reply_user ON reactions(reply_id, user_id) WHERE reply_id IS NOT NULL;
