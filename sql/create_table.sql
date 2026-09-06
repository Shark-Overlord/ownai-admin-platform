CREATE DATABASE IF NOT EXISTS my_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE my_db;

CREATE TABLE IF NOT EXISTS `user`
(
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    userAccount      VARCHAR(256)                           NOT NULL,
    userEmail        VARCHAR(256)                           NULL,
    userPassword     VARCHAR(512)                           NOT NULL,
    unionId          VARCHAR(256)                           NULL,
    mpOpenId         VARCHAR(256)                           NULL,
    userName         VARCHAR(256)                           NULL,
    userAvatar       VARCHAR(1024)                          NULL,
    userProfile      VARCHAR(512)                           NULL,
    userRole         VARCHAR(64)  DEFAULT 'user'           NOT NULL,
    memberLevel      VARCHAR(64)  DEFAULT 'normal'         NOT NULL,
    memberPlanType   VARCHAR(32)                            NULL,
    pointBalance     INT          DEFAULT 0                NOT NULL,
    memberExpireTime DATETIME                               NULL,
    lastCheckInDate  DATETIME                               NULL,
    createTime       DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime       DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    isDelete         TINYINT      DEFAULT 0                NOT NULL,
    UNIQUE KEY uk_userAccount (userAccount),
    UNIQUE KEY uk_userEmail (userEmail),
    INDEX idx_unionId (unionId),
    INDEX idx_memberLevel (memberLevel)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS category
(
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(128)                           NOT NULL,
    description VARCHAR(512)                          NULL,
    sort        INT          DEFAULT 0                NOT NULL,
    createTime  DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime  DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    isDelete    TINYINT      DEFAULT 0                NOT NULL,
    UNIQUE KEY uk_category_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tag
(
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(128)                           NOT NULL,
    description VARCHAR(512)                          NULL,
    sort        INT          DEFAULT 0                NOT NULL,
    createTime  DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime  DATETIME     DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    isDelete    TINYINT      DEFAULT 0                NOT NULL,
    UNIQUE KEY uk_tag_name (name)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artwork
(
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(128)                           NOT NULL,
    summary       VARCHAR(512)                          NULL,
    description   TEXT                                  NULL,
    coverUrl      VARCHAR(1024)                         NULL,
    videoUrl      VARCHAR(1024)                         NULL,
    promptContent LONGTEXT                              NULL,
    categoryId    BIGINT                                 NOT NULL,
    cashPrice     DECIMAL(10, 2) DEFAULT 0.00          NOT NULL,
    pointsPrice   INT           DEFAULT 100              NOT NULL,
    memberOnly    TINYINT       DEFAULT 0              NOT NULL,
    status        TINYINT       DEFAULT 0              NOT NULL,
    htmlUrl       VARCHAR(1024)                         NULL,
    sourceZipUrl  VARCHAR(1024)                         NULL,
    userId        BIGINT                                 NOT NULL,
    viewCount     INT           DEFAULT 0              NOT NULL,
    sort          INT           DEFAULT 0              NOT NULL,
    createTime    DATETIME      DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime    DATETIME      DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    isDelete      TINYINT       DEFAULT 0              NOT NULL,
    INDEX idx_categoryId (categoryId),
    INDEX idx_status (status),
    INDEX idx_userId (userId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artwork_tag
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    artworkId  BIGINT                                 NOT NULL,
    tagId      BIGINT                                 NOT NULL,
    createTime DATETIME DEFAULT CURRENT_TIMESTAMP     NOT NULL,
    UNIQUE KEY uk_artwork_tag (artworkId, tagId),
    INDEX idx_tagId (tagId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artwork_access
(
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    artworkId  BIGINT                                 NOT NULL,
    userId     BIGINT                                 NOT NULL,
    orderId    BIGINT                                 NULL,
    accessType VARCHAR(64)                            NOT NULL,
    createTime DATETIME DEFAULT CURRENT_TIMESTAMP     NOT NULL,
    UNIQUE KEY uk_artwork_access (artworkId, userId),
    INDEX idx_orderId (orderId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS artwork_order
(
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    orderNo           VARCHAR(64)                            NOT NULL,
    userId            BIGINT                                 NOT NULL,
    artworkId         BIGINT                                 NOT NULL,
    orderType         VARCHAR(64)                            NOT NULL,
    orderStatus       VARCHAR(64)                            NOT NULL,
    orderAmount       DECIMAL(10, 2) DEFAULT 0.00           NOT NULL,
    pointsAmount      INT           DEFAULT 0               NOT NULL,
    paymentChannel    VARCHAR(64)                            NULL,
    thirdPartyOrderNo VARCHAR(128)                           NULL,
    payTime           DATETIME                               NULL,
    finishTime        DATETIME                               NULL,
    createTime        DATETIME      DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime        DATETIME      DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_order_no (orderNo),
    INDEX idx_userId_status (userId, orderStatus),
    INDEX idx_artworkId (artworkId)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_order
(
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    orderNo                 VARCHAR(64)                             NOT NULL,
    userId                  BIGINT                                  NOT NULL,
    memberLevel             VARCHAR(64)                             NOT NULL,
    planType                VARCHAR(32)                             NOT NULL,
    durationDays            INT                                    NOT NULL DEFAULT 0,
    orderType               VARCHAR(64)                             NOT NULL,
    orderStatus             VARCHAR(64)                             NOT NULL,
    orderAmount             DECIMAL(10, 2) DEFAULT 0.00            NOT NULL,
    amountMinor             BIGINT                                  NULL,
    currency                VARCHAR(3)     DEFAULT 'CNY'            NOT NULL,
    pointsAmount            INT            DEFAULT 0                NOT NULL,
    rechargeQuantity        INT                                     NULL,
    paymentChannel          VARCHAR(64)                             NULL,
    thirdPartyOrderNo       VARCHAR(128)                            NULL,
    paymentRequestId        VARCHAR(64)                             NULL,
    failureReason           VARCHAR(500)                            NULL,
    payTime                 DATETIME                                NULL,
    finishTime              DATETIME                                NULL,
    createTime              DATETIME       DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updateTime              DATETIME       DEFAULT CURRENT_TIMESTAMP NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_member_order_no (orderNo),
    UNIQUE KEY uk_member_payment_request (userId, paymentRequestId),
    INDEX idx_userId_status (userId, orderStatus)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_price_config
(
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    memberLevel  VARCHAR(64)                             NOT NULL DEFAULT 'member',
    planType     VARCHAR(32)                             NOT NULL,
    cashPrice    DECIMAL(10, 2)                         NOT NULL,
    currency     VARCHAR(3)                              NOT NULL DEFAULT 'CNY',
    pointsPrice  INT                                     NOT NULL DEFAULT 0,
    durationDays INT                                     NOT NULL DEFAULT 0,
    description  VARCHAR(500)                            NULL,
    features     JSON                                    NULL,
    status       TINYINT                                 NOT NULL DEFAULT 1,
    createTime   DATETIME DEFAULT CURRENT_TIMESTAMP      NOT NULL,
    updateTime   DATETIME DEFAULT CURRENT_TIMESTAMP      NOT NULL ON UPDATE CURRENT_TIMESTAMP,
    isDelete     TINYINT  DEFAULT 0                      NOT NULL,
    UNIQUE KEY uk_member_price_plan (memberLevel, planType)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS point_record
(
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    userId       BIGINT                                 NOT NULL,
    changeType   VARCHAR(64)                            NOT NULL,
    changeAmount INT                                    NOT NULL,
    balanceAfter INT                                    NOT NULL,
    relatedType  VARCHAR(64)                            NULL,
    relatedId    BIGINT                                 NULL,
    description  VARCHAR(512)                           NULL,
    createTime   DATETIME DEFAULT CURRENT_TIMESTAMP     NOT NULL,
    INDEX idx_userId (userId),
    INDEX idx_changeType (changeType)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operation_log
(
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    userId        BIGINT                                 NULL,
    sourceIp      VARCHAR(45)                            NULL,
    module        VARCHAR(64)                            NOT NULL,
    action        VARCHAR(128)                           NOT NULL,
    requestMethod VARCHAR(16)                            NOT NULL,
    requestUri    VARCHAR(255)                           NOT NULL,
    requestParams VARCHAR(500)                           NULL,
    status        TINYINT                                NOT NULL,
    errorMessage  VARCHAR(500)                           NULL,
    costTime      BIGINT                                 NULL,
    createTime    DATETIME DEFAULT CURRENT_TIMESTAMP     NOT NULL,
    INDEX idx_userId (userId),
    INDEX idx_sourceIp_createTime (sourceIp, createTime),
    INDEX idx_module_action (module, action),
    INDEX idx_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
