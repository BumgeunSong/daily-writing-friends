-- Add content_length stored generated column for lightweight activity queries.
-- The posting/activity queries (38.7% of DB time) previously selected full `content`
-- (potentially many KB of HTML) only to compute content.length on the client.
-- This column provides the length directly, eliminating large column transfer.
--
-- Note: Postgres length() counts Unicode codepoints (emoji = 1), whereas the
-- previous JS String.length counted UTF-16 code units (emoji = 2). The difference
-- is negligible for writing-stats heatmap display purposes.
ALTER TABLE posts
  ADD COLUMN content_length integer
  GENERATED ALWAYS AS (length(content)) STORED;
