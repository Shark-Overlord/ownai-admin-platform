-- Seed scene tags for the image2.0 prompt asset category and clean orphan asset-tag relations.
-- Apply to the admin MySQL database after the Prompt asset tag split backend is deployed.

SET @IMAGE_PROMPT_CATEGORY_ID := 2057283059198771201;

DROP TEMPORARY TABLE IF EXISTS tmp_prompt_asset_scene_tags;
CREATE TEMPORARY TABLE tmp_prompt_asset_scene_tags (
    name VARCHAR(64) NOT NULL,
    sort INT NOT NULL,
    tagId BIGINT DEFAULT NULL
) ENGINE=Memory;

INSERT INTO tmp_prompt_asset_scene_tags (name, sort) VALUES
('商品电商', 10),
('人像写真', 20),
('角色立绘', 30),
('品牌海报', 40),
('包装设计', 50),
('社媒封面', 60),
('UI界面', 70),
('图标标识', 80),
('插画视觉', 90),
('摄影写实', 100),
('影视分镜', 110),
('场景空间', 120),
('建筑室内', 130),
('科技数码', 140),
('美食餐饮', 150),
('服装时尚', 160),
('游戏资产', 170),
('动漫二次元', 180),
('广告营销', 190),
('信息图表', 200),
('背景纹理', 210),
('图像编辑', 220),
('多图一致性', 230),
('参考图重绘', 240);

UPDATE tmp_prompt_asset_scene_tags SET tagId = UUID_SHORT();

START TRANSACTION;

DELETE ct
FROM category_tag ct
LEFT JOIN tag t ON t.id = ct.tagId AND t.isDelete = 0
WHERE ct.categoryId = @IMAGE_PROMPT_CATEGORY_ID
  AND t.id IS NULL;

DELETE ct
FROM category_tag ct
INNER JOIN tag t ON t.id = ct.tagId AND t.isDelete = 0
LEFT JOIN tmp_prompt_asset_scene_tags seed ON seed.name = t.name
WHERE ct.categoryId = @IMAGE_PROMPT_CATEGORY_ID
  AND seed.name IS NULL;

DELETE pat
FROM prompt_asset_tag pat
LEFT JOIN tag t ON t.id = pat.tagId AND t.isDelete = 0
WHERE t.id IS NULL;

INSERT INTO tag (id, name, description, sort, createTime, updateTime, isDelete)
SELECT seed.tagId,
       seed.name,
       'image2.0 二级场景标签',
       seed.sort,
       NOW(),
       NOW(),
       0
FROM tmp_prompt_asset_scene_tags seed
WHERE EXISTS (
    SELECT 1 FROM category c WHERE c.id = @IMAGE_PROMPT_CATEGORY_ID AND c.isDelete = 0
)
AND NOT EXISTS (
    SELECT 1
    FROM category_tag ct
    INNER JOIN tag t ON t.id = ct.tagId AND t.isDelete = 0
    WHERE ct.categoryId = @IMAGE_PROMPT_CATEGORY_ID
      AND t.name = seed.name
);

INSERT INTO category_tag (id, categoryId, tagId, sort, createTime)
SELECT UUID_SHORT(),
       @IMAGE_PROMPT_CATEGORY_ID,
       seed.tagId,
       seed.sort,
       NOW()
FROM tmp_prompt_asset_scene_tags seed
INNER JOIN tag t ON t.id = seed.tagId AND t.isDelete = 0
WHERE NOT EXISTS (
    SELECT 1
    FROM category_tag ct
    WHERE ct.categoryId = @IMAGE_PROMPT_CATEGORY_ID
      AND ct.tagId = seed.tagId
);

COMMIT;

DROP TEMPORARY TABLE IF EXISTS tmp_prompt_asset_scene_tags;
