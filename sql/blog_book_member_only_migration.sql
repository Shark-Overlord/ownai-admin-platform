-- Tutorial book access is independent from the access level of its articles.
-- Existing books default to free; this migration never changes blog_post.memberOnly.

SET @has_blog_book_member_only = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_book' AND COLUMN_NAME = 'memberOnly'
);
SET @add_blog_book_member_only = IF(
  @has_blog_book_member_only = 0,
  'ALTER TABLE blog_book ADD COLUMN memberOnly TINYINT NOT NULL DEFAULT 0 COMMENT ''0 free tutorial, 1 member-only tutorial'' AFTER seoDescription',
  'SELECT 1'
);
PREPARE stmt FROM @add_blog_book_member_only;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_blog_book_member_only_index = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_book'
    AND INDEX_NAME = 'idx_blog_book_member_only_status_sort'
);
SET @add_blog_book_member_only_index = IF(
  @has_blog_book_member_only_index = 0,
  'CREATE INDEX idx_blog_book_member_only_status_sort ON blog_book (memberOnly, status, sort)',
  'SELECT 1'
);
PREPARE stmt FROM @add_blog_book_member_only_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
