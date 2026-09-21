-- Roll back the one-time artwork replacement-draft migration.
-- Run only together with a backend rollback to the replacement-draft implementation.
-- Backup tables are intentionally retained after rollback for auditability.

START TRANSACTION;

UPDATE artwork target
JOIN artwork_single_record_backup_20260921 backup ON backup.id = target.id
JOIN content_draft_bridge_artwork_backup_20260921 bridge ON bridge.targetId = target.id
SET target.isDeconstructed = backup.isDeconstructed,
    target.deviceFrame = backup.deviceFrame,
    target.deconstructedPrompt = backup.deconstructedPrompt,
    target.promptData = backup.promptData,
    target.partsData = backup.partsData,
    target.assetsData = backup.assetsData,
    target.standaloneHtml = backup.standaloneHtml
WHERE bridge.resourceType = 'artwork';

UPDATE artwork draft
JOIN artwork_single_record_backup_20260921 backup ON backup.id = draft.id
JOIN content_draft_bridge_artwork_backup_20260921 bridge ON bridge.draftId = draft.id
SET draft.isDelete = backup.isDelete
WHERE bridge.resourceType = 'artwork';

INSERT IGNORE INTO artwork_tag
SELECT backup.*
FROM artwork_tag_single_record_backup_20260921 backup
JOIN content_draft_bridge_artwork_backup_20260921 bridge
  ON bridge.resourceType = 'artwork' AND bridge.draftId = backup.artworkId;

INSERT IGNORE INTO content_module_draft_bridge
SELECT *
FROM content_draft_bridge_artwork_backup_20260921
WHERE resourceType = 'artwork';

DELETE FROM artwork_single_record_migration
WHERE migrationKey = 'artwork-single-record-20260921';

COMMIT;
