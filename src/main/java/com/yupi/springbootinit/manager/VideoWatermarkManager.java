package com.yupi.springbootinit.manager;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.VideoWatermarkConfig;
import com.yupi.springbootinit.exception.BusinessException;
import java.awt.AlphaComposite;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import javax.annotation.Resource;
import javax.imageio.ImageIO;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

/**
 * Renders the public preview copy of a video. Original downloadable videos never pass through this manager.
 */
@Slf4j
@Component
public class VideoWatermarkManager {

    @Resource
    private VideoWatermarkConfig videoWatermarkConfig;

    @Resource
    private ResourceLoader resourceLoader;

    private volatile File cachedWatermarkFile;

    public File renderPreviewWatermark(File sourceFile) {
        if (sourceFile == null || !sourceFile.isFile()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Preview video file is invalid");
        }
        File outputFile;
        try {
            outputFile = File.createTempFile("preview-watermark-", ".mp4");
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Unable to create preview video");
        }

        List<String> command = new ArrayList<>();
        command.add(StringUtils.defaultIfBlank(videoWatermarkConfig.getFfmpegPath(), "ffmpeg"));
        command.add("-hide_banner");
        command.add("-loglevel");
        command.add("error");
        command.add("-y");
        command.add("-i");
        command.add(sourceFile.getAbsolutePath());
        command.add("-loop");
        command.add("1");
        command.add("-i");
        command.add(resolveWatermarkFile().getAbsolutePath());
        command.add("-filter_complex");
        command.add("[1:v]format=rgba,setsar=1[logo];[0:v]setsar=1[video];"
                + "[video][logo]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2:format=auto:shortest=1[watermarked]");
        command.add("-map");
        command.add("[watermarked]");
        command.add("-map");
        command.add("0:a?");
        command.add("-c:v");
        command.add("libx264");
        command.add("-preset");
        command.add("medium");
        command.add("-crf");
        command.add("23");
        command.add("-c:a");
        command.add("aac");
        command.add("-b:a");
        command.add("128k");
        command.add("-movflags");
        command.add("+faststart");
        command.add("-shortest");
        command.add(outputFile.getAbsolutePath());

        Process process = null;
        try {
            process = new ProcessBuilder(command).redirectErrorStream(true).start();
            boolean completed = process.waitFor(Math.max(videoWatermarkConfig.getTimeoutSeconds(), 1), TimeUnit.SECONDS);
            String processOutput = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (!completed) {
                process.destroyForcibly();
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "Preview video watermark processing timed out");
            }
            if (process.exitValue() != 0 || !outputFile.isFile() || outputFile.length() == 0) {
                log.warn("preview watermark rendering failed, exitCode={}, output={}", process.exitValue(),
                        StringUtils.abbreviate(processOutput, 1000));
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "Preview video watermark processing failed");
            }
            return outputFile;
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "Preview video watermark service is unavailable");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Preview video watermark processing interrupted");
        } finally {
            if (process != null && process.isAlive()) {
                process.destroyForcibly();
            }
            if (!outputFile.isFile() || outputFile.length() == 0) {
                deleteQuietly(outputFile);
            }
        }
    }

    private File resolveWatermarkFile() {
        if (cachedWatermarkFile != null && cachedWatermarkFile.isFile()) {
            return cachedWatermarkFile;
        }
        synchronized (this) {
            if (cachedWatermarkFile != null && cachedWatermarkFile.isFile()) {
                return cachedWatermarkFile;
            }
            org.springframework.core.io.Resource resource = resourceLoader.getResource(videoWatermarkConfig.getLogoPath());
            if (!resource.exists()) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Preview watermark logo is unavailable");
            }
            try (InputStream inputStream = resource.getInputStream()) {
                BufferedImage icon = ImageIO.read(inputStream);
                if (icon == null) {
                    throw new IOException("Unsupported watermark logo");
                }
                File watermarkFile = File.createTempFile("ownai-video-watermark-", ".png");
                ImageIO.write(buildWatermarkImage(icon), "png", watermarkFile);
                watermarkFile.deleteOnExit();
                cachedWatermarkFile = watermarkFile;
                return watermarkFile;
            } catch (IOException e) {
                throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Preview watermark logo is unavailable");
            }
        }
    }

    private BufferedImage buildWatermarkImage(BufferedImage icon) {
        final int iconBoxSize = 100;
        final double scale = Math.min((double) iconBoxSize / icon.getWidth(),
                (double) iconBoxSize / icon.getHeight());
        final int iconWidth = Math.max(1, (int) Math.round(icon.getWidth() * scale));
        final int iconHeight = Math.max(1, (int) Math.round(icon.getHeight() * scale));
        final int gap = 22;
        Font font = new Font(Font.SANS_SERIF, Font.BOLD, 76);
        BufferedImage metricsImage = new BufferedImage(1, 1, BufferedImage.TYPE_INT_ARGB);
        Graphics2D metricsGraphics = metricsImage.createGraphics();
        metricsGraphics.setFont(font);
        FontMetrics metrics = metricsGraphics.getFontMetrics();
        int textWidth = metrics.stringWidth("ownai.icu");
        int textHeight = metrics.getHeight();
        metricsGraphics.dispose();

        int width = iconBoxSize + gap + textWidth;
        int height = Math.max(iconBoxSize, textHeight) + 20;
        BufferedImage watermark = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = watermark.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        graphics.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.68f));
        int iconX = (iconBoxSize - iconWidth) / 2;
        int iconY = (height - iconHeight) / 2;
        graphics.drawImage(icon, iconX, iconY, iconWidth, iconHeight, null);
        graphics.setComposite(AlphaComposite.SrcOver);
        graphics.setFont(font);
        graphics.setColor(new Color(0xEB, 0xEB, 0xEB));
        int textY = (height - textHeight) / 2 + metrics.getAscent();
        graphics.drawString("ownai.icu", iconBoxSize + gap, textY);
        graphics.dispose();
        return watermark;
    }

    private void deleteQuietly(File file) {
        if (file.exists() && !file.delete()) {
            log.warn("temporary preview file cleanup failed: {}", file.getAbsolutePath());
        }
    }
}
