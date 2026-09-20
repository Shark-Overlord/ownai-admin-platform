-- 作品解构资产细粒度收藏表（支持提示词、零件切片组件代码、矢量图标）
CREATE TABLE IF NOT EXISTS `deconstruction_asset_favorite` (
    `id`          BIGINT NOT NULL PRIMARY KEY COMMENT '主键ID',
    `userId`      BIGINT NOT NULL COMMENT '用户ID',
    `artworkId`   BIGINT NOT NULL COMMENT '作品ID',
    `assetType`   VARCHAR(32) NOT NULL COMMENT '资产类型: prompt | component | icon',
    `assetKey`    VARCHAR(128) NOT NULL COMMENT '作品内资产唯一键: 如 full, partId, iconName',
    `title`       VARCHAR(255) NOT NULL DEFAULT '' COMMENT '资产标题',
    `tag`         VARCHAR(64) NOT NULL DEFAULT '' COMMENT '标签或分类',
    `description` TEXT DEFAULT NULL COMMENT '资产描述信息',
    `content`     MEDIUMTEXT NOT NULL COMMENT '核心内容(Prompt Markdown / 组件源码 / 图标SVG或代码)',
    `metaData`    TEXT DEFAULT NULL COMMENT '扩展元数据JSON',
    `createTime`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updateTime`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `isDelete`    TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除: 0-未删除, 1-已删除',
    UNIQUE KEY `uk_user_artwork_asset` (`userId`, `artworkId`, `assetType`, `assetKey`),
    KEY `idx_user_asset_type` (`userId`, `assetType`, `isDelete`, `createTime`),
    KEY `idx_artwork_asset` (`artworkId`, `assetType`, `isDelete`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT '作品解构资产细粒度收藏表';