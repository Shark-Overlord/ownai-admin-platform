-- Security access logging migration.
-- Run once on MySQL 8+ before deploying the matching backend build.

ALTER TABLE operation_log
    ADD COLUMN sourceIp VARCHAR(45) NULL AFTER userId,
    ADD INDEX idx_sourceIp_createTime (sourceIp, createTime);
