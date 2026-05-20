package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.log.OperationLogQueryRequest;
import com.yupi.springbootinit.model.entity.OperationLog;

public interface OperationLogService extends IService<OperationLog> {

    void record(OperationLog operationLog);

    Page<OperationLog> listOperationLogs(OperationLogQueryRequest operationLogQueryRequest);
}
