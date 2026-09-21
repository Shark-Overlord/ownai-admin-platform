package com.yupi.springbootinit.migration;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * One-time, marker-gated migration from artwork replacement drafts to a single-row lifecycle.
 * The marker is intentionally outside the repository so local/test startup is read-only.
 */
@Component
@Slf4j
public class ArtworkSingleRecordMigrationRunner implements ApplicationRunner {

    static final String MIGRATION_KEY = "artwork-single-record-20260921";
    static final Path DEFAULT_MARKER = Paths.get("/opt/springboot-init/run-artwork-single-record-migration");
    static final String ARTWORK_BACKUP = "artwork_single_record_backup_20260921";
    static final String TAG_BACKUP = "artwork_tag_single_record_backup_20260921";
    static final String BRIDGE_BACKUP = "content_draft_bridge_artwork_backup_20260921";

    private final JdbcTemplate jdbcTemplate;
    private final TransactionTemplate transactionTemplate;

    public ArtworkSingleRecordMigrationRunner(JdbcTemplate jdbcTemplate,
            PlatformTransactionManager transactionManager) {
        this.jdbcTemplate = jdbcTemplate;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        String configured = System.getProperty("ownai.artworkSingleRecordMigrationMarker");
        Path marker = configured == null || configured.trim().isEmpty()
                ? DEFAULT_MARKER : Paths.get(configured.trim());
        if (!Files.isRegularFile(marker)) return;
        MigrationResult result = migrate();
        log.info("Artwork single-record migration completed: pairs={}, tags={}",
                result.getPairCount(), result.getTagCount());
        try {
            Files.deleteIfExists(marker);
        } catch (Exception e) {
            log.warn("Migration succeeded but marker could not be removed: {}", marker, e);
        }
    }

    public MigrationResult migrate() {
        createBackupTables();
        Integer completed = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM artwork_single_record_migration WHERE migrationKey=?",
                Integer.class, MIGRATION_KEY);
        if (completed != null && completed > 0) {
            Integer pairCount = jdbcTemplate.queryForObject(
                    "SELECT pairCount FROM artwork_single_record_migration WHERE migrationKey=?",
                    Integer.class, MIGRATION_KEY);
            return new MigrationResult(pairCount == null ? 0 : pairCount, 0);
        }

        int bridgeCount = count("SELECT COUNT(*) FROM content_module_draft_bridge WHERE resourceType='artwork'");
        if (bridgeCount == 0) {
            throw new IllegalStateException("Artwork migration marker exists but no artwork draft bridges were found");
        }
        int validPairCount = count("SELECT COUNT(*) FROM content_module_draft_bridge b "
                + "JOIN artwork target ON target.id=b.targetId "
                + "JOIN artwork draft ON draft.id=b.draftId "
                + "WHERE b.resourceType='artwork'");
        int invalidPairCount = count("SELECT COUNT(*) FROM content_module_draft_bridge b "
                + "LEFT JOIN artwork target ON target.id=b.targetId "
                + "LEFT JOIN artwork draft ON draft.id=b.draftId "
                + "WHERE b.resourceType='artwork' AND (target.id IS NULL OR draft.id IS NULL "
                + "OR target.id=draft.id OR target.isDelete<>0 OR draft.isDelete<>0 "
                + "OR target.status<>1 OR draft.status<>0 OR draft.isDeconstructed<>1 "
                + "OR NULLIF(TRIM(draft.deconstructedPrompt),'') IS NULL "
                + "OR draft.promptData IS NULL OR draft.partsData IS NULL OR draft.assetsData IS NULL "
                + "OR NULLIF(TRIM(draft.standaloneHtml),'') IS NULL)");
        if (validPairCount != bridgeCount || invalidPairCount != 0) {
            throw new IllegalStateException("Artwork migration validation failed: bridges=" + bridgeCount
                    + ", validPairs=" + validPairCount + ", invalidPairs=" + invalidPairCount);
        }

        int sourceTagCount = count("SELECT COUNT(*) FROM artwork_tag atag JOIN ("
                + "SELECT targetId AS artworkId FROM content_module_draft_bridge WHERE resourceType='artwork' "
                + "UNION ALL SELECT draftId FROM content_module_draft_bridge WHERE resourceType='artwork'"
                + ") migrated ON migrated.artworkId=atag.artworkId");
        backupRows();
        assertBackupCounts(bridgeCount, sourceTagCount);

