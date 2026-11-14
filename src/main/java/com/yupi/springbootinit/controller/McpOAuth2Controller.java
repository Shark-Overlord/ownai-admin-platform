package com.yupi.springbootinit.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.model.dto.mcp.McpOAuth2ApproveRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyVO;
import com.yupi.springbootinit.model.vo.mcp.McpOAuth2ApproveVO;
import com.yupi.springbootinit.service.UserMcpKeyService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 标准 OAuth 2.0 Authorization Code 授权端点（对接 WorkBuddy / CodeBuddy Connector 云端托管授权）。
 */
@Slf4j
@RestController
@RequestMapping("/mcp/oauth2")
@Api(tags = "MCP 标准 OAuth2 授权")
public class McpOAuth2Controller {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final long AUTH_CODE_TTL_MS = 5 * 60 * 1000L;
    private static final long ACCESS_TOKEN_EXPIRES_IN_SECONDS = 30 * 24 * 3600L;
    private static final long REFRESH_TOKEN_TTL_MS = 90L * 24 * 3600 * 1000L;
    private static final String WORKBUDDY_KEY_NAME = "WorkBuddy Connector";

    private final UserService userService;
    private final UserMcpKeyService userMcpKeyService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ConcurrentHashMap<String, PendingAuthCode> pendingCodes = new ConcurrentHashMap<>();

    @Getter
    @Setter
    @Value("${ownai.mcp.oauth2.client-id:ownai-workbuddy-client}")
    private String configuredClientId = "ownai-workbuddy-client";

    @Getter
    @Setter
    @Value("${ownai.mcp.oauth2.client-secret:}")
    private String configuredClientSecret = "";

    @Getter
    @Setter
    @Value("${ownai.mcp.web-base-url:https://ownai.icu}")
    private String webBaseUrl = "https://ownai.icu";

    public McpOAuth2Controller(UserService userService, UserMcpKeyService userMcpKeyService) {
        this.userService = userService;
        this.userMcpKeyService = userMcpKeyService;
    }

    /**
     * 1. 标准 OAuth2 浏览器授权入口：校验 client_id 与回调白名单后跳转前端确认页
     */
    @GetMapping("/authorize")
    @ApiOperation("OAuth2 浏览器授权跳转入口")
    public void authorizeRedirect(
            @RequestParam(name = "response_type", defaultValue = "code") String responseType,
            @RequestParam(name = "client_id") String clientId,
            @RequestParam(name = "redirect_uri") String redirectUri,
            @RequestParam(name = "state", required = false) String state,
            @RequestParam(name = "scope", required = false) String scope,
            @RequestParam(name = "code_challenge", required = false) String codeChallenge,
            @RequestParam(name = "code_challenge_method", required = false) String codeChallengeMethod,
            HttpServletResponse response) throws IOException {

        if (!"code".equalsIgnoreCase(StringUtils.trimToEmpty(responseType))) {
            sendPlainError(response, HttpServletResponse.SC_BAD_REQUEST, "unsupported_response_type");
            return;
        }
        if (!isValidClientId(clientId)) {
            sendPlainError(response, HttpServletResponse.SC_BAD_REQUEST, "invalid_client");
            return;
        }
        if (!isAllowedRedirectUri(redirectUri)) {
            sendPlainError(response, HttpServletResponse.SC_BAD_REQUEST, "invalid_redirect_uri");
            return;
        }

        StringBuilder target = new StringBuilder(StringUtils.removeEnd(webBaseUrl.trim(), "/"))
                .append("/mcp/auth?oauth2=1&client=WorkBuddy")
                .append("&client_id=").append(urlEncode(clientId.trim()))
                .append("&redirect_uri=").append(urlEncode(redirectUri.trim()));
        if (StringUtils.isNotBlank(state)) {
            target.append("&state=").append(urlEncode(state));
        }
        if (StringUtils.isNotBlank(scope)) {
            target.append("&scope=").append(urlEncode(scope));
        }
        if (StringUtils.isNotBlank(codeChallenge)) {
            target.append("&code_challenge=").append(urlEncode(codeChallenge.trim()));
        }
        if (StringUtils.isNotBlank(codeChallengeMethod)) {
            target.append("&code_challenge_method=").append(urlEncode(codeChallengeMethod.trim()));
        }

        response.sendRedirect(target.toString());
    }

