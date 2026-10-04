-- Versioned image classification catalog.
-- Additive only: existing prompt_asset/category/tag rows are never changed.

CREATE TABLE IF NOT EXISTS `image_catalog_version` (
  `id` BIGINT NOT NULL,
  `categoryId` BIGINT NOT NULL,
  `assetType` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT / REVIEWED / ACTIVE / RETIRED',
  `sourceSha256` CHAR(64) NOT NULL,
  `expectedAssetCount` INT NOT NULL,
  `createUserId` BIGINT NOT NULL,
  `reviewUserId` BIGINT DEFAULT NULL,
  `activateUserId` BIGINT DEFAULT NULL,
  `reviewTime` DATETIME DEFAULT NULL,
  `activateTime` DATETIME DEFAULT NULL,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `isDelete` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_image_catalog_scope_name` (`categoryId`, `assetType`, `name`, `isDelete`),
  KEY `idx_image_catalog_scope_status` (`categoryId`, `assetType`, `status`, `isDelete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `image_channel` (
  `id` BIGINT NOT NULL,
  `catalogVersionId` BIGINT NOT NULL,
  `channelCode` VARCHAR(64) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `sort` INT NOT NULL,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDelete` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_image_channel_code` (`catalogVersionId`, `channelCode`, `isDelete`),
  UNIQUE KEY `uk_image_channel_name` (`catalogVersionId`, `name`, `isDelete`),
  UNIQUE KEY `uk_image_channel_sort` (`catalogVersionId`, `sort`, `isDelete`),
  KEY `idx_image_channel_version` (`catalogVersionId`, `isDelete`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `image_catalog_import_batch` (
  `id` BIGINT NOT NULL,
  `catalogVersionId` BIGINT NOT NULL,
  `batchKey` VARCHAR(128) NOT NULL,
  `sourceSha256` CHAR(64) NOT NULL,
  `batchSha256` CHAR(64) NOT NULL,
  `recordCount` INT NOT NULL,
  `relationCount` INT NOT NULL,
  `status` VARCHAR(16) NOT NULL,
  `createUserId` BIGINT NOT NULL,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finishTime` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_image_catalog_import_batch` (`catalogVersionId`, `batchKey`),
  KEY `idx_image_catalog_import_status` (`catalogVersionId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `image_channel_member` (
  `id` BIGINT NOT NULL,
  `catalogVersionId` BIGINT NOT NULL,
  `channelId` BIGINT NOT NULL,
  `promptAssetId` BIGINT NOT NULL,
  `sourceVersion` CHAR(64) NOT NULL,
  `sourceUpdateTime` DATETIME NOT NULL,
  `sourceStatus` TINYINT NOT NULL,
  `inputSha256` CHAR(64) NOT NULL,
  `decisionMethod` VARCHAR(96) NOT NULL,
  `evidenceJson` LONGTEXT DEFAULT NULL,
  `batchId` BIGINT NOT NULL,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDelete` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_image_channel_member` (`catalogVersionId`, `channelId`, `promptAssetId`, `isDelete`),
  KEY `idx_image_channel_member_asset` (`catalogVersionId`, `promptAssetId`, `isDelete`),
  KEY `idx_image_channel_member_channel` (`channelId`, `promptAssetId`, `isDelete`),
  KEY `idx_image_channel_member_batch` (`batchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
