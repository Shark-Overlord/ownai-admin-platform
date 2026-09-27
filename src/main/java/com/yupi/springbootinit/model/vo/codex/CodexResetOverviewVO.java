package com.yupi.springbootinit.model.vo.codex;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class CodexResetOverviewVO implements Serializable {

    private boolean available;
    private boolean stale;
    private String message;
    private String sourceName;
    private String sourcePageUrl;
    private String sourceProfileUrl;
    private String sourceHandle;
    private String lastCheckedAt;
    private CodexResetSignalVO latestSignal;
    private CodexResetStatsVO stats = new CodexResetStatsVO();
    private List<CodexResetSignalVO> history = new ArrayList<>();
    private List<CodexResetAnnouncementVO> announcements = new ArrayList<>();

    @Data
    public static class CodexResetSignalVO implements Serializable {
        private String id;
        private String date;
        private String publishedAt;
        private String kind;
        private String status;
        private String label;
        private String summary;
        private String sourceUrl;
    }

    @Data
    public static class CodexResetStatsVO implements Serializable {
        private int resetCount;
        private double averageIntervalDays;
        private double longestIntervalDays;
        private String latestConfirmedResetAt;
    }

    @Data
    public static class CodexResetAnnouncementVO implements Serializable {
        private String id;
        private String publishedAt;
        private String relativeTime;
        private String summary;
        private String sourceUrl;
    }
}
