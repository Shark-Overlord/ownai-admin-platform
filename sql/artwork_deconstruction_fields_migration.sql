-- Add deep-deconstruction data to existing artwork records without changing existing data.
-- Safe to run repeatedly on MySQL versions without ADD COLUMN IF NOT EXISTS.
SET NAMES utf8mb4;

SELECT
    SUM(COLUMN_NAME = 'isDeconstructed'),
    SUM(COLUMN_NAME = 'deviceFrame'),
    SUM(COLUMN_NAME = 'deconstructedPrompt'),
    SUM(COLUMN_NAME = 'promptData'),
    SUM(COLUMN_NAME = 'partsData'),
    SUM(COLUMN_NAME = 'assetsData'),
    SUM(COLUMN_NAME = 'standaloneHtml')
INTO
    @has_is_deconstructed,
    @has_device_frame,
    @has_deconstructed_prompt,
    @has_prompt_data,
    @has_parts_data,
    @has_assets_data,
    @has_standalone_html
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'artwork';

SET @ddl = CONCAT(
    'ALTER TABLE `artwork` ',
    CONCAT_WS(', ',
        IF(
            @has_is_deconstructed = 0,
            'ADD COLUMN `isDeconstructed` TINYINT NOT NULL DEFAULT ''0'' COMMENT ''是否已深度解构'' AFTER `sourceZipUrl`',
            NULL
        ),
        IF(
            @has_device_frame = 0,
            'ADD COLUMN `deviceFrame` VARCHAR(32) DEFAULT ''website'' COMMENT ''外壳: app | website | none'' AFTER `isDeconstructed`',
            NULL
        ),
        IF(
            @has_deconstructed_prompt = 0,
            'ADD COLUMN `deconstructedPrompt` LONGTEXT DEFAULT NULL COMMENT ''完整解构System Prompt'' AFTER `deviceFrame`',
            NULL
        ),
        IF(
            @has_prompt_data = 0,
            'ADD COLUMN `promptData` JSON DEFAULT NULL COMMENT ''设计令牌(颜色/排版表格)'' AFTER `deconstructedPrompt`',
            NULL
        ),
        IF(
            @has_parts_data = 0,
            'ADD COLUMN `partsData` JSON DEFAULT NULL COMMENT ''核心零件切片代码列表'' AFTER `promptData`',
            NULL
        ),
        IF(
            @has_assets_data = 0,
            'ADD COLUMN `assetsData` JSON DEFAULT NULL COMMENT ''矢量图标与素材列表'' AFTER `partsData`',
            NULL
        ),
        IF(
            @has_standalone_html = 0,
            'ADD COLUMN `standaloneHtml` LONGTEXT DEFAULT NULL COMMENT ''真机独立HTML源码'' AFTER `assetsData`',
            NULL
        )
    )
);

SET @ddl = IF(
    @has_is_deconstructed
        + @has_device_frame
        + @has_deconstructed_prompt
        + @has_prompt_data
        + @has_parts_data
        + @has_assets_data
        + @has_standalone_html = 7,
    'SELECT 1',
    @ddl
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
