-- Remove the legacy request-count field after effective read tracking is available.
-- This migration is repeatable and only targets blog_post.viewCount.

SET @has_blog_post_view_count = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_post' AND COLUMN_NAME = 'viewCount'
);
SET @drop_blog_post_view_count = IF(
  @has_blog_post_view_count = 1,
  'ALTER TABLE blog_post DROP COLUMN viewCount',
  'SELECT 1'
);
PREPARE stmt FROM @drop_blog_post_view_count;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
