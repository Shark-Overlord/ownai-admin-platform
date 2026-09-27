package com.yupi.springbootinit.service.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO;
import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO.CodexResetAnnouncementVO;
import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO.CodexResetSignalVO;
import com.yupi.springbootinit.model.vo.codex.CodexResetOverviewVO.CodexResetStatsVO;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

public class CodexResetMonitorParser {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CodexResetOverviewVO parseHistoryJson(String json, String sourcePageUrl, Instant fetchedAt) {
        try {
            JsonNode root = objectMapper.readTree(json);
            JsonNode days = root.path("history").path("days");
            if (!days.isArray()) {
                throw new IllegalArgumentException("history.days is missing");
            }

            Map<String, CodexResetSignalVO> uniqueSignals = new LinkedHashMap<>();
            Map<String, CodexResetAnnouncementVO> uniqueAnnouncements = new LinkedHashMap<>();
            for (JsonNode day : days) {
                String date = day.path("dateKey").asText("");
                if (!isIsoDate(date) || !day.path("events").isArray()) {
                    continue;
                }
                for (JsonNode event : day.path("events")) {
                    CodexResetSignalVO signal = parseHistoryEvent(event, date);
                    String uniqueKey = StringUtils.defaultIfBlank(signal.getId(), date + "|" + signal.getKind());
                    uniqueSignals.putIfAbsent(uniqueKey, signal);

                    CodexResetAnnouncementVO announcement = new CodexResetAnnouncementVO();
                    announcement.setId(signal.getId());
                    announcement.setPublishedAt(signal.getPublishedAt());
                    announcement.setRelativeTime(event.path("relativeTime").asText(""));
                    announcement.setSummary(joinLabelAndSummary(signal.getLabel(), signal.getSummary()));
                    announcement.setSourceUrl(signal.getSourceUrl());
                    uniqueAnnouncements.putIfAbsent(uniqueKey, announcement);
                }
            }

            List<CodexResetSignalVO> history = new ArrayList<>(uniqueSignals.values());
            history.sort(Comparator.comparing(
                    item -> StringUtils.defaultIfBlank(item.getPublishedAt(), item.getDate()),
                    Comparator.reverseOrder()
            ));
            List<CodexResetAnnouncementVO> announcements = new ArrayList<>(uniqueAnnouncements.values());
            announcements.sort(Comparator.comparing(
                    item -> StringUtils.defaultIfBlank(item.getPublishedAt(), ""),
                    Comparator.reverseOrder()
            ));

            CodexResetOverviewVO overview = createOverview(sourcePageUrl, fetchedAt);
            overview.setLatestSignal(history.stream().findFirst().orElse(null));
            overview.setHistory(history);
            overview.setAnnouncements(announcements);
            overview.setStats(calculateStats(history));
            return overview;
        } catch (Exception e) {
            throw new IllegalArgumentException("invalid reset history response", e);
        }
    }

    public CodexResetOverviewVO parse(String html, String sourcePageUrl, Instant fetchedAt) {
        Document document = Jsoup.parse(html, sourcePageUrl);
        CodexResetOverviewVO overview = createOverview(sourcePageUrl, fetchedAt);

        CodexResetSignalVO latestSignal = parseLatestSignal(document);
        List<CodexResetSignalVO> history = parseHistory(document);
        if (latestSignal != null) {
            mergeLatestSignal(history, latestSignal);
        }
        history.sort(Comparator.comparing(CodexResetSignalVO::getDate).reversed());

        overview.setLatestSignal(latestSignal != null ? latestSignal : history.stream().findFirst().orElse(null));
        overview.setHistory(history);
        overview.setAnnouncements(parseAnnouncements(document));
        overview.setStats(calculateStats(history));
        return overview;
    }

    private CodexResetOverviewVO createOverview(String sourcePageUrl, Instant fetchedAt) {
        CodexResetOverviewVO overview = new CodexResetOverviewVO();
        overview.setAvailable(true);
        overview.setStale(false);
        overview.setMessage("ok");
        overview.setSourceName("BetterOPC / X 公开信号");
        overview.setSourcePageUrl(sourcePageUrl);
        overview.setSourceHandle("thsottiaux");
        overview.setSourceProfileUrl("https://x.com/thsottiaux");
        overview.setLastCheckedAt(fetchedAt.toString());
        return overview;
    }

    private CodexResetSignalVO parseHistoryEvent(JsonNode event, String date) {
        String publishedAt = normalizeInstant(event.path("occurredAtIso").asText(""));
        String sourceUrl = event.path("originalUrl").asText("");
        String label = event.path("labelZh").asText("重置信号");

        CodexResetSignalVO signal = new CodexResetSignalVO();
        signal.setId(resolveId(sourceUrl, publishedAt, event.path("id").asText(date)));
        signal.setDate(date);
        signal.setPublishedAt(publishedAt);
        signal.setKind(resolveHistoryKind(event, label));
        signal.setStatus(event.path("status").asText("observed"));
        signal.setLabel(label);
        signal.setSummary(event.path("summaryZh").asText(""));
        signal.setSourceUrl(sourceUrl);
        return signal;
    }

