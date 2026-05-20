package com.yupi.springbootinit.aop;

import java.util.UUID;
import javax.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.util.StopWatch;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@Slf4j
public class LogInterceptor {

    @Around("execution(* com.yupi.springbootinit.controller.*.*(..))")
    public Object doInterceptor(ProceedingJoinPoint point) throws Throwable {
        StopWatch stopWatch = new StopWatch();
        stopWatch.start();
        RequestAttributes requestAttributes = RequestContextHolder.currentRequestAttributes();
        HttpServletRequest httpServletRequest = ((ServletRequestAttributes) requestAttributes).getRequest();
        String requestId = UUID.randomUUID().toString();
        String url = httpServletRequest.getRequestURI();
        String method = httpServletRequest.getMethod();
        log.info("request start, id: {}, method: {}, path: {}, ip: {}", requestId, method, url,
                httpServletRequest.getRemoteHost());
        Object result = point.proceed();
        stopWatch.stop();
        log.info("request end, id: {}, cost: {}ms", requestId, stopWatch.getTotalTimeMillis());
        return result;
    }
}
