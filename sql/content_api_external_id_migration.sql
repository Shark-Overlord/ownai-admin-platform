-- Idempotency externalId keys for prompt_asset and video_background.
-- Safe to run repeatedly on MySQL versions without ADD COLUMN/INDEX IF NOT EXISTS.

-- 1. prompt_asset.externalId
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'prompt_asset'
      AND COLUMN_NAME = 'externalId'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE prompt_asset ADD COLUMN externalId VARCHAR(128) DEFAULT NULL COMMENT ''外部唯一键（agent 幂等新增用）'' AFTER id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'prompt_asset'
      AND INDEX_NAME = 'uk_prompt_asset_external_id'
);
SET @ddl = IF(
    @index_exists = 0,
    'CREATE UNIQUE INDEX uk_prompt_asset_external_id ON prompt_asset (externalId)',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. video_background.externalId
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'video_background'
      AND COLUMN_NAME = 'externalId'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE video_background ADD COLUMN externalId VARCHAR(128) DEFAULT NULL COMMENT ''外部唯一键（agent 幂等新增用）'' AFTER id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'video_background'
      AND INDEX_NAME = 'uk_video_background_external_id'
);
SET @ddl = IF(
    @index_exists = 0,
    'CREATE UNIQUE INDEX uk_video_background_external_id ON video_background (externalId)',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
