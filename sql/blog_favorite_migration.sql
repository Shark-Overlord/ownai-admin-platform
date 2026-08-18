-- User favorites for tutorial books and tutorial posts.
-- Safe to run repeatedly.

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='user favorite tutorial books';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='user favorite tutorial posts';
