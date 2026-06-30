package com.yupi.springbootinit.job.cycle;

import com.yupi.springbootinit.config.YuqueProperties;
import com.yupi.springbootinit.service.YuqueBookService;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class YuqueDocSyncJob {

    @Resource
    private YuqueProperties yuqueProperties;

    @Resource
    private YuqueBookService yuqueBookService;

    @Scheduled(cron = "${yuque.sync-cron:0 */10 * * * ?}")
    public void syncYuqueDocs() {
        if (!Boolean.TRUE.equals(yuqueProperties.getSyncEnabled())) {
            return;
        }
        try {
            yuqueBookService.syncAllEnabledBooks();
        } catch (Exception e) {
            log.warn("sync yuque docs failed", e);
        }
    }
}
