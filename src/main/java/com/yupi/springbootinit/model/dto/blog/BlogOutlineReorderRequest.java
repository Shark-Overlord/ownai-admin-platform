package com.yupi.springbootinit.model.dto.blog;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class BlogOutlineReorderRequest implements Serializable {

    private Long bookId;
    private List<ChapterOrderItem> chapters;

    @Data
    public static class ChapterOrderItem implements Serializable {
        private Long chapterId;
        private List<Long> postIds;

        private static final long serialVersionUID = 1L;
    }

    private static final long serialVersionUID = 1L;
}
