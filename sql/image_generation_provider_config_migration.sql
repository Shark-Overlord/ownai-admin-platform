CREATE TABLE IF NOT EXISTS image_generation_provider_config
(
    id              BIGINT       NOT NULL PRIMARY KEY,
    providerCode    VARCHAR(64)  NOT NULL,
    providerName    VARCHAR(128) NOT NULL,
    baseUrl         VARCHAR(512) NOT NULL,
    generationPath  VARCHAR(255) NOT NULL,
    editPath        VARCHAR(255) NULL,
    authType        VARCHAR(32)  NOT NULL DEFAULT 'bearer',
    apiKeyEncrypted TEXT         NULL,
    apiKeyLast4     VARCHAR(16)  NULL,
    status          TINYINT      NOT NULL DEFAULT 1,
    isDefault       TINYINT      NOT NULL DEFAULT 0,
    timeoutSeconds  INT          NOT NULL DEFAULT 60,
    requestSchema   TEXT         NULL,
    createTime      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete        TINYINT      NOT NULL DEFAULT 0,
    UNIQUE KEY uk_img_gen_provider_code (providerCode, isDelete),
    KEY idx_img_gen_provider_default (isDefault, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'image generation provider config';

CREATE TABLE IF NOT EXISTS image_generation_model_config
(
    id                     BIGINT        NOT NULL PRIMARY KEY,
    providerCode           VARCHAR(64)   NOT NULL,
    modelCode              VARCHAR(64)   NOT NULL,
    sizeCode               VARCHAR(32)   NOT NULL,
    aspectRatio            VARCHAR(16)   NOT NULL DEFAULT '1:1',
    vendorSize             VARCHAR(32)   NOT NULL,
    pointCost              INT           NOT NULL DEFAULT 0,
    manualPointCost        INT           NOT NULL DEFAULT 0,
    apiInputCostCny        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    apiOutputCostCny       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    apiCostCny             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    manualCostCny          DECIMAL(10,2) NOT NULL DEFAULT 0.10,
    supportsReferenceImage TINYINT       NOT NULL DEFAULT 1,
    status                 TINYINT       NOT NULL DEFAULT 1,
    sortOrder              INT           NOT NULL DEFAULT 0,
    description            VARCHAR(512)  NULL,
    createTime             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete               TINYINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uk_img_gen_model_size (providerCode, modelCode, sizeCode, aspectRatio, isDelete),
    KEY idx_img_gen_model_provider (providerCode, status, sortOrder)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'image generation model config';

SET @schema_name = DATABASE();

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_provider_config' AND COLUMN_NAME = 'editPath') = 0,
    'ALTER TABLE image_generation_provider_config ADD COLUMN editPath VARCHAR(255) NULL AFTER generationPath',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND COLUMN_NAME = 'providerCode') = 0,
    'ALTER TABLE image_generation_message ADD COLUMN providerCode VARCHAR(64) NULL AFTER status',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND COLUMN_NAME = 'providerName') = 0,
    'ALTER TABLE image_generation_message ADD COLUMN providerName VARCHAR(128) NULL AFTER providerCode',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND COLUMN_NAME = 'vendorModel') = 0,
    'ALTER TABLE image_generation_message ADD COLUMN vendorModel VARCHAR(64) NULL AFTER modelCode',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND COLUMN_NAME = 'vendorSize') = 0,
    'ALTER TABLE image_generation_message ADD COLUMN vendorSize VARCHAR(32) NULL AFTER imageSize',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = @schema_name AND TABLE_NAME = 'image_generation_message' AND INDEX_NAME = 'idx_img_gen_provider') = 0,
    'ALTER TABLE image_generation_message ADD INDEX idx_img_gen_provider (providerCode)',
    'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT INTO image_generation_provider_config
    (id, providerCode, providerName, baseUrl, generationPath, editPath, authType, apiKeyEncrypted, apiKeyLast4, status, isDefault, timeoutSeconds, requestSchema)
SELECT 100000000000000001, 'lumio', 'LumioAPI', 'https://api.lumio.games', '/v1/images/generations', '/v1/images/edits', 'bearer', NULL, NULL, 1, 1, 120,
       '{"body":{"model":"string","prompt":"string","size":"string","reference_images":"string[] optional"}}'