    private String resolveHistoryKind(JsonNode event, String label) {
        JsonNode resetKinds = event.path("resetKinds");
        if (resetKinds.isArray()) {
            for (JsonNode kind : resetKinds) {
                if ("hard".equalsIgnoreCase(kind.asText())) {
                    return "reset";
                }
            }
            for (JsonNode kind : resetKinds) {
                if ("banked".equalsIgnoreCase(kind.asText())) {
                    return "reset_card";
                }
            }
        }
        return resolveKind(event.path("subtype").asText(""), label);
    }

    private String joinLabelAndSummary(String label, String summary) {
        if (StringUtils.isBlank(summary)) {
            return label;
        }
        if (StringUtils.isBlank(label) || StringUtils.startsWith(summary, label)) {
            return summary;
        }
        return label + " · " + summary;
    }

    private CodexResetSignalVO parseLatestSignal(Document document) {
        Element latest = document.selectFirst("[class*='reset-detail-latest']");
        if (latest == null) {
            return null;
        }

        Element time = latest.selectFirst("time[datetime]");
        Element status = latest.selectFirst("[data-signal-reset-status]");
        Element label = latest.selectFirst("[class*='signal-label']");
        Element summary = latest.selectFirst("strong");
        Element sourceLink = latest.parent() == null
                ? null
                : latest.parent().selectFirst("a[href*='x.com/'][href*='/status/']");

        CodexResetSignalVO signal = new CodexResetSignalVO();
        signal.setPublishedAt(time == null ? null : normalizeInstant(time.attr("datetime")));
        signal.setDate(resolveDate(signal.getPublishedAt(), time == null ? null : time.text()));
        signal.setStatus(status == null ? "observed" : StringUtils.defaultIfBlank(status.attr("data-signal-reset-status"), "observed"));
        signal.setLabel(label == null ? "重置信号" : label.text());
        signal.setKind(resolveKind(null, signal.getLabel()));
        signal.setSummary(summary == null ? "" : summary.text());
        signal.setSourceUrl(sourceLink == null ? "" : sourceLink.absUrl("href"));
        signal.setId(resolveId(signal.getSourceUrl(), signal.getPublishedAt(), signal.getDate()));
        return signal;
    }

    private List<CodexResetSignalVO> parseHistory(Document document) {
        Map<String, CodexResetSignalVO> uniqueSignals = new LinkedHashMap<>();
        Elements events = document.select("[data-kind][data-has-event=true][aria-label]");
        for (Element event : events) {
            String ariaLabel = event.attr("aria-label");
            String date = StringUtils.substringBefore(ariaLabel, "：").trim();
            if (!isIsoDate(date)) {
                continue;
            }

            String label = StringUtils.substringAfter(ariaLabel, "：").trim();
            String sourceUrl = event.absUrl("href");
            CodexResetSignalVO signal = new CodexResetSignalVO();
            signal.setDate(date);
            signal.setPublishedAt(null);
            signal.setKind(resolveKind(event.attr("data-kind"), label));
            signal.setStatus("confirmed");
            signal.setLabel(StringUtils.defaultIfBlank(label, labelForKind(signal.getKind())));
            signal.setSummary("");
            signal.setSourceUrl(sourceUrl);
            signal.setId(resolveId(sourceUrl, null, date + "-" + signal.getKind()));
            uniqueSignals.putIfAbsent(date + "|" + signal.getKind(), signal);
        }
        return new ArrayList<>(uniqueSignals.values());
    }

    private List<CodexResetAnnouncementVO> parseAnnouncements(Document document) {
        List<CodexResetAnnouncementVO> announcements = new ArrayList<>();
        for (Element item : document.select("article[class*='__announcement']")) {
            Element time = item.selectFirst("time[datetime]");
            Element relative = item.selectFirst("[class*='__relative']");
            Element summary = item.selectFirst("[class*='__summary']");
            Element link = item.selectFirst("a[href*='x.com/'][href*='/status/']");
            if (summary == null || link == null) {
                continue;
            }
            CodexResetAnnouncementVO announcement = new CodexResetAnnouncementVO();
            announcement.setPublishedAt(time == null ? null : normalizeInstant(time.attr("datetime")));
            announcement.setRelativeTime(relative == null ? "" : relative.text());
            announcement.setSummary(summary.text());
            announcement.setSourceUrl(link.absUrl("href"));
            announcement.setId(resolveId(announcement.getSourceUrl(), announcement.getPublishedAt(), announcement.getSummary()));
            announcements.add(announcement);
            if (announcements.size() >= 20) {
                break;
            }
        }
        return announcements;
    }

