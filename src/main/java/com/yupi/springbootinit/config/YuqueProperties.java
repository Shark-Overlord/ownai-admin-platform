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
}
