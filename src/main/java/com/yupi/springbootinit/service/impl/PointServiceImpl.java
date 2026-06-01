package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.PointRecordMapper;
import com.yupi.springbootinit.mapper.UserMapper;
import com.yupi.springbootinit.model.dto.point.PointRecordQueryRequest;
import com.yupi.springbootinit.model.entity.PointRecord;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.PointChangeTypeEnum;
import com.yupi.springbootinit.model.vo.point.PointOverviewVO;
import com.yupi.springbootinit.service.PointService;
import com.yupi.springbootinit.utils.SqlUtils;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PointServiceImpl extends ServiceImpl<PointRecordMapper, PointRecord> implements PointService {

    private static final int DAILY_CHECK_IN_REWARD = 5;

    @Resource
    private UserMapper userMapper;

    @Override
    public PointOverviewVO getPointOverview(User loginUser) {
        PointOverviewVO pointOverviewVO = new PointOverviewVO();
        BeanUtils.copyProperties(loginUser, pointOverviewVO);
        return pointOverviewVO;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int dailyCheckIn(User loginUser) {
        Date lastCheckInDate = loginUser.getLastCheckInDate();
        LocalDate today = LocalDate.now();
        if (lastCheckInDate != null) {
            LocalDate lastCheckInLocalDate = lastCheckInDate.toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
            ThrowUtils.throwIf(today.equals(lastCheckInLocalDate), ErrorCode.OPERATION_ERROR,
                    "Already checked in today");
        }
        addPoints(loginUser.getId(), DAILY_CHECK_IN_REWARD, PointChangeTypeEnum.CHECK_IN_REWARD, "check_in",
                loginUser.getId(), "Daily check-in reward");
        User updateUser = new User();
        updateUser.setId(loginUser.getId());
        updateUser.setLastCheckInDate(new Date());
        userMapper.updateById(updateUser);
        return DAILY_CHECK_IN_REWARD;
    }

    @Override
    public Page<PointRecord> listMyPointRecords(PointRecordQueryRequest pointRecordQueryRequest, User loginUser) {
        PointRecordQueryRequest safeRequest = pointRecordQueryRequest == null ? new PointRecordQueryRequest()
                : pointRecordQueryRequest;
        QueryWrapper<PointRecord> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("userId", loginUser.getId());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getChangeType()), "changeType", safeRequest.getChangeType());
        if (SqlUtils.validSortField(safeRequest.getSortField())) {
            queryWrapper.orderBy(true, "ascend".equals(safeRequest.getSortOrder()), safeRequest.getSortField());
        }
        queryWrapper.orderByDesc("id");
        return this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), queryWrapper);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addPoints(Long userId, int amount, PointChangeTypeEnum pointChangeTypeEnum, String relatedType,
            Long relatedId, String description) {
        validatePointChange(userId, amount, pointChangeTypeEnum);
        int updatedRows = userMapper.update(null, new UpdateWrapper<User>()
                .eq("id", userId)
                .setSql("pointBalance = pointBalance + " + amount));
        ThrowUtils.throwIf(updatedRows <= 0, ErrorCode.NOT_FOUND_ERROR, "User does not exist");
        User user = getUserById(userId);
        savePointRecord(userId, amount, getSafeBalance(user), pointChangeTypeEnum, relatedType, relatedId, description);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deductPoints(Long userId, int amount, PointChangeTypeEnum pointChangeTypeEnum, String relatedType,
            Long relatedId, String description) {
        validatePointChange(userId, amount, pointChangeTypeEnum);
        int updatedRows = userMapper.update(null, new UpdateWrapper<User>()
                .eq("id", userId)
                .ge("pointBalance", amount)
                .setSql("pointBalance = pointBalance - " + amount));
        if (updatedRows <= 0) {
            User user = getUserById(userId);
            ThrowUtils.throwIf(getSafeBalance(user) < amount, ErrorCode.OPERATION_ERROR, "Insufficient points");
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Failed to deduct points");
        }
        User user = getUserById(userId);
        savePointRecord(userId, -amount, getSafeBalance(user), pointChangeTypeEnum, relatedType, relatedId,
                description);
    }

    private void validatePointChange(Long userId, int amount, PointChangeTypeEnum pointChangeTypeEnum) {
        ThrowUtils.throwIf(userId == null || userId <= 0, ErrorCode.PARAMS_ERROR, "Invalid user id");
        ThrowUtils.throwIf(amount <= 0, ErrorCode.PARAMS_ERROR, "Point amount must be greater than 0");
        ThrowUtils.throwIf(pointChangeTypeEnum == null, ErrorCode.PARAMS_ERROR, "Point change type is required");
    }

    private User getUserById(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "User does not exist");
        }
        return user;
    }

    private int getSafeBalance(User user) {
        return user.getPointBalance() == null ? 0 : user.getPointBalance();
    }

    private void savePointRecord(Long userId, int changeAmount, int balanceAfter, PointChangeTypeEnum pointChangeTypeEnum,
            String relatedType, Long relatedId, String description) {
        PointRecord pointRecord = new PointRecord();
        pointRecord.setUserId(userId);
        pointRecord.setChangeAmount(changeAmount);
        pointRecord.setBalanceAfter(balanceAfter);
        pointRecord.setChangeType(pointChangeTypeEnum.getValue());
        pointRecord.setRelatedType(relatedType);
        pointRecord.setRelatedId(relatedId);
        pointRecord.setDescription(description);
        boolean result = this.save(pointRecord);
        ThrowUtils.throwIf(!result, ErrorCode.SYSTEM_ERROR, "Failed to write point record");
    }
}
