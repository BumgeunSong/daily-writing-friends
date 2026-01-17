-- Phase 2: Add drafts and reviews tables for dual-write support

-- Drafts table
CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  content_json JSONB,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drafts_user_board ON drafts(user_id, board_id, saved_at DESC);

-- Reviews table (board feedback)
CREATE TABLE reviews (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_nickname TEXT,
  keep_text TEXT,
  problem_text TEXT,
  try_text TEXT,
  nps INTEGER,
  will_continue BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(board_id, reviewer_id)
);

CREATE INDEX idx_reviews_board ON reviews(board_id);
CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
