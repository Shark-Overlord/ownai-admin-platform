-- Effective tutorial article reads.
-- One reader contributes at most one read to one article per Asia/Shanghai business day.
-- The legacy blog_post.viewCount column is removed by blog_post_remove_view_count_migration.sql.

CREATE TABLE IF NOT EXISTS `blog_post_read_event` (
  `id` bigint NOT NULL COMMENT 'id',
  `postId` bigint NOT NULL COMMENT 'blog post id',
  `bookId` bigint DEFAULT NULL COMMENT 'tutorial book id at read time',
  `userId` bigint DEFAULT NULL COMMENT 'authenticated user id',
  `visitorHash` char(64) NOT NULL COMMENT 'protected browser visitor id',
  `readerKey` char(64) NOT NULL COMMENT 'protected effective reader identity',
  `readDate` date NOT NULL COMMENT 'business date in Asia/Shanghai',
  `durationSeconds` int NOT NULL COMMENT 'reported foreground reading duration',
  `eventTime` datetime NOT NULL COMMENT 'effective read time',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_post_reader_date` (`postId`, `readerKey`, `readDate`),
  KEY `idx_blog_post_read_date` (`readDate`, `postId`),
  KEY `idx_blog_post_read_book_date` (`bookId`, `readDate`),
  KEY `idx_blog_post_read_reader` (`readerKey`, `eventTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Effective tutorial article read event';
