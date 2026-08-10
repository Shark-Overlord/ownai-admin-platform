package com.yupi.springbootinit.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Runtime configuration for preview-video watermark rendering.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "video.watermark")
public class VideoWatermarkConfig {

    /** FFmpeg executable name or absolute path. */
    private String ffmpegPath = "ffmpeg";

    /** Classpath or filesystem path for the transparent PNG brand watermark. */
    private String logoPath = "classpath:watermark/ownai-logo.png";

    /** Maximum duration for a single preview-video render. */
    private long timeoutSeconds = 600;
}
