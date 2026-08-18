-- Tutorial book and chapter hierarchy for existing blog installations.
-- Safe to run repeatedly on MySQL versions without ADD COLUMN/INDEX IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS `blog_book` (
  `id` bigint NOT NULL COMMENT 'id',
  `authorId` bigint NOT NULL COMMENT 'creator user id',
  `categoryId` bigint NOT NULL COMMENT 'inherited category id',
  `title` varchar(255) NOT NULL COMMENT 'book title',
  `slug` varchar(160) NOT NULL COMMENT 'route slug',
  `summary` varchar(1000) DEFAULT NULL COMMENT 'book summary',
  `coverUrl` varchar(1024) DEFAULT NULL COMMENT 'cover image url',
  `seoTitle` varchar(255) DEFAULT NULL COMMENT 'SEO title',
  `seoDescription` varchar(512) DEFAULT NULL COMMENT 'SEO description',
  `status` varchar(20) NOT NULL DEFAULT 'disabled' COMMENT 'enabled/disabled',
  `sort` int NOT NULL DEFAULT 0 COMMENT 'sort order',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_book_slug` (`slug`),
  KEY `idx_blog_book_category_status_sort` (`categoryId`, `status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Blog tutorial book';

CREATE TABLE IF NOT EXISTS `blog_chapter` (
  `id` bigint NOT NULL COMMENT 'id',
  `bookId` bigint NOT NULL COMMENT 'tutorial book id',
  `title` varchar(255) NOT NULL COMMENT 'chapter title',
  `description` varchar(1000) DEFAULT NULL COMMENT 'chapter description',
  `sort` int NOT NULL DEFAULT 0 COMMENT 'chapter order',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  KEY `idx_blog_chapter_book_sort` (`bookId`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Blog tutorial chapter';

SET @column_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_post' AND COLUMN_NAME = 'chapterId'
);
SET @ddl = IF(@column_exists = 0,
  'ALTER TABLE blog_post ADD COLUMN chapterId BIGINT DEFAULT NULL COMMENT ''tutorial chapter id, null for standalone post'' AFTER categoryId',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_post' AND COLUMN_NAME = 'chapterSort'
);
SET @ddl = IF(@column_exists = 0,
  'ALTER TABLE blog_post ADD COLUMN chapterSort INT NOT NULL DEFAULT 0 COMMENT ''post order within chapter'' AFTER chapterId',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_post' AND INDEX_NAME = 'idx_blog_post_chapter_sort'
);
SET @ddl = IF(@index_exists = 0,
  'CREATE INDEX idx_blog_post_chapter_sort ON blog_post (chapterId, chapterSort)',
  'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
