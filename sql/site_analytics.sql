-- OwnAI site traffic analytics.
-- Raw events are retained for 90 days; daily aggregates are retained long term.

CREATE TABLE IF NOT EXISTS site_visit_event (
    id BIGINT NOT NULL COMMENT 'Primary key',
    visitorHash CHAR(64) NOT NULL COMMENT 'HMAC-SHA256 visitor identifier',
    userId BIGINT NULL COMMENT 'Authenticated user id',
    pagePath VARCHAR(255) NOT NULL COMMENT 'Normalized frontend route',
    sourceName VARCHAR(255) NOT NULL DEFAULT 'direct' COMMENT 'UTM source or referrer domain',
    referrerDomain VARCHAR(255) NULL COMMENT 'Referrer domain only',
    utmSource VARCHAR(100) NULL,
    utmMedium VARCHAR(100) NULL,
    utmCampaign VARCHAR(150) NULL,
    deviceType VARCHAR(32) NOT NULL DEFAULT 'other',
    browserName VARCHAR(50) NOT NULL DEFAULT 'Other',
    eventTime DATETIME NOT NULL,
    createTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_site_visit_event_time (eventTime),
    KEY idx_site_visit_visitor_time (visitorHash, eventTime),
    KEY idx_site_visit_user_time (userId, eventTime),
    KEY idx_site_visit_page_time (pagePath, eventTime),
    KEY idx_site_visit_source_time (sourceName, eventTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Frontend page view events';

CREATE TABLE IF NOT EXISTS site_analytics_daily (
    statDate DATE NOT NULL,
    pv BIGINT NOT NULL DEFAULT 0,
    uv BIGINT NOT NULL DEFAULT 0,
    dau BIGINT NOT NULL DEFAULT 0,
    loggedInVisitors BIGINT NOT NULL DEFAULT 0,
    createTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (statDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Site traffic daily aggregate';

CREATE TABLE IF NOT EXISTS site_analytics_dimension_daily (
    id BIGINT NOT NULL AUTO_INCREMENT,
    statDate DATE NOT NULL,
    dimensionType VARCHAR(20) NOT NULL COMMENT 'page/source/device',
    dimensionValue VARCHAR(255) NOT NULL,
    pv BIGINT NOT NULL DEFAULT 0,
    uv BIGINT NOT NULL DEFAULT 0,
    dau BIGINT NOT NULL DEFAULT 0,
    createTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_site_dimension_date_type_value (statDate, dimensionType, dimensionValue),
    KEY idx_site_dimension_type_date (dimensionType, statDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Page, source and device daily aggregate';
