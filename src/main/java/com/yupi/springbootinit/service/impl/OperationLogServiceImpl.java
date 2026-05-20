package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.constant.CommonConstant;
import com.yupi.springbootinit.mapper.OperationLogMapper;
import com.yupi.springbootinit.model.dto.log.OperationLogQueryRequest;
import com.yupi.springbootinit.model.entity.OperationLog;
import com.yupi.springbootinit.service.OperationLogService;
import com.yupi.springbootinit.utils.SqlUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;

@Service
public class OperationLogServiceImpl extends ServiceImpl<OperationLogMapper, OperationLog> implements OperationLogService {

    @Override
    public void record(OperationLog operationLog) {
        if (operationLog != null) {
            this.save(operationLog);
        }
    }

    @Override
    public Page<OperationLog> listOperationLogs(OperationLogQueryRequest operationLogQueryRequest) {
        OperationLogQueryRequest safeRequest = operationLogQueryRequest == null ? new OperationLogQueryRequest()
                : operationLogQueryRequest;
        QueryWrapper<OperationLog> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq(safeRequest.getUserId() != null, "userId", safeRequest.getUserId());
        queryWrapper.eq(safeRequest.getStatus() != null, "status", safeRequest.getStatus());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getModule()), "module", safeRequest.getModule());
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getAction()), "action", safeRequest.getAction());
        String sortField = safeRequest.getSortField();
        String sortOrder = safeRequest.getSortOrder();
        queryWrapper.orderBy(SqlUtils.validSortField(sortField),
                CommonConstant.SORT_ORDER_ASC.equals(sortOrder), sortField);
        queryWrapper.orderByDesc("id");
        return this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), queryWrapper);
    }
}
