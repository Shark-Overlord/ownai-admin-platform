-- Rich-text introduction for tutorial books.
-- Safe to run repeatedly on MySQL versions without ADD COLUMN IF NOT EXISTS.

SET @has_blog_book_introduction_html = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'blog_book'
    AND COLUMN_NAME = 'introductionHtml'
);
SET @add_blog_book_introduction_html = IF(
  @has_blog_book_introduction_html = 0,
  'ALTER TABLE blog_book ADD COLUMN introductionHtml MEDIUMTEXT NULL COMMENT ''sanitized rich-text book introduction'' AFTER summary',
  'SELECT 1'
);
PREPARE stmt FROM @add_blog_book_introduction_html;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Preserve existing plain-text summaries as the first rich-text introduction.
UPDATE blog_book
SET introductionHtml = CONCAT(
  '<p>',
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(summary, '&', CHAR(38, 97, 109, 112, 59)),
          '<', CHAR(38, 108, 116, 59)
        ),
        '>', CHAR(38, 103, 116, 59)
      ),
      CHAR(13), ''
    ),
    CHAR(10), '<br>'
  ),
  '</p>'
)
WHERE (introductionHtml IS NULL OR introductionHtml = '')
  AND summary IS NOT NULL
  AND summary <> '';
