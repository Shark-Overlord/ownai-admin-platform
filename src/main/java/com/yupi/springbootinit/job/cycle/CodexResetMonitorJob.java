package com.yupi.springbootinit.job.cycle;

import com.yupi.springbootinit.service.CodexResetMonitorService;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class CodexResetMonitorJob {

    @Resource
    private CodexResetMonitorService codexResetMonitorService;

    @Scheduled(
            initialDelayString = "${codex.reset-monitor.initial-delay-ms:3000}",
            fixedDelayString = "${codex.reset-monitor.refresh-interval-ms:600000}"
    )
    public void refreshResetSignals() {
        if (!codexResetMonitorService.isEnabled()) {
            return;
        }
        codexResetMonitorService.refresh();
    }
}
