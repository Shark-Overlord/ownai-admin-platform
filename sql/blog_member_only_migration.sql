-- Add member-only access control to blog posts.
-- Safe to run repeatedly on MySQL versions without ADD COLUMN IF NOT EXISTS.

SET @column_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_post' AND COLUMN_NAME = 'memberOnly'
);
SET @ddl = IF(@column_exists = 0,
  'ALTER TABLE blog_post ADD COLUMN memberOnly TINYINT NOT NULL DEFAULT 0 COMMENT ''0 free, 1 member only'' AFTER visibility',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_post' AND INDEX_NAME = 'idx_blog_post_member_only'
);
SET @ddl = IF(@index_exists = 0,
  'CREATE INDEX idx_blog_post_member_only ON blog_post (memberOnly, status, publishedAt)',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
