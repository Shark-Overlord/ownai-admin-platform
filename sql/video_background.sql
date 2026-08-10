-- Video background assets. Safe to run on an existing OwnAI database.
CREATE TABLE IF NOT EXISTS `video_background` (
  `id` BIGINT NOT NULL,
  `title` VARCHAR(128) NOT NULL,
  `summary` VARCHAR(512) DEFAULT NULL,
  `promptContent` LONGTEXT DEFAULT NULL,
  `coverUrl` VARCHAR(1024) DEFAULT NULL,
  `previewVideoUrl` VARCHAR(1024) DEFAULT NULL,
  `sourceVideoUrl` VARCHAR(1024) DEFAULT NULL,
  `categoryId` BIGINT NOT NULL,
  `memberOnly` TINYINT NOT NULL DEFAULT 0,
  `status` TINYINT NOT NULL DEFAULT 0,
  `videoWidth` INT DEFAULT NULL,
  `videoHeight` INT DEFAULT NULL,
  `durationMs` BIGINT DEFAULT NULL,
  `fileSize` BIGINT DEFAULT NULL,
  `videoFormat` VARCHAR(32) DEFAULT NULL,
  `userId` BIGINT NOT NULL,
  `sort` INT NOT NULL DEFAULT 0,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `isDelete` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_video_background_public` (`status`, `categoryId`, `memberOnly`, `sort`, `id`),
  KEY `idx_video_background_category` (`categoryId`),
  KEY `idx_video_background_create_time` (`createTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `video_background_tag` (
  `id` BIGINT NOT NULL,
  `videoBackgroundId` BIGINT NOT NULL,
  `tagId` BIGINT NOT NULL,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_video_background_tag` (`videoBackgroundId`, `tagId`),
  KEY `idx_video_background_tag_tag` (`tagId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
