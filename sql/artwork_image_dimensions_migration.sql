-- Store original cover-image dimensions for frontend artwork card layout.
ALTER TABLE artwork
    ADD COLUMN imageWidth INT DEFAULT NULL AFTER videoUrl,
    ADD COLUMN imageHeight INT DEFAULT NULL AFTER imageWidth;
