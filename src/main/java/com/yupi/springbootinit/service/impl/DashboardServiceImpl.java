package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.mapper.ArtworkMapper;
import com.yupi.springbootinit.mapper.ArtworkOrderMapper;
import com.yupi.springbootinit.mapper.ImageGenerationMessageMapper;
import com.yupi.springbootinit.mapper.MemberOrderMapper;
import com.yupi.springbootinit.mapper.PointRecordMapper;
import com.yupi.springbootinit.mapper.PromptAssetFavoriteMapper;
import com.yupi.springbootinit.mapper.PromptAssetImportBatchMapper;
import com.yupi.springbootinit.mapper.PromptAssetMapper;
import com.yupi.springbootinit.mapper.UserMapper;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.ArtworkOrder;
import com.yupi.springbootinit.model.entity.ImageGenerationMessage;
import com.yupi.springbootinit.model.entity.MemberOrder;
import com.yupi.springbootinit.model.entity.PointRecord;
import com.yupi.springbootinit.model.entity.PromptAsset;
import com.yupi.springbootinit.model.entity.PromptAssetFavorite;
import com.yupi.springbootinit.model.entity.PromptAssetImportBatch;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.enums.OrderStatusEnum;
import com.yupi.springbootinit.model.vo.dashboard.DashboardOverviewVO;
import com.yupi.springbootinit.service.DashboardService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import javax.annotation.Resource;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class DashboardServiceImpl implements DashboardService {

    private static final String ROLE_ASSISTANT = "assistant";

    private static final String STATUS_PENDING = "pending";

    private static final String STATUS_RUNNING = "running";

    private static final String STATUS_SUCCESS = "success";

    private static final String STATUS_FAILED = "failed";

    @Resource
    private UserMapper userMapper;

    @Resource
    private ArtworkMapper artworkMapper;

    @Resource
    private PromptAssetMapper promptAssetMapper;

    @Resource
    private PromptAssetFavoriteMapper promptAssetFavoriteMapper;

    @Resource
    private ArtworkOrderMapper artworkOrderMapper;

    @Resource
    private MemberOrderMapper memberOrderMapper;

    @Resource
    private PointRecordMapper pointRecordMapper;

    @Resource
    private ImageGenerationMessageMapper imageGenerationMessageMapper;

    @Resource
    private PromptAssetImportBatchMapper promptAssetImportBatchMapper;

    @Value("${image.generation.pending-timeout-minutes:20}")
    private Integer pendingTimeoutMinutes;

    @Override
    public DashboardOverviewVO getAdminOverview() {
        Date todayStart = getTodayStart();
        Date tomorrowStart = getTomorrowStart();
        DashboardOverviewVO overview = new DashboardOverviewVO();
        overview.setUser(buildUserStats(todayStart, tomorrowStart));
        overview.setContent(buildContentStats());
        overview.setCommerce(buildCommerceStats(todayStart, tomorrowStart));
        overview.setPoint(buildPointStats(todayStart, tomorrowStart));
        overview.setImageGeneration(buildImageGenerationStats(todayStart, tomorrowStart));
        overview.setLatestImportBatch(buildLatestImportBatch());
        return overview;
    }

    private DashboardOverviewVO.UserStats buildUserStats(Date todayStart, Date tomorrowStart) {
        DashboardOverviewVO.UserStats stats = new DashboardOverviewVO.UserStats();
        stats.setTotal(userMapper.selectCount(new QueryWrapper<>()));
        stats.setTodayNew(userMapper.selectCount(new QueryWrapper<User>()
                .ge("createTime", todayStart)
                .lt("createTime", tomorrowStart)));
        stats.setPlus(userMapper.selectCount(new QueryWrapper<User>()
                .eq("memberLevel", MemberLevelEnum.PLUS.getValue())));
        stats.setPro(userMapper.selectCount(new QueryWrapper<User>()
                .eq("memberLevel", MemberLevelEnum.PRO.getValue())));
        return stats;
    }

    private DashboardOverviewVO.ContentStats buildContentStats() {
        DashboardOverviewVO.ContentStats stats = new DashboardOverviewVO.ContentStats();
        stats.setArtworkTotal(artworkMapper.selectCount(new QueryWrapper<Artwork>()));
        stats.setPromptAssetTotal(promptAssetMapper.selectCount(new QueryWrapper<PromptAsset>()));
        stats.setPromptAssetPublished(promptAssetMapper.selectCount(new QueryWrapper<PromptAsset>().eq("status", 1)));
        stats.setPromptAssetUnpublished(promptAssetMapper.selectCount(new QueryWrapper<PromptAsset>()
                .and(wrapper -> wrapper.ne("status", 1).or().isNull("status"))));
        stats.setPromptFavoriteTotal(promptAssetFavoriteMapper.selectCount(new QueryWrapper<PromptAssetFavorite>()
                .eq("isDelete", 0)));
        return stats;
    }

    private DashboardOverviewVO.CommerceStats buildCommerceStats(Date todayStart, Date tomorrowStart) {
        DashboardOverviewVO.CommerceStats stats = new DashboardOverviewVO.CommerceStats();
        QueryWrapper<ArtworkOrder> todayArtworkOrderQuery = new QueryWrapper<ArtworkOrder>()
                .ge("createTime", todayStart)
                .lt("createTime", tomorrowStart);
        QueryWrapper<MemberOrder> todayMemberOrderQuery = new QueryWrapper<MemberOrder>()
                .ge("createTime", todayStart)
                .lt("createTime", tomorrowStart);
        stats.setTodayArtworkOrders(artworkOrderMapper.selectCount(todayArtworkOrderQuery));
        stats.setTodayMemberOrders(memberOrderMapper.selectCount(todayMemberOrderQuery));
        BigDecimal artworkAmount = sumBigDecimal(artworkOrderMapper,
                new QueryWrapper<ArtworkOrder>().select("IFNULL(SUM(orderAmount), 0)")
                        .ge("createTime", todayStart)
                        .lt("createTime", tomorrowStart));
        BigDecimal memberAmount = sumBigDecimal(memberOrderMapper,
                new QueryWrapper<MemberOrder>().select("IFNULL(SUM(orderAmount), 0)")
                        .ge("createTime", todayStart)
                        .lt("createTime", tomorrowStart));
        stats.setTodayOrderAmount(artworkAmount.add(memberAmount));
        long pendingArtworkOrders = artworkOrderMapper.selectCount(new QueryWrapper<ArtworkOrder>()
                .eq("orderStatus", OrderStatusEnum.PENDING.getValue()));
        long pendingMemberOrders = memberOrderMapper.selectCount(new QueryWrapper<MemberOrder>()
                .eq("orderStatus", OrderStatusEnum.PENDING.getValue()));
        stats.setPendingOrders(pendingArtworkOrders + pendingMemberOrders);
        return stats;
    }

    private DashboardOverviewVO.PointStats buildPointStats(Date todayStart, Date tomorrowStart) {
        DashboardOverviewVO.PointStats stats = new DashboardOverviewVO.PointStats();
        Long granted = sumLong(pointRecordMapper,
                new QueryWrapper<PointRecord>().select("IFNULL(SUM(changeAmount), 0)")
                        .gt("changeAmount", 0)
                        .ge("createTime", todayStart)
                        .lt("createTime", tomorrowStart));
        Long deducted = sumLong(pointRecordMapper,
                new QueryWrapper<PointRecord>().select("IFNULL(SUM(ABS(changeAmount)), 0)")
                        .lt("changeAmount", 0)
                        .ge("createTime", todayStart)
                        .lt("createTime", tomorrowStart));
        Long totalBalance = sumLong(userMapper,
                new QueryWrapper<User>().select("IFNULL(SUM(pointBalance), 0)"));
        stats.setTodayGranted(granted);
        stats.setTodayDeducted(deducted);
        stats.setTotalBalance(totalBalance);
        return stats;
    }

    private DashboardOverviewVO.ImageGenerationStats buildImageGenerationStats(Date todayStart, Date tomorrowStart) {
        DashboardOverviewVO.ImageGenerationStats stats = new DashboardOverviewVO.ImageGenerationStats();
        stats.setTodayTasks(imageGenerationMessageMapper.selectCount(buildTaskQuery()
                .ge("createTime", todayStart)
                .lt("createTime", tomorrowStart)));
        stats.setPendingTasks(imageGenerationMessageMapper.selectCount(buildTaskQuery().eq("status", STATUS_PENDING)));
        stats.setRunningTasks(imageGenerationMessageMapper.selectCount(buildTaskQuery().eq("status", STATUS_RUNNING)));
        stats.setSuccessTasks(imageGenerationMessageMapper.selectCount(buildTaskQuery().eq("status", STATUS_SUCCESS)));
        stats.setFailedTasks(imageGenerationMessageMapper.selectCount(buildTaskQuery().eq("status", STATUS_FAILED)));
        Date timeoutTime = new Date(System.currentTimeMillis() - getPendingTimeoutMinutes() * 60L * 1000L);
        stats.setTimeoutPendingTasks(imageGenerationMessageMapper.selectCount(buildTaskQuery()
                .eq("status", STATUS_PENDING)
                .le("createTime", timeoutTime)));
        stats.setTodayPointCost(sumLong(imageGenerationMessageMapper,
                buildTaskQuery().select("IFNULL(SUM(pointCost), 0)")
                        .ge("createTime", todayStart)
                        .lt("createTime", tomorrowStart)));
        stats.setTodayApiCostCny(sumBigDecimal(imageGenerationMessageMapper,
                buildTaskQuery().select("IFNULL(SUM(apiCostCny), 0)")
                        .ge("createTime", todayStart)
                        .lt("createTime", tomorrowStart)));
        stats.setTodayManualCostCny(sumBigDecimal(imageGenerationMessageMapper,
                buildTaskQuery().select("IFNULL(SUM(manualCostCny), 0)")
                        .ge("createTime", todayStart)
                        .lt("createTime", tomorrowStart)));
        return stats;
    }

    private DashboardOverviewVO.LatestImportBatch buildLatestImportBatch() {
        PromptAssetImportBatch batch = promptAssetImportBatchMapper.selectOne(new QueryWrapper<PromptAssetImportBatch>()
                .orderByDesc("id")
                .last("LIMIT 1"));
        if (batch == null) {
            return null;
        }
        DashboardOverviewVO.LatestImportBatch vo = new DashboardOverviewVO.LatestImportBatch();
        BeanUtils.copyProperties(batch, vo);
        return vo;
    }

    private QueryWrapper<ImageGenerationMessage> buildTaskQuery() {
        return new QueryWrapper<ImageGenerationMessage>()
                .eq("role", ROLE_ASSISTANT)
                .isNotNull("taskId");
    }

    private Date getTodayStart() {
        ZoneId zoneId = ZoneId.systemDefault();
        return Date.from(LocalDate.now(zoneId).atStartOfDay(zoneId).toInstant());
    }

    private Date getTomorrowStart() {
        ZoneId zoneId = ZoneId.systemDefault();
        return Date.from(LocalDate.now(zoneId).plusDays(1).atStartOfDay(zoneId).toInstant());
    }

    private int getPendingTimeoutMinutes() {
        return pendingTimeoutMinutes == null || pendingTimeoutMinutes <= 0 ? 20 : pendingTimeoutMinutes;
    }

    private <T> Long sumLong(BaseMapper<T> mapper, QueryWrapper<T> queryWrapper) {
        Object value = mapper.selectObjs(queryWrapper).stream().findFirst().orElse(null);
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

    private <T> BigDecimal sumBigDecimal(BaseMapper<T> mapper, QueryWrapper<T> queryWrapper) {
        Object value = mapper.selectObjs(queryWrapper).stream().findFirst().orElse(null);
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal) {
            return (BigDecimal) value;
        }
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        return new BigDecimal(String.valueOf(value));
    }
}
