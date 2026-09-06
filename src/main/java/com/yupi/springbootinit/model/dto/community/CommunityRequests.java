package com.yupi.springbootinit.model.dto.community;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

/** Separate commands prevent callers from writing identity, counters or moderation fields. */
public final class CommunityRequests {
    private CommunityRequests() { }
    @Data public static class Query {
        private int current = 1;
        private int pageSize = 20;
        private String keyword;
        private Long categoryId;
        private Long tagId;
        private Long postId;
        private Long userId;
        private Long rootId;
        private Long commentId;
        private String status;
        private String sort = "latest";
        private Boolean hidden;
    }
    @Data public static class SavePost {
        private Long id;
        private Integer version;
        private String title;
        private String summary;
        private Long categoryId;
        private List<Long> tagIds = new ArrayList<>();
        private String markdown;
        private Boolean commentsEnabled = true;
    }
    @Data public static class PostAction {
        private Long id;
        private Integer version;
    }
    @Data public static class Taxonomy {
        private Long id;
        private String name;
        private String description;
        private Integer sort = 0;
        private Boolean enabled = true;
    }
    @Data public static class Comment {
        private Long postId;
        private Long replyToId;
        private String content;
        private String requestKey;
    }
    @Data public static class Like {
        private Long postId;
        private Boolean liked;
    }
    @Data public static class Moderate {
        private Long id;
        private Boolean hidden;
    }
    @Data public static class Report {
        private Long commentId;
        private String reason;
    }
    @Data public static class ResolveReport {
        private Long id;
        private String resolution;
    }
}
