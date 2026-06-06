USE my_db;

CREATE TABLE IF NOT EXISTS point_check_in_config
(
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    rewardPoints INT                                DEFAULT 20               NOT NULL,
    status       TINYINT                            DEFAULT 1                NOT NULL,
    description  VARCHAR(512)                                                NULL,
    createTime   DATETIME                           DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime   DATETIME                           DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    isDelete     TINYINT                            DEFAULT 0                NOT NULL,
    INDEX idx_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO point_check_in_config (rewardPoints, status, description)
SELECT 20, 1, '每日签到默认奖励'
WHERE NOT EXISTS (SELECT 1 FROM point_check_in_config WHERE isDelete = 0);

CREATE TABLE IF NOT EXISTS announcement
(
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(100)                         NOT NULL,
    content      TEXT                                 NOT NULL,
    type         VARCHAR(64)  DEFAULT 'site_update'   NOT NULL,
    status       VARCHAR(32)  DEFAULT 'draft'         NOT NULL,
    priority     INT          DEFAULT 0               NOT NULL,
    publishTime  DATETIME                             NULL,
    expireTime   DATETIME                             NULL,
    createUserId BIGINT                               NULL,
    createTime   DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime   DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    isDelete     TINYINT      DEFAULT 0               NOT NULL,
    INDEX idx_status_time (status, publishTime, expireTime),
    INDEX idx_priority_update (priority, updateTime),
    INDEX idx_createUserId (createUserId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_read
(
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    announcementId BIGINT                             NOT NULL,
    userId         BIGINT                             NOT NULL,
    readTime       DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    createTime     DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY uk_announcement_user (announcementId, userId),
    INDEX idx_userId (userId),
    INDEX idx_announcementId (announcementId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
