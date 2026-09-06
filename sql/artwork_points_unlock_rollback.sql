-- Restore untouched migration prices only. Do not overwrite later manual pricing edits.
START TRANSACTION;
UPDATE artwork a JOIN artwork_points_price_backup_20260906 b ON a.id=b.artworkId
SET a.pointsPrice=b.pointsPrice WHERE a.pointsPrice=100;
COMMIT;
SET @old_artwork_points_default = (
    SELECT previousDefault FROM artwork_points_migration
    WHERE migrationKey='permanent-unlock-100-20260906'
);
SET @restore_artwork_points_sql = IF(@old_artwork_points_default REGEXP '^[0-9]+$',
    CONCAT('ALTER TABLE artwork ALTER COLUMN pointsPrice SET DEFAULT ', @old_artwork_points_default),
    'SELECT ''Original default needs manual review'' AS notice');
PREPARE restore_artwork_points FROM @restore_artwork_points_sql;
EXECUTE restore_artwork_points;
DEALLOCATE PREPARE restore_artwork_points;
-- Keep orders, authorizations, debit records, backup and migration marker intact.
