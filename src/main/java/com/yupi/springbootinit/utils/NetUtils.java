package com.yupi.springbootinit.utils;

import javax.servlet.http.HttpServletRequest;

/**
 * Network helpers.
 */
public class NetUtils {

    private static final int MAX_IP_LENGTH = 45;

    private NetUtils() {
    }

    /**
     * Resolves a client IP without trusting spoofable forwarding headers.
     *
     * <p>The production backend is bound to loopback and only Nginx can reach it.
     * Nginx overwrites {@code X-Real-IP} with its direct client's remote address.
     * For every non-loopback connection, the socket peer address is authoritative.
     */
    public static String getIpAddress(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String remoteAddr = trimIp(request.getRemoteAddr());
        if (isLoopback(remoteAddr)) {
            String realIp = trimIp(request.getHeader("X-Real-IP"));
            if (realIp != null) {
                return realIp;
            }
        }
        return remoteAddr == null ? "unknown" : remoteAddr;
    }

    private static boolean isLoopback(String ip) {
        return "127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip);
    }

    private static String trimIp(String value) {
        if (value == null) {
            return null;
        }
        String ip = value.trim();
        if (ip.isEmpty() || "unknown".equalsIgnoreCase(ip) || ip.length() > MAX_IP_LENGTH) {
            return null;
        }
        return ip;
    }
}
