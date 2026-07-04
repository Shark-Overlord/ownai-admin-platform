CREATE TABLE IF NOT EXISTS content_api_key (
    id BIGINT NOT NULL PRIMARY KEY,
    keyName VARCHAR(100) NOT NULL COMMENT '密钥名称',
    keyHash VARCHAR(128) NOT NULL COMMENT '密钥 SHA-256 哈希',
    keyPrefix VARCHAR(32) NOT NULL COMMENT '密钥前缀，便于识别',
    scopes VARCHAR(512) NOT NULL COMMENT '授权范围，逗号分隔',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态：0 禁用，1 启用',
    expireTime DATETIME NULL COMMENT '失效时间',
    lastUsedTime DATETIME NULL COMMENT '最后使用时间',
    lastUsedIp VARCHAR(64) NULL COMMENT '最后使用 IP',
    remark VARCHAR(500) NULL COMMENT '备注',
    createUserId BIGINT NULL COMMENT '创建人',
    createTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updateTime DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    isDelete TINYINT NOT NULL DEFAULT 0,
    UNIQUE KEY uk_content_api_key_hash (keyHash),
    KEY idx_content_api_key_status (status),
    KEY idx_content_api_key_expire (expireTime)
) COMMENT='内容资产外部 API 密钥';