    private void mergeLatestSignal(List<CodexResetSignalVO> history, CodexResetSignalVO latest) {
        for (int i = 0; i < history.size(); i++) {
            CodexResetSignalVO current = history.get(i);
            if (StringUtils.equals(current.getSourceUrl(), latest.getSourceUrl())
                    || (StringUtils.equals(current.getDate(), latest.getDate())
                    && StringUtils.equals(current.getKind(), latest.getKind()))) {
                if (StringUtils.isBlank(latest.getSourceUrl())) {
                    latest.setSourceUrl(current.getSourceUrl());
                }
                history.set(i, latest);
                return;
            }
        }
        history.add(latest);
    }

    private CodexResetStatsVO calculateStats(List<CodexResetSignalVO> history) {
        List<LocalDate> resetDates = history.stream()
                .filter(item -> "reset".equals(item.getKind()))
                .map(CodexResetSignalVO::getDate)
                .filter(this::isIsoDate)
                .map(LocalDate::parse)
                .distinct()
                .sorted()
                .toList();

        CodexResetStatsVO stats = new CodexResetStatsVO();
        stats.setResetCount(resetDates.size());
        if (!resetDates.isEmpty()) {
            stats.setLatestConfirmedResetAt(resetDates.get(resetDates.size() - 1).toString());
        }
        if (resetDates.size() < 2) {
            return stats;
        }

        long totalDays = 0;
        long longestDays = 0;
        for (int i = 1; i < resetDates.size(); i++) {
            long days = ChronoUnit.DAYS.between(resetDates.get(i - 1), resetDates.get(i));
            totalDays += days;
            longestDays = Math.max(longestDays, days);
        }
        stats.setAverageIntervalDays(roundOneDecimal((double) totalDays / (resetDates.size() - 1)));
        stats.setLongestIntervalDays(roundOneDecimal(longestDays));
        return stats;
    }

    private String resolveKind(String dataKind, String label) {
        String normalizedKind = StringUtils.defaultString(dataKind).toLowerCase(Locale.ROOT);
        if ("hard".equals(normalizedKind) || StringUtils.contains(label, "全员重置")) {
            return "reset";
        }
        if ("banked".equals(normalizedKind) || StringUtils.contains(label, "重置卡")) {
            return "reset_card";
        }
        if (StringUtils.contains(label, "未重置") || "none".equals(normalizedKind)) {
            return "no_reset";
        }
        return "info";
    }

    private String labelForKind(String kind) {
        return switch (kind) {
            case "reset" -> "全员重置";
            case "reset_card" -> "发重置卡";
            case "no_reset" -> "未重置";
            default -> "重置信号";
        };
    }

    private String resolveDate(String publishedAt, String fallbackText) {
        if (StringUtils.isNotBlank(publishedAt)) {
            try {
                return Instant.parse(publishedAt).atZone(BUSINESS_ZONE).toLocalDate().toString();
            } catch (DateTimeParseException ignored) {
                // Fall through to visible text.
            }
        }
        if (StringUtils.isNotBlank(fallbackText)) {
            String candidate = fallbackText.replaceAll(".*?(\\d{4}-\\d{2}-\\d{2}).*", "$1");
            if (isIsoDate(candidate)) {
                return candidate;
            }
        }
        return LocalDate.now(BUSINESS_ZONE).toString();
    }

    private String normalizeInstant(String value) {
        if (StringUtils.isBlank(value)) {
            return null;
        }
        try {
            return OffsetDateTime.parse(value).toInstant().toString();
        } catch (DateTimeParseException ignored) {
            try {
                return Instant.parse(value).toString();
            } catch (DateTimeParseException ignoredAgain) {
                return value;
            }
        }
    }

    private boolean isIsoDate(String value) {
        if (StringUtils.isBlank(value)) {
            return false;
        }
        try {
            LocalDate.parse(value);
            return true;
        } catch (DateTimeParseException ignored) {
            return false;
        }
    }

    private String resolveId(String sourceUrl, String publishedAt, String fallback) {
        if (StringUtils.isNotBlank(sourceUrl)) {
            String statusId = StringUtils.substringAfterLast(sourceUrl, "/status/");
            if (StringUtils.isNotBlank(statusId)) {
                return statusId.replaceAll("[^0-9A-Za-z_-].*", "");
            }
        }
        return Integer.toUnsignedString(StringUtils.defaultString(publishedAt, fallback).hashCode());
    }

    private double roundOneDecimal(double value) {
        return BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
