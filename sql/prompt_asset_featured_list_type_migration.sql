DELIMITER //

CREATE PROCEDURE add_prompt_asset_featured_columns()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'prompt_asset'
          AND COLUMN_NAME = 'isFeatured'
    ) THEN
        ALTER TABLE prompt_asset
            ADD COLUMN isFeatured TINYINT NOT NULL DEFAULT 0 COMMENT 'whether this prompt asset is featured' AFTER sort;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'prompt_asset'
          AND COLUMN_NAME = 'featuredSort'
    ) THEN
        ALTER TABLE prompt_asset
            ADD COLUMN featuredSort INT NOT NULL DEFAULT 0 COMMENT 'featured list sort value, larger first' AFTER isFeatured;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'prompt_asset'
          AND COLUMN_NAME = 'featuredTime'
    ) THEN
        ALTER TABLE prompt_asset
            ADD COLUMN featuredTime DATETIME NULL COMMENT 'time when marked featured' AFTER featuredSort;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'prompt_asset'
          AND INDEX_NAME = 'idx_prompt_asset_featured'
    ) THEN
        CREATE INDEX idx_prompt_asset_featured ON prompt_asset (isFeatured, featuredSort, featuredTime);
    END IF;
END//

DELIMITER ;

CALL add_prompt_asset_featured_columns();

DROP PROCEDURE add_prompt_asset_featured_columns;