WHERE NOT EXISTS (
    SELECT 1 FROM image_generation_provider_config WHERE providerCode = 'lumio' AND isDelete = 0
);

UPDATE image_generation_provider_config
SET editPath = '/v1/images/edits'
WHERE providerCode = 'lumio'
  AND isDelete = 0
  AND (editPath IS NULL OR editPath = '');

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
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000201, 'lumio', 'gpt-image-2', '1k', '1:1', '1024x1024', 30, 30, 0.05, 0.05, 0.10, 0.10, 1, 1, 101, '1K 1:1'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '1k' AND aspectRatio = '1:1' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000202, 'lumio', 'gpt-image-2', '1k', '3:4', '768x1024', 30, 30, 0.05, 0.05, 0.10, 0.10, 1, 1, 102, '1K 3:4'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '1k' AND aspectRatio = '3:4' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000203, 'lumio', 'gpt-image-2', '1k', '4:3', '1024x768', 30, 30, 0.05, 0.05, 0.10, 0.10, 1, 1, 103, '1K 4:3'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '1k' AND aspectRatio = '4:3' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000204, 'lumio', 'gpt-image-2', '1k', '16:9', '1280x720', 30, 30, 0.05, 0.05, 0.10, 0.10, 1, 1, 104, '1K 16:9'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '1k' AND aspectRatio = '16:9' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000205, 'lumio', 'gpt-image-2', '1k', '9:16', '720x1280', 30, 30, 0.05, 0.05, 0.10, 0.10, 1, 1, 105, '1K 9:16'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '1k' AND aspectRatio = '9:16' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000206, 'lumio', 'gpt-image-2', '2k', '1:1', '2048x2048', 120, 120, 0.20, 0.20, 0.40, 0.10, 1, 1, 201, '2K 1:1'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k' AND aspectRatio = '1:1' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000207, 'lumio', 'gpt-image-2', '2k', '3:4', '1536x2048', 120, 120, 0.20, 0.20, 0.40, 0.10, 1, 1, 202, '2K 3:4'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k' AND aspectRatio = '3:4' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000208, 'lumio', 'gpt-image-2', '2k', '4:3', '2048x1536', 120, 120, 0.20, 0.20, 0.40, 0.10, 1, 1, 203, '2K 4:3'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k' AND aspectRatio = '4:3' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000209, 'lumio', 'gpt-image-2', '2k', '16:9', '1920x1080', 120, 120, 0.20, 0.20, 0.40, 0.10, 1, 1, 204, '2K 16:9'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k' AND aspectRatio = '16:9' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000210, 'lumio', 'gpt-image-2', '2k', '9:16', '1080x1920', 120, 120, 0.20, 0.20, 0.40, 0.10, 1, 1, 205, '2K 9:16'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k' AND aspectRatio = '9:16' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000211, 'lumio', 'gpt-image-2', '4k', '1:1', '4096x4096', 150, 150, 0.20, 0.20, 0.40, 0.10, 1, 1, 301, '4K 1:1'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '4k' AND aspectRatio = '1:1' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000212, 'lumio', 'gpt-image-2', '4k', '3:4', '3072x4096', 150, 150, 0.20, 0.20, 0.40, 0.10, 1, 1, 302, '4K 3:4'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '4k' AND aspectRatio = '3:4' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000213, 'lumio', 'gpt-image-2', '4k', '4:3', '4096x3072', 150, 150, 0.20, 0.20, 0.40, 0.10, 1, 1, 303, '4K 4:3'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '4k' AND aspectRatio = '4:3' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000214, 'lumio', 'gpt-image-2', '4k', '16:9', '3840x2160', 150, 150, 0.20, 0.20, 0.40, 0.10, 1, 1, 304, '4K 16:9'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '4k' AND aspectRatio = '16:9' AND isDelete = 0);
INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, manualCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000215, 'lumio', 'gpt-image-2', '4k', '9:16', '2160x3840', 150, 150, 0.20, 0.20, 0.40, 0.10, 1, 1, 305, '4K 9:16'
WHERE NOT EXISTS (SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '4k' AND aspectRatio = '9:16' AND isDelete = 0);
