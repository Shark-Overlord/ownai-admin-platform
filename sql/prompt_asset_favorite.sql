CREATE TABLE IF NOT EXISTS prompt_asset_favorite
(
    id            BIGINT   NOT NULL PRIMARY KEY,
    userId        BIGINT   NOT NULL,
    promptAssetId BIGINT   NOT NULL,
    createTime    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete      TINYINT  NOT NULL DEFAULT 0,
    UNIQUE KEY uk_prompt_asset_favorite_user_asset (userId, promptAssetId),
    KEY idx_prompt_asset_favorite_user (userId, isDelete, createTime),
    KEY idx_prompt_asset_favorite_asset (promptAssetId, isDelete)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'user favorite prompt assets';
