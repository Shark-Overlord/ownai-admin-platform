CREATE TABLE IF NOT EXISTS artwork_favorite
(
    id         BIGINT   NOT NULL PRIMARY KEY,
    userId     BIGINT   NOT NULL,
    artworkId  BIGINT   NOT NULL,
    createTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete   TINYINT  NOT NULL DEFAULT 0,
    UNIQUE KEY uk_artwork_favorite_user_artwork (userId, artworkId),
    KEY idx_artwork_favorite_user (userId, isDelete, createTime),
    KEY idx_artwork_favorite_artwork (artworkId, isDelete)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'user favorite artworks';