    /**
     * 2. 前端确认授权页点击【确认授权】后签发一次性 code 并构造回调地址
     */
    @PostMapping("/approve")
    @ApiOperation("确认 OAuth2 授权并签发一次性授权码")
    public BaseResponse<McpOAuth2ApproveVO> approve(
            @RequestBody McpOAuth2ApproveRequest request,
            HttpServletRequest httpRequest) {
        ThrowUtils.throwIf(request == null, ErrorCode.PARAMS_ERROR);
        if (!isValidClientId(request.getClientId())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "无效的 OAuth2 client_id");
        }
        if (!isAllowedRedirectUri(request.getRedirectUri())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "redirect_uri 不在允许的白名单域名内");
        }

        User loginUser = userService.getLoginUser(httpRequest);
        if (!userMcpKeyService.isEligibleMember(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "MCP 助手完整权限仅面向付费会员开放，请先开通会员");
        }

        pruneExpiredCodes();

        String code = "oac_" + randomUrlSafeToken(24);
        PendingAuthCode pending = new PendingAuthCode(
                loginUser.getId(),
                request.getClientId().trim(),
                request.getRedirectUri().trim(),
                StringUtils.trimToNull(request.getCodeChallenge()),
                StringUtils.defaultIfBlank(StringUtils.trimToNull(request.getCodeChallengeMethod()), "S256"),
                System.currentTimeMillis() + AUTH_CODE_TTL_MS
        );
        pendingCodes.put(code, pending);

        String redirectUrl = appendQueryParams(request.getRedirectUri().trim(), code, request.getState());
        McpOAuth2ApproveVO vo = new McpOAuth2ApproveVO();
        vo.setCode(code);
        vo.setState(request.getState());
        vo.setRedirectUrl(redirectUrl);

        log.info("用户 userId={} 批准 WorkBuddy OAuth2 授权码签发", loginUser.getId());
        return ResultUtils.success(vo);
    }

    /**
     * 3. 标准 OAuth2 Token 交换与刷新端点（支持 form-urlencoded / JSON 以及 body / Basic Auth）
     */
    @PostMapping(
            value = "/token",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @ApiOperation("OAuth2 换取或刷新 Access Token")
    public ResponseEntity<Map<String, Object>> token(
            @RequestBody(required = false) String rawBody,
            HttpServletRequest request) {

        if (StringUtils.isBlank(configuredClientSecret)) {
            return oauthError(HttpStatus.SERVICE_UNAVAILABLE, "unauthorized_client",
                    "OAuth2 client_secret is not configured on server.");
        }

        Map<String, String> params = extractTokenParams(request, rawBody);
        String[] basicCreds = extractBasicAuth(request);

        String clientId = StringUtils.firstNonBlank(
                basicCreds != null ? basicCreds[0] : null,
                params.get("client_id"));
        String clientSecret = StringUtils.firstNonBlank(
                basicCreds != null ? basicCreds[1] : null,
                params.get("client_secret"));

        if (!isValidClientId(clientId) || !constantTimeEquals(configuredClientSecret, clientSecret)) {
            return oauthError(HttpStatus.UNAUTHORIZED, "invalid_client", "Invalid client credentials.");
        }

        String grantType = StringUtils.trimToEmpty(params.get("grant_type"));
        if ("authorization_code".equals(grantType)) {
            return handleAuthorizationCodeGrant(params, clientId.trim());
        }
        if ("refresh_token".equals(grantType)) {
            return handleRefreshTokenGrant(params, clientId.trim());
        }
        return oauthError(HttpStatus.BAD_REQUEST, "unsupported_grant_type",
                "Supported grant_type values: authorization_code, refresh_token.");
    }

    private ResponseEntity<Map<String, Object>> handleAuthorizationCodeGrant(
            Map<String, String> params, String clientId) {
        String code = StringUtils.trimToNull(params.get("code"));
        if (code == null) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_request", "Missing authorization code.");
        }

        PendingAuthCode pending = pendingCodes.remove(code);
        if (pending == null || System.currentTimeMillis() > pending.expireAt) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_grant", "Authorization code is invalid or expired.");
        }
        if (!clientId.equals(pending.clientId)) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_grant", "Client ID mismatch.");
        }

        String redirectUri = StringUtils.trimToNull(params.get("redirect_uri"));
        if (redirectUri != null && !redirectUri.equals(pending.redirectUri)) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_grant", "Redirect URI mismatch.");
        }

        if (pending.codeChallenge != null) {
            String verifier = StringUtils.trimToNull(params.get("code_verifier"));
            if (!verifyPkce(pending.codeChallenge, pending.codeChallengeMethod, verifier)) {
                return oauthError(HttpStatus.BAD_REQUEST, "invalid_grant", "PKCE verification failed.");
            }
        }

        User user = userService.getById(pending.userId);
        if (user == null || !userMcpKeyService.isEligibleMember(user)) {
            return oauthError(HttpStatus.FORBIDDEN, "access_denied", "User membership is inactive or expired.");
        }

        return issueWorkBuddyTokenPair(user, clientId);
    }

    private ResponseEntity<Map<String, Object>> handleRefreshTokenGrant(
            Map<String, String> params, String clientId) {
        String refreshToken = StringUtils.trimToNull(params.get("refresh_token"));
        if (refreshToken == null) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_request", "Missing refresh_token.");
        }

        RefreshTokenClaims claims = parseAndVerifyRefreshToken(refreshToken, clientId);
        if (claims == null) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_grant", "Invalid or expired refresh_token.");
        }

        User user = userService.getById(claims.userId);
        if (user == null || !userMcpKeyService.isEligibleMember(user)) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_grant", "User membership is inactive or expired.");
        }

        // 若用户在个人中心手动吊销了该 WorkBuddy 设备凭证，则禁止静默续期
        List<McpKeyVO> activeKeys = userMcpKeyService.listMyKeys(user);
        boolean stillActive = activeKeys.stream().anyMatch(k -> claims.keyId.equals(k.getId()));
        if (!stillActive) {
            return oauthError(HttpStatus.BAD_REQUEST, "invalid_grant", "Device authorization has been revoked by user.");
        }

        return issueWorkBuddyTokenPair(user, clientId);
    }

    private ResponseEntity<Map<String, Object>> issueWorkBuddyTokenPair(User user, String clientId) {
        // 清理旧的同名 WorkBuddy 密钥，确保 WorkBuddy 始终最多只占 1 个设备槽位，不挤掉 Cursor/Claude 密钥
        List<McpKeyVO> existing = userMcpKeyService.listMyKeys(user);
        for (McpKeyVO k : existing) {
            if (WORKBUDDY_KEY_NAME.equals(k.getKeyName()) && k.getId() != null) {
                userMcpKeyService.revokeKey(k.getId(), user);
            }
        }

        McpKeyCreateVO created = userMcpKeyService.generateKey(WORKBUDDY_KEY_NAME, user);
        if (created == null || StringUtils.isBlank(created.getPlainKey()) || created.getId() == null) {
            return oauthError(HttpStatus.INTERNAL_SERVER_ERROR, "server_error", "Failed to generate MCP access token.");
        }

        String refreshToken = createRefreshToken(user.getId(), created.getId(), clientId);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("access_token", created.getPlainKey());
        body.put("token_type", "Bearer");
        body.put("expires_in", ACCESS_TOKEN_EXPIRES_IN_SECONDS);
        body.put("refresh_token", refreshToken);
        return ResponseEntity.ok(body);
    }

    /**
     * 校验回调地址是否命中 WorkBuddy / CodeBuddy 官方域名白名单（支持多级子域名）
     */
    public static boolean isAllowedRedirectUri(String redirectUri) {
        if (StringUtils.isBlank(redirectUri)) {
            return false;
        }
        try {
            URI uri = URI.create(redirectUri.trim());
            String scheme = StringUtils.lowerCase(uri.getScheme(), Locale.ROOT);
            String host = StringUtils.lowerCase(uri.getHost(), Locale.ROOT);
            if (StringUtils.isBlank(host)) {
                return false;
            }
            if ("127.0.0.1".equals(host) || "localhost".equals(host)) {
                return "http".equals(scheme) || "https".equals(scheme);
            }
            if (!"https".equals(scheme)) {
                return false;
            }
            return matchesWildcardDomain(host, "workbuddy.cn")
                    || matchesWildcardDomain(host, "codebuddy.cn")
                    || matchesWildcardDomain(host, "workbuddy.ai")
                    || "copilot.tencent.com".equals(host)
                    || "staging-codebuddy.tencent.com".equals(host);
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean matchesWildcardDomain(String host, String rootDomain) {
        return host.endsWith("." + rootDomain) && host.length() > rootDomain.length() + 1;
    }

    private boolean isValidClientId(String clientId) {
        return StringUtils.isNotBlank(configuredClientId)
                && StringUtils.isNotBlank(clientId)
                && configuredClientId.trim().equals(clientId.trim());
    }

    private boolean verifyPkce(String challenge, String method, String verifier) {
        if (StringUtils.isBlank(verifier)) {
            return false;
        }
        if ("plain".equalsIgnoreCase(method)) {
            return constantTimeEquals(challenge, verifier);
        }
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] digest = sha256.digest(verifier.getBytes(StandardCharsets.US_ASCII));
            String computed = Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
            return constantTimeEquals(challenge, computed);
        } catch (Exception e) {
            return false;
        }
    }

    private String createRefreshToken(Long userId, Long keyId, String clientId) {
        long exp = System.currentTimeMillis() + REFRESH_TOKEN_TTL_MS;
        String payload = userId + ":" + keyId + ":" + clientId + ":" + exp + ":" + randomUrlSafeToken(8);
        String payloadB64 = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String sig = hmacSha256UrlSafe(payloadB64, configuredClientSecret);
        return "omr_" + payloadB64 + "." + sig;
    }

    private RefreshTokenClaims parseAndVerifyRefreshToken(String token, String expectedClientId) {
        if (token == null || !token.startsWith("omr_")) {
            return null;
        }
        String raw = token.substring(4);
        int dot = raw.indexOf('.');
        if (dot <= 0 || dot >= raw.length() - 1) {
            return null;
        }
        String payloadB64 = raw.substring(0, dot);
        String sig = raw.substring(dot + 1);
        String expectedSig = hmacSha256UrlSafe(payloadB64, configuredClientSecret);
        if (!constantTimeEquals(expectedSig, sig)) {
            return null;
        }
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(payloadB64), StandardCharsets.UTF_8);
            String[] parts = decoded.split(":");
            if (parts.length < 4) {
                return null;
            }
            Long userId = Long.parseLong(parts[0]);
            Long keyId = Long.parseLong(parts[1]);
            String clientId = parts[2];
            long exp = Long.parseLong(parts[3]);
            if (!expectedClientId.equals(clientId) || System.currentTimeMillis() > exp) {
                return null;
            }
            return new RefreshTokenClaims(userId, keyId);
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, String> extractTokenParams(HttpServletRequest request, String rawBody) {
        Map<String, String> map = new LinkedHashMap<>();
        request.getParameterMap().forEach((k, v) -> {
            if (v != null && v.length > 0) {
                map.put(k, v[0]);
            }
        });

        if (StringUtils.isNotBlank(rawBody)) {
            String trimmed = rawBody.trim();
            if (trimmed.startsWith("{")) {
                try {
                    JsonNode node = objectMapper.readTree(trimmed);
                    node.fieldNames().forEachRemaining(fn -> {
                        JsonNode val = node.get(fn);
                        if (val != null && !val.isNull()) {
                            map.put(fn, val.asText());
                        }
                    });
                } catch (Exception ignored) {
                }
            } else {
                for (String pair : trimmed.split("&")) {
                    int idx = pair.indexOf('=');
                    if (idx > 0) {
                        String k = java.net.URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                        String v = java.net.URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                        map.putIfAbsent(k, v);
                    }
                }
            }
        }
        return map;
    }

    private String[] extractBasicAuth(HttpServletRequest request) {
        String auth = request.getHeader("Authorization");
        if (StringUtils.isBlank(auth) || !auth.trim().regionMatches(true, 0, "Basic ", 0, 6)) {
            return null;
        }
        try {
            String b64 = auth.trim().substring(6).trim();
            String decoded = new String(Base64.getDecoder().decode(b64), StandardCharsets.UTF_8);
            int colon = decoded.indexOf(':');
            if (colon < 0) {
                return null;
            }
            return new String[]{decoded.substring(0, colon), decoded.substring(colon + 1)};
        } catch (Exception e) {
            return null;
        }
    }

    private static String appendQueryParams(String baseUri, String code, String state) {
        StringBuilder sb = new StringBuilder(baseUri);
        sb.append(baseUri.contains("?") ? "&" : "?");
        sb.append("code=").append(urlEncode(code));
        if (StringUtils.isNotBlank(state)) {
            sb.append("&state=").append(urlEncode(state));
        }
        return sb.toString();
    }

    private static String urlEncode(String val) {
        return URLEncoder.encode(val, StandardCharsets.UTF_8);
    }

    private static String randomUrlSafeToken(int byteLen) {
        byte[] bytes = new byte[byteLen];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hmacSha256UrlSafe(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception e) {
            throw new IllegalStateException("HMAC-SHA256 calculation failed", e);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }

    private void pruneExpiredCodes() {
        long now = System.currentTimeMillis();
        pendingCodes.entrySet().removeIf(e -> now > e.getValue().expireAt);
    }

    private ResponseEntity<Map<String, Object>> oauthError(HttpStatus status, String error, String description) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", error);
        body.put("error_description", description);
        return ResponseEntity.status(status).body(body);
    }

    private void sendPlainError(HttpServletResponse response, int status, String error) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\":\"" + error + "\"}");
        response.getWriter().flush();
    }

    private record PendingAuthCode(
            Long userId,
            String clientId,
            String redirectUri,
            String codeChallenge,
            String codeChallengeMethod,
            long expireAt
    ) {
    }

    private record RefreshTokenClaims(Long userId, Long keyId) {
    }
}
