-- Store the original artwork source package. Public list APIs only expose hasSourceCode.
-- This migration is safe to run repeatedly on MySQL versions without ADD COLUMN IF NOT EXISTS.
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'artwork'
      AND COLUMN_NAME = 'sourceZipUrl'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE artwork ADD COLUMN sourceZipUrl VARCHAR(1024) DEFAULT NULL AFTER htmlUrl',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
