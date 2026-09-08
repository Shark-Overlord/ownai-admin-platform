-- Per-resource draft replacement mapping for modules that keep published content in a single row.
-- Safe additive migration: existing content tables and rows are not changed.
CREATE TABLE IF NOT EXISTS `content_module_draft_bridge` (
  `id` BIGINT NOT NULL,
  `resourceType` VARCHAR(64) NOT NULL,
  `targetId` BIGINT NOT NULL COMMENT 'currently published resource id',
  `draftId` BIGINT NOT NULL COMMENT 'native draft clone shown in the original module',
  `baseVersion` CHAR(64) NOT NULL COMMENT 'editable-content digest captured before the draft was created',
  `originalUniqueValue` VARCHAR(255) DEFAULT NULL COMMENT 'original slug when a draft clone needs a temporary unique value',
  `createUserId` BIGINT NOT NULL,
  `createTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_content_draft_target` (`resourceType`, `targetId`),
  UNIQUE KEY `uk_content_draft_clone` (`resourceType`, `draftId`),
  KEY `idx_content_draft_update` (`updateTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='native draft clone mapped to a published content row';
