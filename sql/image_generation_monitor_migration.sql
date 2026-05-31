USE my_db;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'modelCode'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN modelCode VARCHAR(64) NULL AFTER status',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'imageSize'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN imageSize VARCHAR(16) NULL AFTER modelCode',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'imageCount'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN imageCount INT NULL AFTER imageSize',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'pointCost'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN pointCost INT NULL AFTER imageCount',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'apiCostCny'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN apiCostCny DECIMAL(10, 2) NULL AFTER pointCost',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'pointStatus'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN pointStatus VARCHAR(32) NULL AFTER apiCostCny',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'startedTime'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN startedTime DATETIME NULL AFTER pointStatus',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND COLUMN_NAME = 'finishedTime'
);
SET @sql := IF(@column_exists = 0,
    'ALTER TABLE image_generation_message ADD COLUMN finishedTime DATETIME NULL AFTER startedTime',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND INDEX_NAME = 'idx_img_gen_model_size'
);
SET @sql := IF(@index_exists = 0,
    'ALTER TABLE image_generation_message ADD KEY idx_img_gen_model_size (modelCode, imageSize)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'image_generation_message'
      AND INDEX_NAME = 'idx_img_gen_role_status_create'
);
SET @sql := IF(@index_exists = 0,
    'ALTER TABLE image_generation_message ADD KEY idx_img_gen_role_status_create (role, status, createTime)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
