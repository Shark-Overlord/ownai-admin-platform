package com.yupi.springbootinit.job.cycle;

import com.yupi.springbootinit.service.ImageGenerationMessageService;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class ImageGenerationRunningTimeoutRecoverJob {

    @Resource
    private ImageGenerationMessageService imageGenerationMessageService;

    @Value("${image.generation.running-timeout-minutes:20}")
    private Integer runningTimeoutMinutes;

    @Scheduled(fixedDelayString = "${image.generation.running-timeout-scan-interval-ms:300000}")
    public void recoverStaleRunningTasks() {
        int count = imageGenerationMessageService.recoverStaleRunningTasks(runningTimeoutMinutes);
        if (count > 0) {
            log.warn("Recovered {} stale running image generation tasks to pending", count);
        }
    }
}
