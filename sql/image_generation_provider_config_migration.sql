CREATE TABLE IF NOT EXISTS image_generation_provider_config
(
    id              BIGINT       NOT NULL PRIMARY KEY,
    providerCode    VARCHAR(64)  NOT NULL,
    providerName    VARCHAR(128) NOT NULL,
    baseUrl         VARCHAR(512) NOT NULL,
    generationPath  VARCHAR(255) NOT NULL,
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
    vendorSize             VARCHAR(32)   NOT NULL,
    pointCost              INT           NOT NULL DEFAULT 0,
    apiInputCostCny        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    apiOutputCostCny       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    apiCostCny             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    supportsReferenceImage TINYINT       NOT NULL DEFAULT 1,
    status                 TINYINT       NOT NULL DEFAULT 1,
    sortOrder              INT           NOT NULL DEFAULT 0,
    description            VARCHAR(512)  NULL,
    createTime             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete               TINYINT       NOT NULL DEFAULT 0,
    UNIQUE KEY uk_img_gen_model_size (providerCode, modelCode, sizeCode, isDelete),
    KEY idx_img_gen_model_provider (providerCode, status, sortOrder)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'image generation model config';

SET @schema_name = DATABASE();

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
    (id, providerCode, providerName, baseUrl, generationPath, authType, apiKeyEncrypted, apiKeyLast4, status, isDefault, timeoutSeconds, requestSchema)
SELECT 100000000000000001, 'lumio', 'LumioAPI', 'https://api.lumio.games', '/v1/images/generations', 'bearer', NULL, NULL, 1, 1, 120,
       '{"body":{"model":"string","prompt":"string","size":"string","reference_images":"string[] optional"}}'
WHERE NOT EXISTS (
    SELECT 1 FROM image_generation_provider_config WHERE providerCode = 'lumio' AND isDelete = 0
);

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000101, 'lumio', 'gpt-image-2', '1k', '1024x1024', 30, 0.05, 0.05, 0.10, 1, 1, 10, '1K square'
WHERE NOT EXISTS (
    SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '1k' AND isDelete = 0
);

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000102, 'lumio', 'gpt-image-2', '2k-landscape', '1792x1024', 120, 0.20, 0.20, 0.40, 1, 1, 20, '2K landscape'
WHERE NOT EXISTS (
    SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k-landscape' AND isDelete = 0
);

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000103, 'lumio', 'gpt-image-2', '2k-portrait', '1024x1792', 120, 0.20, 0.20, 0.40, 1, 1, 30, '2K portrait'
WHERE NOT EXISTS (
    SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k-portrait' AND isDelete = 0
);

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000104, 'lumio', 'gpt-image-2', '2k-wide', '2560x1440', 120, 0.20, 0.20, 0.40, 1, 1, 40, '2K widescreen'
WHERE NOT EXISTS (
    SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '2k-wide' AND isDelete = 0
);

INSERT INTO image_generation_model_config
    (id, providerCode, modelCode, sizeCode, vendorSize, pointCost, apiInputCostCny, apiOutputCostCny, apiCostCny, supportsReferenceImage, status, sortOrder, description)
SELECT 100000000000000105, 'lumio', 'gpt-image-2', '4k', '3840x2160', 150, 0.20, 0.20, 0.40, 1, 1, 50, '4K ultra'
WHERE NOT EXISTS (
    SELECT 1 FROM image_generation_model_config WHERE providerCode = 'lumio' AND modelCode = 'gpt-image-2' AND sizeCode = '4k' AND isDelete = 0
);
