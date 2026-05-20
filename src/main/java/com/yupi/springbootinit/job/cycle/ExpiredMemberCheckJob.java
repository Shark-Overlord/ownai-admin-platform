package com.yupi.springbootinit.job.cycle;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.service.UserService;
import java.util.Date;
import java.util.List;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 会员过期检测定时任务
 * 每天凌晨 3:00 执行，扫描并降级过期会员
 */
@Component
@Slf4j
public class ExpiredMemberCheckJob {

    @Resource
    private UserService userService;

    @Scheduled(cron = "0 0 3 * * ?")
    public void doCheck() {
        log.info("开始执行会员过期检测任务...");
        Date now = new Date();
        // 查询所有非普通会员且已过期或即将过期（实际已过期）的用户
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();
        queryWrapper.ne("memberLevel", MemberLevelEnum.NORMAL.getValue());
        queryWrapper.isNotNull("memberExpireTime");
        queryWrapper.le("memberExpireTime", now);
        List<User> expiredUsers = userService.list(queryWrapper);
        if (expiredUsers == null || expiredUsers.isEmpty()) {
            log.info("本次检测未发现过期会员");
            return;
        }
        int count = 0;
        for (User user : expiredUsers) {
            try {
                boolean expired = userService.checkAndExpireMember(user);
                if (expired) {
                    count++;
                    log.info("会员已过期并降级: userId={}, oldLevel={}, oldPlanType={}",
                            user.getId(), user.getMemberLevel(), user.getMemberPlanType());
                }
            } catch (Exception e) {
                log.error("会员过期处理失败: userId={}", user.getId(), e);
            }
        }
        log.info("会员过期检测任务完成，共处理 {} 个过期会员", count);
    }
}
