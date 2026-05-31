USE my_db;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user'
      AND COLUMN_NAME = 'userEmail'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE `user` ADD COLUMN userEmail VARCHAR(256) NULL AFTER userAccount',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'user'
      AND INDEX_NAME = 'uk_userEmail'
);
SET @sql := IF(@index_exists = 0,
    'ALTER TABLE `user` ADD UNIQUE KEY uk_userEmail (userEmail)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
