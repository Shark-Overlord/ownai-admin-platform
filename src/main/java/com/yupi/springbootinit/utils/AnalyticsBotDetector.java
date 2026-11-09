package com.yupi.springbootinit.utils;

import java.util.Locale;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;

/**
 * Utility for identifying automated crawlers, bots, and headless browsers
 * so they do not pollute site/resource analytics or view counters.
 */
public final class AnalyticsBotDetector {

    private static final int MIN_VALID_USER_AGENT_LENGTH = 12;

    private static final Pattern BOT_USER_AGENT_PATTERN = Pattern.compile(
            "bot|spider|crawler|slurp|headless|phantomjs|puppeteer|playwright|selenium|"
                    + "curl/|wget/|python-requests|python-urllib|go-http-client|apache-httpclient|"
                    + "okhttp|scrapy|lighthouse|pagespeed|gtmetrix|facebookexternalhit|embedly|"
                    + "quora link preview|outbrain|pinterest|slackbot|vkshare|w3c_validator|"
                    + "whatsapp|telegrambot|discordbot|applebot|bingpreview|mediapartners-google|"
                    + "adsbot-google|apis-google|google-extended|gptbot|oai-searchbot|chatgpt-user|"
                    + "claudebot|claude-searchbot|perplexitybot|bytespider|petalbot|semrush|ahrefs|"
                    + "mj12bot|dotbot|seranking|censys|zgrab|masscan|nmap",
            Pattern.CASE_INSENSITIVE);

    private AnalyticsBotDetector() {
    }

    public static boolean isBotUserAgent(String userAgent) {
        String normalized = StringUtils.trimToEmpty(userAgent);
        if (normalized.length() < MIN_VALID_USER_AGENT_LENGTH) {
            return true;
        }
        String lower = normalized.toLowerCase(Locale.ROOT);
        if (lower.startsWith("java/")) {
            return true;
        }
        return BOT_USER_AGENT_PATTERN.matcher(lower).find();
    }
}
