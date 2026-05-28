-- Add cloud-storage fields for prompt assets imported from visual_prompt_library.db.
-- Run this once on an existing admin database before importing a SQLite file with COS fields.

ALTER TABLE prompt_asset
    ADD COLUMN sourceCloudStorageUrl VARCHAR(1024) DEFAULT NULL,
    ADD COLUMN sourceThumbnailLocalPath VARCHAR(1024) DEFAULT NULL,
    ADD COLUMN sourceThumbnailCloudStorageUrl VARCHAR(1024) DEFAULT NULL,
    ADD COLUMN cloudStorageProvider VARCHAR(64) DEFAULT NULL,
    ADD COLUMN cloudStorageBucket VARCHAR(128) DEFAULT NULL,
    ADD COLUMN cloudStorageRegion VARCHAR(64) DEFAULT NULL,
    ADD COLUMN cloudStorageKey VARCHAR(512) DEFAULT NULL,
    ADD COLUMN cloudUploadedAt VARCHAR(64) DEFAULT NULL,
    ADD KEY idx_prompt_asset_cloud_storage_url (sourceCloudStorageUrl(255));

ALTER TABLE prompt_asset_media
    ADD COLUMN cloudUrl VARCHAR(1024) DEFAULT NULL,
    ADD COLUMN thumbnailLocalUrl VARCHAR(1024) DEFAULT NULL,
    ADD COLUMN thumbnailCloudUrl VARCHAR(1024) DEFAULT NULL,
    ADD COLUMN cloudStorageProvider VARCHAR(64) DEFAULT NULL,
    ADD COLUMN cloudStorageBucket VARCHAR(128) DEFAULT NULL,
    ADD COLUMN cloudStorageRegion VARCHAR(64) DEFAULT NULL,
    ADD COLUMN cloudStorageKey VARCHAR(512) DEFAULT NULL,
    ADD COLUMN cloudUploadedAt VARCHAR(64) DEFAULT NULL;
