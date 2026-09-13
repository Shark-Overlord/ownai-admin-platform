-- Additive migration. Run before deploying resource analytics code; no existing data is changed.
CREATE TABLE IF NOT EXISTS resource_event (
 id BIGINT NOT NULL PRIMARY KEY, resourceType VARCHAR(32) NOT NULL, resourceId BIGINT NOT NULL,
 actor VARCHAR(80) NOT NULL, userId BIGINT NULL, action VARCHAR(16) NOT NULL,
 eventKey VARCHAR(80) NOT NULL, eventTime DATETIME(3) NOT NULL,
 UNIQUE KEY uk_event_retry(actor,eventKey),
 KEY idx_event_resource(resourceType,resourceId,eventTime), KEY idx_event_actor(actor,resourceType,resourceId,action,eventTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS resource_download (
 id BIGINT NOT NULL PRIMARY KEY, resourceType VARCHAR(32) NOT NULL, resourceId BIGINT NOT NULL,
 mediaId BIGINT NULL, userId BIGINT NOT NULL, status VARCHAR(16) NOT NULL,
 transferredBytes BIGINT NOT NULL DEFAULT 0, startedAt DATETIME(3) NOT NULL, finishedAt DATETIME(3) NULL,
 failureCode VARCHAR(48) NULL,
 KEY idx_download_time(startedAt), KEY idx_download_user(userId,startedAt),
 KEY idx_download_resource(resourceType,resourceId,startedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS resource_actor_guard (
 actor VARCHAR(80) NOT NULL PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS resource_download_permission (
 userId BIGINT NOT NULL PRIMARY KEY, restricted TINYINT NOT NULL DEFAULT 0,
 reason VARCHAR(500) NOT NULL, operatorId BIGINT NOT NULL, updatedAt DATETIME(3) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS resource_download_permission_audit (
 id BIGINT NOT NULL PRIMARY KEY, userId BIGINT NOT NULL, restricted TINYINT NOT NULL,
 reason VARCHAR(500) NOT NULL, operatorId BIGINT NOT NULL, createdAt DATETIME(3) NOT NULL,
 KEY idx_permission_audit(userId,createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS resource_analytics_daily (
 statDate DATE NOT NULL, resourceType VARCHAR(32) NOT NULL, resourceId BIGINT NOT NULL,
 views BIGINT NOT NULL DEFAULT 0, copies BIGINT NOT NULL DEFAULT 0, effectiveCopies BIGINT NOT NULL DEFAULT 0,
 requests BIGINT NOT NULL DEFAULT 0, downloads BIGINT NOT NULL DEFAULT 0, effectiveDownloads BIGINT NOT NULL DEFAULT 0,
 transferredBytes BIGINT NOT NULL DEFAULT 0, updatedAt DATETIME(3) NOT NULL,
 PRIMARY KEY(statDate,resourceType,resourceId), KEY idx_daily_resource(resourceType,resourceId,statDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS resource_analytics_state (
 id INT NOT NULL PRIMARY KEY, collectedFrom DATETIME(3) NOT NULL, updatedAt DATETIME(3) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO resource_analytics_state(id,collectedFrom) VALUES (1, UTC_TIMESTAMP(3) + INTERVAL 8 HOUR);
