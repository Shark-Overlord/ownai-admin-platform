package com.yupi.springbootinit.utils;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.apache.commons.lang3.StringUtils;

import javax.crypto.SecretKey;
import javax.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具类
 */
public class JwtUtils {

    /**
     * 密钥（至少 256 bit，建议生产环境放到配置文件中）
     */
    private static final String SECRET = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    /**
     * 有效期：7 天
     */
    private static final long EXPIRATION = 1000L * 60 * 60 * 24 * 7;

    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private static final String TOKEN_PREFIX = "Bearer ";

    /**
     * 生成 token
     *
     * @param user 用户
     * @return token
     */
    public static String generateToken(User user) {
        if (user == null || user.getId() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "用户为空");
        }
        Date now = new Date();
        Date expiration = new Date(now.getTime() + EXPIRATION);
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("userRole", user.getUserRole())
                .issuedAt(now)
                .expiration(expiration)
                .signWith(KEY)
                .compact();
    }

    /**
     * 解析 token
     *
     * @param token token
     * @return Claims
     */
    public static Claims parseToken(String token) {
        if (StringUtils.isBlank(token)) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        try {
            return Jwts.parser()
                    .verifyWith(KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR, "登录已过期，请重新登录");
        }
    }

    /**
     * 从请求中获取 token
     *
     * @param request 请求
     * @return token
     */
    public static String getTokenFromRequest(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (StringUtils.isBlank(authorization) || !authorization.startsWith(TOKEN_PREFIX)) {
            return null;
        }
        return authorization.substring(TOKEN_PREFIX.length());
    }
}
