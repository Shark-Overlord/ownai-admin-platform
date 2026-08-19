CREATE TABLE IF NOT EXISTS `blog_category` (
  `id` bigint NOT NULL COMMENT 'id',
  `name` varchar(100) NOT NULL COMMENT 'category name',
  `slug` varchar(100) NOT NULL COMMENT 'route slug',
  `description` varchar(512) DEFAULT NULL COMMENT 'category description',
  `coverUrl` varchar(1024) DEFAULT NULL COMMENT 'cover image url',
  `sort` int NOT NULL DEFAULT 0 COMMENT 'sort order',
  `status` varchar(20) NOT NULL DEFAULT 'enabled' COMMENT 'enabled/disabled',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_category_name` (`name`),
  UNIQUE KEY `uk_blog_category_slug` (`slug`),
  KEY `idx_blog_category_status_sort` (`status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Blog category';

CREATE TABLE IF NOT EXISTS `blog_tag` (
  `id` bigint NOT NULL COMMENT 'id',
  `name` varchar(100) NOT NULL COMMENT 'tag name',
  `slug` varchar(100) NOT NULL COMMENT 'route slug',
  `description` varchar(512) DEFAULT NULL COMMENT 'tag description',
  `sort` int NOT NULL DEFAULT 0 COMMENT 'sort order',
  `status` varchar(20) NOT NULL DEFAULT 'enabled' COMMENT 'enabled/disabled',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_tag_name` (`name`),
  UNIQUE KEY `uk_blog_tag_slug` (`slug`),
  KEY `idx_blog_tag_status_sort` (`status`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Blog tag';

CREATE TABLE IF NOT EXISTS `blog_book` (
  `id` bigint NOT NULL COMMENT 'id',
  `authorId` bigint NOT NULL COMMENT 'creator user id',
  `categoryId` bigint NOT NULL COMMENT 'inherited category id',
  `title` varchar(255) NOT NULL COMMENT 'book title',
  `slug` varchar(160) NOT NULL COMMENT 'route slug',
  `summary` varchar(1000) DEFAULT NULL COMMENT 'book summary',
  `introductionHtml` mediumtext COMMENT 'sanitized rich-text book introduction',
  `coverUrl` varchar(1024) DEFAULT NULL COMMENT 'cover image url',
  `seoTitle` varchar(255) DEFAULT NULL COMMENT 'SEO title',
  `seoDescription` varchar(512) DEFAULT NULL COMMENT 'SEO description',
  `memberOnly` tinyint NOT NULL DEFAULT 0 COMMENT '0 free tutorial, 1 member-only tutorial',
  `status` varchar(20) NOT NULL DEFAULT 'disabled' COMMENT 'enabled/disabled',
  `sort` int NOT NULL DEFAULT 0 COMMENT 'sort order',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_book_slug` (`slug`),
  KEY `idx_blog_book_category_status_sort` (`categoryId`, `status`, `sort`),
  KEY `idx_blog_book_member_only_status_sort` (`memberOnly`, `status`, `sort`)
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

CREATE TABLE IF NOT EXISTS `blog_post` (
  `id` bigint NOT NULL COMMENT 'id',
  `authorId` bigint NOT NULL COMMENT 'author user id',
  `categoryId` bigint NOT NULL COMMENT 'blog category id',
  `chapterId` bigint DEFAULT NULL COMMENT 'tutorial chapter id, null for standalone post',
  `chapterSort` int NOT NULL DEFAULT 0 COMMENT 'post order within chapter',
  `title` varchar(255) NOT NULL COMMENT 'post title',
  `slug` varchar(160) NOT NULL COMMENT 'route slug',
  `summary` varchar(1000) DEFAULT NULL COMMENT 'post summary',
  `coverUrl` varchar(1024) DEFAULT NULL COMMENT 'cover image url',
  `contentJson` longtext COMMENT 'Tiptap JSON source',
  `contentHtml` longtext COMMENT 'sanitized render snapshot',
  `contentSchemaVersion` int NOT NULL DEFAULT 1 COMMENT 'editor schema version',
  `status` varchar(20) NOT NULL DEFAULT 'draft' COMMENT 'draft/published/offline',
  `visibility` varchar(20) NOT NULL DEFAULT 'public' COMMENT 'public/login/admin',
  `memberOnly` tinyint NOT NULL DEFAULT 0 COMMENT '0 free, 1 member only',
  `seoTitle` varchar(255) DEFAULT NULL COMMENT 'SEO title',
  `seoDescription` varchar(512) DEFAULT NULL COMMENT 'SEO description',
  `publishedAt` datetime DEFAULT NULL COMMENT 'publish time',
  `version` int NOT NULL DEFAULT 1 COMMENT 'optimistic lock version',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_post_slug` (`slug`),
  KEY `idx_blog_post_category` (`categoryId`, `status`, `publishedAt`),
  KEY `idx_blog_post_chapter_sort` (`chapterId`, `chapterSort`),
  KEY `idx_blog_post_status_publish` (`status`, `visibility`, `publishedAt`),
  KEY `idx_blog_post_member_only` (`memberOnly`, `status`, `publishedAt`),
  FULLTEXT KEY `ft_blog_post_search` (`title`, `summary`, `contentHtml`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Blog post';

CREATE TABLE IF NOT EXISTS `blog_post_tag` (
  `id` bigint NOT NULL COMMENT 'id',
  `postId` bigint NOT NULL COMMENT 'blog post id',
  `tagId` bigint NOT NULL COMMENT 'blog tag id',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_post_tag` (`postId`, `tagId`),
  KEY `idx_blog_post_tag_tag` (`tagId`, `postId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Blog post tag relation';

CREATE TABLE IF NOT EXISTS `blog_book_favorite` (
  `id` bigint NOT NULL COMMENT 'id',
  `userId` bigint NOT NULL COMMENT 'user id',
  `bookId` bigint NOT NULL COMMENT 'tutorial book id',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_book_favorite_user_book` (`userId`, `bookId`),
  KEY `idx_blog_book_favorite_user` (`userId`, `isDelete`, `updateTime`),
  KEY `idx_blog_book_favorite_book` (`bookId`, `isDelete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='user favorite tutorial books';

CREATE TABLE IF NOT EXISTS `blog_post_favorite` (
  `id` bigint NOT NULL COMMENT 'id',
  `userId` bigint NOT NULL COMMENT 'user id',
  `postId` bigint NOT NULL COMMENT 'tutorial post id',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_post_favorite_user_post` (`userId`, `postId`),
  KEY `idx_blog_post_favorite_user` (`userId`, `isDelete`, `updateTime`),
  KEY `idx_blog_post_favorite_post` (`postId`, `isDelete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='user favorite tutorial posts';

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

CREATE TABLE IF NOT EXISTS `blog_post_revision` (
  `id` bigint NOT NULL COMMENT 'id',
  `postId` bigint NOT NULL COMMENT 'blog post id',
  `revisionNo` int NOT NULL COMMENT 'revision number',
  `title` varchar(255) NOT NULL COMMENT 'snapshot title',
  `summary` varchar(1000) DEFAULT NULL COMMENT 'snapshot summary',
  `coverUrl` varchar(1024) DEFAULT NULL COMMENT 'snapshot cover',
  `contentJson` longtext COMMENT 'snapshot Tiptap JSON',
  `contentHtml` longtext COMMENT 'snapshot sanitized HTML',
  `createdBy` bigint NOT NULL COMMENT 'operator user id',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blog_post_revision` (`postId`, `revisionNo`),
  KEY `idx_blog_post_revision_time` (`postId`, `createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Blog post publish revision';
