package com.yupi.springbootinit.model.vo.home;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class HomeContentVO implements Serializable {

    private HomeHeroContent hero = new HomeHeroContent();
    private HomeDesignContent design = new HomeDesignContent();
    private HomeCourseContent course = new HomeCourseContent();
    private String updateTime;

    @Data
    public static class HomeHeroContent implements Serializable {
        private String eyebrow;
        private String title;
        private String description;
        private List<HomeVideoItem> videoList = new ArrayList<>();
    }

    @Data
    public static class HomeVideoItem implements Serializable {
        private String id;
        private String videoUrl;
        private String posterUrl;
        private String alt;
        private Integer sort;
    }

    @Data
    public static class HomeDesignContent implements Serializable {
        private String title;
        private String description;
        private String ctaText;
        private String ctaPath;
        private String demoVideoUrl;
        private String demoVideoPosterUrl;
    }

    @Data
    public static class HomeCourseContent implements Serializable {
        private String eyebrow;
        private String title;
        private String description;
        private String ctaText;
        private String ctaPath;
        private String footerTitle;
        private String footerDescription;
        private List<HomeCourseItem> itemList = new ArrayList<>();
    }

    @Data
    public static class HomeCourseItem implements Serializable {
        private String id;
        private String title;
        private String description;
        private String coverUrl;
        private String coverAlt;
        private String statusText;
        private String targetPath;
        private Integer sort;
    }
}
