-- Run once on the selected database, with the compatible backend ready to deploy.
-- The migration marker and original prices are retained permanently for audit/rollback.
CREATE TABLE IF NOT EXISTS artwork_points_price_backup_20260906 (
    artworkId BIGINT PRIMARY KEY,
    pointsPrice INT NULL,
    backedUpAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS artwork_points_migration (
    migrationKey VARCHAR(80) PRIMARY KEY,
    previousDefault VARCHAR(20) NULL,
    completedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

START TRANSACTION;
INSERT IGNORE INTO artwork_points_migration(migrationKey, previousDefault)
SELECT 'permanent-unlock-100-20260906', COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='artwork' AND COLUMN_NAME='pointsPrice';
SET @apply_artwork_points = ROW_COUNT();
INSERT INTO artwork_points_price_backup_20260906(artworkId, pointsPrice)
SELECT id, pointsPrice FROM artwork WHERE isDelete=0 AND @apply_artwork_points=1;
UPDATE artwork SET pointsPrice=100 WHERE isDelete=0 AND @apply_artwork_points=1;
COMMIT;

ALTER TABLE artwork ALTER COLUMN pointsPrice SET DEFAULT 100;

-- Reconcile missing grants only from completed orders backed by a matching debit.
-- Existing grants, including those needing manual audit, are neither deleted nor overwritten.
INSERT IGNORE INTO artwork_access(artworkId,userId,orderId,accessType)
SELECT o.artworkId,o.userId,MIN(o.id),'points_exchange'
FROM artwork_order o
WHERE o.orderType='points' AND o.orderStatus='completed' AND o.pointsAmount>0
AND EXISTS (SELECT 1 FROM point_record p WHERE p.userId=o.userId
    AND p.relatedType='order' AND p.relatedId=o.id
    AND p.changeType='redeem_consume' AND p.changeAmount=-o.pointsAmount)
GROUP BY o.artworkId,o.userId;

SELECT COUNT(*) AS backedUpPrices FROM artwork_points_price_backup_20260906;
SELECT COUNT(*) AS currentHundredPointWorks FROM artwork WHERE isDelete=0 AND pointsPrice=100;
