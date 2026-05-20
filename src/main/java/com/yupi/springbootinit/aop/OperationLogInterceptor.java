package com.yupi.springbootinit.aop;

import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.OperationLogService;
import com.yupi.springbootinit.service.UserService;
import java.util.Arrays;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
public class OperationLogInterceptor {

    private static final int MAX_PARAM_LENGTH = 500;

    @Resource
    private OperationLogService operationLogService;

    @Resource
    private UserService userService;

    @Around("@annotation(operationLog)")
    public Object doInterceptor(ProceedingJoinPoint joinPoint, OperationLog operationLog) throws Throwable {
        long start = System.currentTimeMillis();
        RequestAttributes requestAttributes = RequestContextHolder.currentRequestAttributes();
        HttpServletRequest request = ((ServletRequestAttributes) requestAttributes).getRequest();
        User loginUser = userService.getLoginUserPermitNull(request);
        String requestParams = buildRequestParams(joinPoint.getArgs());
        com.yupi.springbootinit.model.entity.OperationLog logEntity = new com.yupi.springbootinit.model.entity.OperationLog();
        logEntity.setUserId(loginUser == null ? null : loginUser.getId());
        logEntity.setModule(operationLog.module());
        logEntity.setAction(operationLog.action());
        logEntity.setRequestMethod(request.getMethod());
        logEntity.setRequestUri(request.getRequestURI());
        logEntity.setRequestParams(requestParams);
        try {
            Object result = joinPoint.proceed();
            logEntity.setStatus(1);
            return result;
        } catch (Throwable e) {
            logEntity.setStatus(0);
            logEntity.setErrorMessage(limitLength(e.getMessage(), 500));
            throw e;
        } finally {
            logEntity.setCostTime(System.currentTimeMillis() - start);
            operationLogService.record(logEntity);
        }
    }

    private String buildRequestParams(Object[] args) {
        if (args == null || args.length == 0) {
            return "";
        }
        String paramString = Arrays.stream(args)
                .filter(arg -> !(arg instanceof HttpServletRequest))
                .map(arg -> arg == null ? "null" : arg.getClass().getSimpleName())
                .collect(Collectors.joining(","));
        return limitLength(paramString, MAX_PARAM_LENGTH);
    }

    private String limitLength(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }
}
