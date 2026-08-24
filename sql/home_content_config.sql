CREATE TABLE IF NOT EXISTS `home_content_config` (
  `id` BIGINT NOT NULL COMMENT 'Singleton configuration ID',
  `configJson` MEDIUMTEXT NOT NULL COMMENT 'Structured homepage content JSON',
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `isDelete` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_home_content_update` (`updateTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Homepage content configuration';
