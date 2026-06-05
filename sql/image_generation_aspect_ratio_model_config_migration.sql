SET @schema_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_model_config' AND COLUMN_NAME = 'aspectRatio') = 0,
    'ALTER TABLE image_generation_model_config ADD COLUMN aspectRatio VARCHAR(16) NOT NULL DEFAULT ''1:1'' AFTER sizeCode',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_model_config' AND INDEX_NAME = 'uk_img_gen_model_size') > 0,
    'ALTER TABLE image_generation_model_config DROP INDEX uk_img_gen_model_size',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_model_config' AND INDEX_NAME = 'uk_img_gen_model_size') = 0,
    'ALTER TABLE image_generation_model_config ADD UNIQUE KEY uk_img_gen_model_size (providerCode, modelCode, sizeCode, aspectRatio, isDelete)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE image_generation_model_config
SET isDelete = 1
WHERE providerCode = 'lumio'
  AND modelCode = 'gpt-image-2'
  AND id < 100000000000000200
  AND isDelete = 0
  AND (
      sizeCode IN ('2k-landscape', '2k-portrait', '2k-wide')
      OR (sizeCode IN ('1k', '2k', '4k') AND aspectRatio = '1:1')
  );

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000201, 'lumio', 'gpt-image-2', '1k', '1:1', '1024x1024', 30, 0.05, 0.05, 0.10, 1, 1, 101, '1K 1:1'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='1k' AND aspectRatio='1:1' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000202, 'lumio', 'gpt-image-2', '1k', '3:4', '768x1024', 30, 0.05, 0.05, 0.10, 1, 1, 102, '1K 3:4'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='1k' AND aspectRatio='3:4' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000203, 'lumio', 'gpt-image-2', '1k', '4:3', '1024x768', 30, 0.05, 0.05, 0.10, 1, 1, 103, '1K 4:3'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='1k' AND aspectRatio='4:3' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000204, 'lumio', 'gpt-image-2', '1k', '16:9', '1280x720', 30, 0.05, 0.05, 0.10, 1, 1, 104, '1K 16:9'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='1k' AND aspectRatio='16:9' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000205, 'lumio', 'gpt-image-2', '1k', '9:16', '720x1280', 30, 0.05, 0.05, 0.10, 1, 1, 105, '1K 9:16'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='1k' AND aspectRatio='9:16' AND isDelete=0);

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000206, 'lumio', 'gpt-image-2', '2k', '1:1', '2048x2048', 120, 0.20, 0.20, 0.40, 1, 1, 201, '2K 1:1'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='2k' AND aspectRatio='1:1' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000207, 'lumio', 'gpt-image-2', '2k', '3:4', '1536x2048', 120, 0.20, 0.20, 0.40, 1, 1, 202, '2K 3:4'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='2k' AND aspectRatio='3:4' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000208, 'lumio', 'gpt-image-2', '2k', '4:3', '2048x1536', 120, 0.20, 0.20, 0.40, 1, 1, 203, '2K 4:3'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='2k' AND aspectRatio='4:3' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000209, 'lumio', 'gpt-image-2', '2k', '16:9', '1920x1080', 120, 0.20, 0.20, 0.40, 1, 1, 204, '2K 16:9'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='2k' AND aspectRatio='16:9' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000210, 'lumio', 'gpt-image-2', '2k', '9:16', '1080x1920', 120, 0.20, 0.20, 0.40, 1, 1, 205, '2K 9:16'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='2k' AND aspectRatio='9:16' AND isDelete=0);

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000211, 'lumio', 'gpt-image-2', '4k', '1:1', '4096x4096', 150, 0.20, 0.20, 0.40, 1, 1, 301, '4K 1:1'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='4k' AND aspectRatio='1:1' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000212, 'lumio', 'gpt-image-2', '4k', '3:4', '3072x4096', 150, 0.20, 0.20, 0.40, 1, 1, 302, '4K 3:4'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='4k' AND aspectRatio='3:4' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000213, 'lumio', 'gpt-image-2', '4k', '4:3', '4096x3072', 150, 0.20, 0.20, 0.40, 1, 1, 303, '4K 4:3'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='4k' AND aspectRatio='4:3' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000214, 'lumio', 'gpt-image-2', '4k', '16:9', '3840x2160', 150, 0.20, 0.20, 0.40, 1, 1, 304, '4K 16:9'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='4k' AND aspectRatio='16:9' AND isDelete=0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000215, 'lumio', 'gpt-image-2', '4k', '9:16', '2160x3840', 150, 0.20, 0.20, 0.40, 1, 1, 305, '4K 9:16'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode='lumio' AND modelCode='gpt-image-2' AND sizeCode='4k' AND aspectRatio='9:16' AND isDelete=0);
