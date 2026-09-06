-- Run against the existing application database before deploying the community profile release.
-- Additive and repeatable: existing posts, revisions, comments and accounts are retained.
SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_post' AND COLUMN_NAME='pinned')=0,
  'ALTER TABLE community_post ADD COLUMN pinned TINYINT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE migration FROM @ddl;
EXECUTE migration;
DEALLOCATE PREPARE migration;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_post' AND COLUMN_NAME='pinnedAt')=0,
  'ALTER TABLE community_post ADD COLUMN pinnedAt DATETIME(3) NULL', 'SELECT 1');
PREPARE migration FROM @ddl;
EXECUTE migration;
DEALLOCATE PREPARE migration;

SET @ddl = IF((SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='community_post' AND INDEX_NAME='idx_community_post_pinned')=0,
  'ALTER TABLE community_post ADD INDEX idx_community_post_pinned(pinned,pinnedAt)', 'SELECT 1');
PREPARE migration FROM @ddl;
EXECUTE migration;
DEALLOCATE PREPARE migration;
