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
    aspectRatio            VARCHAR(16)   NOT NULL DEFAULT '1:1',
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
    UNIQUE KEY uk_img_gen_model_size (providerCode, modelCode, sizeCode, aspectRatio, isDelete),
    KEY idx_img_gen_model_provider (providerCode, status, sortOrder)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'image generation model config';
