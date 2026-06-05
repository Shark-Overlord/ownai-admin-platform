USE my_db;

SET @schema_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND COLUMN_NAME = 'generationMode') = 0,
    'ALTER TABLE image_generation_message ADD COLUMN generationMode VARCHAR(16) NOT NULL DEFAULT ''api'' AFTER vendorSize',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND COLUMN_NAME = 'manualCostCny') = 0,
    'ALTER TABLE image_generation_message ADD COLUMN manualCostCny DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER apiCostCny',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND INDEX_NAME = 'idx_img_gen_generation_mode') = 0,
    'ALTER TABLE image_generation_message ADD INDEX idx_img_gen_generation_mode (generationMode)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE image_generation_message
SET generationMode = 'api'
WHERE generationMode IS NULL OR generationMode = '';

UPDATE image_generation_message
SET manualCostCny = 0.00
WHERE manualCostCny IS NULL;

SET @manual_point_column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_model_config' AND COLUMN_NAME = 'manualPointCost');
SET @sql = IF(@manual_point_column_exists = 0,
    'ALTER TABLE image_generation_model_config ADD COLUMN manualPointCost INT NOT NULL DEFAULT 0 AFTER pointCost',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_model_config' AND COLUMN_NAME = 'manualCostCny') = 0,
    'ALTER TABLE image_generation_model_config ADD COLUMN manualCostCny DECIMAL(10,2) NOT NULL DEFAULT 0.10 AFTER apiCostCny',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(@manual_point_column_exists = 0,
    'UPDATE image_generation_model_config SET manualPointCost = pointCost',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE image_generation_model_config
SET manualCostCny = 0.10
WHERE manualCostCny IS NULL;
