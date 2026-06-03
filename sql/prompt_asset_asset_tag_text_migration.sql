ALTER TABLE prompt_asset
    ADD COLUMN assetTagText MEDIUMTEXT NULL COMMENT 'Imported asset description tags JSON text' AFTER commercialRisk;

DELETE pat
FROM prompt_asset_tag pat
JOIN tag t ON t.id = pat.tagId
WHERE t.description = 'Imported from visual prompt library';

DELETE ct
FROM category_tag ct
JOIN tag t ON t.id = ct.tagId
WHERE t.description = 'Imported from visual prompt library';

DELETE FROM tag
WHERE description = 'Imported from visual prompt library';
