-- Additive migration. Run once before deploying news-aware application code.
-- Existing announcements remain private and never start showing popups automatically.
ALTER TABLE announcement
    ADD COLUMN publicVisible TINYINT NOT NULL DEFAULT 0,
    ADD COLUMN summary VARCHAR(300) NOT NULL DEFAULT '',
    ADD COLUMN actionLabel VARCHAR(30) NOT NULL DEFAULT '',
    ADD COLUMN actionPath VARCHAR(500) NOT NULL DEFAULT '',
    ADD COLUMN popupEnabled TINYINT NOT NULL DEFAULT 0,
    ADD INDEX idx_public_news (publicVisible, status, publishTime);

CREATE TABLE IF NOT EXISTS announcement_popup_dismissal (
    id BIGINT NOT NULL PRIMARY KEY,
    announcementId BIGINT NOT NULL,
    userId BIGINT NOT NULL,
    dismissedTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_popup_user (announcementId, userId),
    INDEX idx_popup_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
