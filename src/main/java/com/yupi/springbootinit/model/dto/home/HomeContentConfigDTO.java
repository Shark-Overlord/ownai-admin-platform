package com.yupi.springbootinit.model.dto.home;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class HomeContentConfigDTO implements Serializable {

    private HeroConfig hero = new HeroConfig();
    private DesignConfig design = new DesignConfig();
    private CourseConfig course = new CourseConfig();

    @Data
    public static class HeroConfig implements Serializable {
        private Boolean enabled = true;
        private String eyebrow;
        private String title;
        private String description;
        private List<VideoConfig> videoList = new ArrayList<>();
    }

    @Data
    public static class VideoConfig implements Serializable {
        private String id;
        private String videoUrl;
        private String posterUrl;
        private String alt;
        private Integer sort = 0;
        private Boolean enabled = true;
    }

    @Data
    public static class DesignConfig implements Serializable {
        private Boolean enabled = true;
        private String title;
        private String description;
        private String ctaText;
        private String ctaPath;
        private String demoVideoUrl;
        private String demoVideoPosterUrl;
    }

    @Data
    public static class CourseConfig implements Serializable {
        private Boolean enabled = true;
        private String eyebrow;
        private String title;
        private String description;
        private String ctaText;
        private String ctaPath;
        private String footerTitle;
        private String footerDescription;
        private List<CourseItemConfig> itemList = new ArrayList<>();
    }

    @Data
    public static class CourseItemConfig implements Serializable {
        private String id;
        private String title;
        private String description;
        private String coverUrl;
        private String coverAlt;
        private String statusText;
        private String targetPath;
        private Integer sort = 0;
        private Boolean enabled = true;
    }
}
