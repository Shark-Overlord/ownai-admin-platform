package com.yupi.springbootinit.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "yuque")
@Data
public class YuqueProperties {

    private String baseUrl = "https://www.yuque.com/api/v2";

    private String token;

    private Boolean syncEnabled = false;

    private String syncCron = "0 */10 * * * ?";

    private Integer connectTimeoutMs = 5000;

    private Integer readTimeoutMs = 15000;

    private String defaultVisibility = "public";

    /**
     * Minimum delay between two Yuque API requests. Yuque rate-limits bursty syncs.
     */
    private Integer minRequestIntervalMs = 1200;

    /**
     * Retry count after receiving Yuque 429 or temporary 5xx responses.
     */
    private Integer maxRetries = 3;

    private Integer retryBaseSleepMs = 3000;

    private Integer retryMaxSleepMs = 20000;
}
