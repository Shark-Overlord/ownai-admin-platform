-- Stable idempotency key for external artwork upload clients.
-- Safe to run repeatedly on MySQL versions without ADD COLUMN/INDEX IF NOT EXISTS.
SET @column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'artwork'
      AND COLUMN_NAME = 'externalKey'
);
SET @ddl = IF(
    @column_exists = 0,
    'ALTER TABLE artwork ADD COLUMN externalKey VARCHAR(128) DEFAULT NULL AFTER id',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'artwork'
      AND INDEX_NAME = 'uk_artwork_external_key'
);
SET @ddl = IF(
    @index_exists = 0,
    'CREATE UNIQUE INDEX uk_artwork_external_key ON artwork (externalKey)',
    'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
