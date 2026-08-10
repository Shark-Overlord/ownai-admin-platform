CREATE TABLE IF NOT EXISTS video_background_favorite
(
    id                BIGINT   NOT NULL PRIMARY KEY,
    userId            BIGINT   NOT NULL,
    videoBackgroundId BIGINT   NOT NULL,
    createTime        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete          TINYINT  NOT NULL DEFAULT 0,
    UNIQUE KEY uk_video_background_favorite_user_video (userId, videoBackgroundId),
    KEY idx_video_background_favorite_user (userId, isDelete, updateTime),
    KEY idx_video_background_favorite_video (videoBackgroundId, isDelete)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'user favorite video backgrounds';
