CREATE TABLE IF NOT EXISTS image_generation_canvas
(
    id             BIGINT      NOT NULL PRIMARY KEY,
    userId         BIGINT      NOT NULL,
    conversationId VARCHAR(64) NOT NULL,
    layoutJson     MEDIUMTEXT  NULL,
    viewportJson   TEXT        NULL,
    createTime     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete       TINYINT     NOT NULL DEFAULT 0,
    UNIQUE KEY uk_img_gen_canvas_user_conversation (userId, conversationId),
    KEY idx_img_gen_canvas_conversation (conversationId),
    KEY idx_img_gen_canvas_update (updateTime)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT 'image generation canvas layout state';
