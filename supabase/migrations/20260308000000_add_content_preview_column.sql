-- Add a stored generated column with the first 500 characters of content.
-- List queries select this instead of the full content column to reduce egress.
-- 500 chars of HTML is enough for card preview text after DOMPurify processing.
ALTER TABLE posts
  ADD COLUMN content_preview text
  GENERATED ALWAYS AS (LEFT(content, 500)) STORED;
