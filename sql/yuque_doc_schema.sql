CREATE TABLE IF NOT EXISTS `yuque_book` (
  `id` bigint NOT NULL COMMENT 'id',
  `namespace` varchar(255) NOT NULL COMMENT 'Yuque repo namespace, e.g. user/book',
  `slug` varchar(100) NOT NULL COMMENT 'site route slug',
  `name` varchar(100) NOT NULL COMMENT 'book name',
  `description` varchar(512) DEFAULT NULL COMMENT 'book description',
  `visibility` varchar(20) NOT NULL DEFAULT 'public' COMMENT 'public/login/admin',
  `status` varchar(20) NOT NULL DEFAULT 'online' COMMENT 'online/offline',
  `lastSyncAt` datetime DEFAULT NULL COMMENT 'last sync time',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_slug` (`slug`),
  KEY `idx_status_visibility` (`status`, `visibility`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Yuque doc book cache';

CREATE TABLE IF NOT EXISTS `yuque_doc` (
  `id` bigint NOT NULL COMMENT 'id',
  `bookId` bigint NOT NULL COMMENT 'book id',
  `yuqueDocId` varchar(64) DEFAULT NULL COMMENT 'Yuque doc id',
  `slug` varchar(255) NOT NULL COMMENT 'doc slug',
  `title` varchar(255) NOT NULL COMMENT 'doc title',
  `description` varchar(512) DEFAULT NULL COMMENT 'doc description',
  `bodyMarkdown` longtext DEFAULT NULL COMMENT 'markdown content',
  `bodyHtml` longtext DEFAULT NULL COMMENT 'html content',
  `coverUrl` varchar(512) DEFAULT NULL COMMENT 'cover url',
  `visibility` varchar(20) NOT NULL DEFAULT 'public' COMMENT 'public/login/admin',
  `status` varchar(20) NOT NULL DEFAULT 'online' COMMENT 'online/offline',
  `sourceUpdatedAt` datetime DEFAULT NULL COMMENT 'Yuque updated time',
  `lastSyncAt` datetime DEFAULT NULL COMMENT 'last sync time',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_book_slug` (`bookId`, `slug`),
  KEY `idx_book_status_visibility` (`bookId`, `status`, `visibility`),
  FULLTEXT KEY `ft_doc_search` (`title`, `description`, `bodyMarkdown`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Yuque doc content cache';

CREATE TABLE IF NOT EXISTS `yuque_toc` (
  `id` bigint NOT NULL COMMENT 'id',
  `bookId` bigint NOT NULL COMMENT 'book id',
  `docId` bigint DEFAULT NULL COMMENT 'doc id',
  `parentId` bigint DEFAULT NULL COMMENT 'parent toc id',
  `title` varchar(255) NOT NULL COMMENT 'toc title',
  `slug` varchar(255) DEFAULT NULL COMMENT 'doc slug',
  `depth` int NOT NULL DEFAULT 1 COMMENT 'toc depth',
  `sort` int NOT NULL DEFAULT 0 COMMENT 'sort order',
  `createTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'create time',
  `updateTime` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'update time',
  `isDelete` tinyint NOT NULL DEFAULT 0 COMMENT 'logic delete',
  PRIMARY KEY (`id`),
  KEY `idx_book_sort` (`bookId`, `sort`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Yuque doc toc cache';
