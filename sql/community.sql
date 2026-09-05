-- Incremental migration. Run once before deploying the community backend.
CREATE TABLE community_category (
 id BIGINT PRIMARY KEY, name VARCHAR(60) NOT NULL, description VARCHAR(300) NOT NULL DEFAULT '',
 sort INT NOT NULL DEFAULT 0, enabled TINYINT NOT NULL DEFAULT 1,
 UNIQUE KEY uk_community_category_name(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE community_tag (
 id BIGINT PRIMARY KEY, name VARCHAR(60) NOT NULL, description VARCHAR(300) NOT NULL DEFAULT '',
 sort INT NOT NULL DEFAULT 0, enabled TINYINT NOT NULL DEFAULT 1,
 UNIQUE KEY uk_community_tag_name(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE community_post (
 id BIGINT PRIMARY KEY, authorId BIGINT NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'draft',
 draftRevisionId BIGINT NULL, publishedRevisionId BIGINT NULL,
 version INT NOT NULL DEFAULT 0, firstPublishedAt DATETIME(3) NULL,
 createTime DATETIME(3) NOT NULL, updateTime DATETIME(3) NOT NULL, isDelete TINYINT NOT NULL DEFAULT 0,
 KEY idx_community_post_public(status,isDelete,firstPublishedAt,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE community_revision (
 id BIGINT PRIMARY KEY, postId BIGINT NOT NULL, title VARCHAR(150) NOT NULL,
 summary VARCHAR(300) NOT NULL, coverUrl VARCHAR(1000) NOT NULL,
 categoryId BIGINT NULL, markdown MEDIUMTEXT NOT NULL, commentsEnabled TINYINT NOT NULL DEFAULT 1,
 createdBy BIGINT NOT NULL, createTime DATETIME(3) NOT NULL,
 KEY idx_community_revision_post(postId), KEY idx_community_revision_category(categoryId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE community_revision_tag (
 revisionId BIGINT NOT NULL, tagId BIGINT NOT NULL, PRIMARY KEY(revisionId,tagId),
 KEY idx_community_revision_tag(tagId,revisionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE community_comment (
 id BIGINT PRIMARY KEY, postId BIGINT NOT NULL, userId BIGINT NOT NULL,
 rootId BIGINT NULL, replyToId BIGINT NULL, content VARCHAR(2000) NOT NULL,
 hidden TINYINT NOT NULL DEFAULT 0, isDelete TINYINT NOT NULL DEFAULT 0,
 official TINYINT NOT NULL DEFAULT 0, requestKey VARCHAR(80) NOT NULL,
 createTime DATETIME(3) NOT NULL,
 UNIQUE KEY uk_community_comment_request(userId,requestKey),
 KEY idx_community_comment_post(postId,hidden,isDelete,createTime), KEY idx_community_comment_root(rootId,id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE community_like (
 postId BIGINT NOT NULL, userId BIGINT NOT NULL, createTime DATETIME(3) NOT NULL,
 PRIMARY KEY(postId,userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE community_report (
 id BIGINT PRIMARY KEY, commentId BIGINT NOT NULL, userId BIGINT NOT NULL,
 reason VARCHAR(500) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending',
 resolution VARCHAR(500) NOT NULL DEFAULT '', handledBy BIGINT NULL, handledAt DATETIME(3) NULL,
 createTime DATETIME(3) NOT NULL,
 UNIQUE KEY uk_community_report_user(commentId,userId), KEY idx_community_report_queue(status,createTime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Persistent rate limits work across restarts and application instances.
CREATE TABLE community_rate_limit (
 userId BIGINT NOT NULL, action VARCHAR(20) NOT NULL, windowStart BIGINT NOT NULL, attempts INT NOT NULL,
 PRIMARY KEY(userId,action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
ALTER TABLE announcement ADD COLUMN targetType VARCHAR(30) NULL, ADD COLUMN targetId BIGINT NULL;