        transactionTemplate.executeWithoutResult(status -> {
            int updated = jdbcTemplate.update("UPDATE artwork target "
                    + "JOIN content_module_draft_bridge b ON b.resourceType='artwork' AND b.targetId=target.id "
                    + "JOIN artwork draft ON draft.id=b.draftId "
                    + "SET target.isDeconstructed=draft.isDeconstructed, "
                    + "target.deviceFrame=draft.deviceFrame, "
                    + "target.deconstructedPrompt=draft.deconstructedPrompt, "
                    + "target.promptData=draft.promptData, target.partsData=draft.partsData, "
                    + "target.assetsData=draft.assetsData, target.standaloneHtml=draft.standaloneHtml");
            if (updated != bridgeCount) {
                throw new IllegalStateException("Expected to update " + bridgeCount + " artworks but updated " + updated);
            }

            jdbcTemplate.update("DELETE atag FROM artwork_tag atag "
                    + "JOIN content_module_draft_bridge b ON b.resourceType='artwork' AND b.draftId=atag.artworkId");
            int deletedDrafts = jdbcTemplate.update("UPDATE artwork draft "
                    + "JOIN content_module_draft_bridge b ON b.resourceType='artwork' AND b.draftId=draft.id "
                    + "SET draft.isDelete=1");
            if (deletedDrafts != bridgeCount) {
                throw new IllegalStateException("Expected to delete " + bridgeCount
                        + " drafts but deleted " + deletedDrafts);
            }
            int deletedBridges = jdbcTemplate.update(
                    "DELETE FROM content_module_draft_bridge WHERE resourceType='artwork'");
            if (deletedBridges != bridgeCount) {
                throw new IllegalStateException("Expected to delete " + bridgeCount
                        + " bridges but deleted " + deletedBridges);
            }
            int invalidTargets = count("SELECT COUNT(*) FROM " + BRIDGE_BACKUP + " b "
                    + "JOIN artwork target ON target.id=b.targetId "
                    + "JOIN artwork draft ON draft.id=b.draftId "
                    + "WHERE b.resourceType='artwork' AND (target.status<>1 OR target.isDelete<>0 "
                    + "OR target.isDeconstructed<>1 OR NULLIF(TRIM(target.deconstructedPrompt),'') IS NULL "
                    + "OR target.promptData IS NULL OR target.partsData IS NULL OR target.assetsData IS NULL "
                    + "OR NULLIF(TRIM(target.standaloneHtml),'') IS NULL OR draft.isDelete<>1)");
            if (invalidTargets != 0) {
                throw new IllegalStateException("Artwork migration post-check failed for " + invalidTargets + " pairs");
            }
            jdbcTemplate.update("INSERT INTO artwork_single_record_migration"
                    + "(migrationKey,pairCount,executedAt) VALUES(?,?,NOW())",
                    MIGRATION_KEY, bridgeCount);
        });
        return new MigrationResult(bridgeCount, sourceTagCount);
    }

    private void createBackupTables() {
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS artwork_single_record_migration ("
                + "migrationKey VARCHAR(80) NOT NULL PRIMARY KEY, pairCount INT NOT NULL, "
                + "executedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) "
                + "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + ARTWORK_BACKUP + " LIKE artwork");
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + TAG_BACKUP + " LIKE artwork_tag");
        jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS " + BRIDGE_BACKUP
                + " LIKE content_module_draft_bridge");
    }

    private void backupRows() {
        jdbcTemplate.update("INSERT IGNORE INTO " + ARTWORK_BACKUP + " SELECT artwork.* FROM artwork "
                + "JOIN (SELECT targetId AS artworkId FROM content_module_draft_bridge WHERE resourceType='artwork' "
                + "UNION ALL SELECT draftId FROM content_module_draft_bridge WHERE resourceType='artwork') migrated "
                + "ON migrated.artworkId=artwork.id");
        jdbcTemplate.update("INSERT IGNORE INTO " + TAG_BACKUP + " SELECT atag.* FROM artwork_tag atag "
                + "JOIN (SELECT targetId AS artworkId FROM content_module_draft_bridge WHERE resourceType='artwork' "
                + "UNION ALL SELECT draftId FROM content_module_draft_bridge WHERE resourceType='artwork') migrated "
                + "ON migrated.artworkId=atag.artworkId");
        jdbcTemplate.update("INSERT IGNORE INTO " + BRIDGE_BACKUP
                + " SELECT * FROM content_module_draft_bridge WHERE resourceType='artwork'");
    }

    private void assertBackupCounts(int pairCount, int tagCount) {
        int artworkBackupCount = count("SELECT COUNT(*) FROM " + ARTWORK_BACKUP);
        int tagBackupCount = count("SELECT COUNT(*) FROM " + TAG_BACKUP);
        int bridgeBackupCount = count("SELECT COUNT(*) FROM " + BRIDGE_BACKUP
                + " WHERE resourceType='artwork'");
        if (artworkBackupCount != pairCount * 2 || tagBackupCount != tagCount
                || bridgeBackupCount != pairCount) {
            throw new IllegalStateException("Artwork migration backup validation failed: artworks="
                    + artworkBackupCount + ", tags=" + tagBackupCount + ", bridges=" + bridgeBackupCount);
        }
    }

    private int count(String sql) {
        Integer value = jdbcTemplate.queryForObject(sql, Integer.class);
        return value == null ? 0 : value;
    }

    public static class MigrationResult {
        private final int pairCount;
        private final int tagCount;

        public MigrationResult(int pairCount, int tagCount) {
            this.pairCount = pairCount;
            this.tagCount = tagCount;
        }

        public int getPairCount() {
            return pairCount;
        }

        public int getTagCount() {
            return tagCount;
        }
    }
}
