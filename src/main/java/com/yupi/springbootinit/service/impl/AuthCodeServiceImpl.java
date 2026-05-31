package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.user.LoginCaptchaVO;
import com.yupi.springbootinit.service.AuthCodeService;
import com.yupi.springbootinit.service.UserService;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import javax.annotation.Resource;
import javax.imageio.ImageIO;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class AuthCodeServiceImpl implements AuthCodeService {

    private static final int LOGIN_CAPTCHA_EXPIRE_MILLIS = 5 * 60 * 1000;

    private static final int EMAIL_CODE_EXPIRE_MILLIS = 10 * 60 * 1000;

    private static final int LOGIN_CAPTCHA_MAX_FAIL_COUNT = 5;

    private static final int EMAIL_CODE_MAX_FAIL_COUNT = 5;

    private static final int EMAIL_SEND_INTERVAL_MILLIS = 60 * 1000;

    private static final int EMAIL_DAILY_LIMIT = 10;

    private static final int IP_DAILY_LIMIT = 50;

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final char[] CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

    private final SecureRandom random = new SecureRandom();

    private final Map<String, CodeRecord> loginCaptchaMap = new ConcurrentHashMap<>();

    private final Map<String, EmailCodeRecord> emailCodeMap = new ConcurrentHashMap<>();

    private final Map<String, DailyCounter> emailDailyCounterMap = new ConcurrentHashMap<>();

    private final Map<String, DailyCounter> ipDailyCounterMap = new ConcurrentHashMap<>();

    @Resource
    private UserService userService;

    @Autowired(required = false)
    private JavaMailSender javaMailSender;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Override
    public LoginCaptchaVO generateLoginCaptcha() {
        cleanExpiredCodes();
        String code = randomCode(5);
        String captchaId = "captcha_" + IdWorker.getIdStr();
        loginCaptchaMap.put(captchaId, new CodeRecord(code, System.currentTimeMillis() + LOGIN_CAPTCHA_EXPIRE_MILLIS));

        LoginCaptchaVO vo = new LoginCaptchaVO();
        vo.setCaptchaId(captchaId);
        vo.setImageBase64(createCaptchaImageBase64(code));
        vo.setImageUrl("");
        return vo;
    }

    @Override
    public void validateLoginCaptcha(String captchaId, String captchaCode) {
        if (StringUtils.isAnyBlank(captchaId, captchaCode)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Please enter captcha");
        }
        CodeRecord record = loginCaptchaMap.get(captchaId);
        if (record == null || record.isExpired()) {
            loginCaptchaMap.remove(captchaId);
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Captcha expired");
        }
        if (!StringUtils.equalsIgnoreCase(record.getCode(), StringUtils.trim(captchaCode))) {
            record.increaseFailCount();
            if (record.getFailCount() >= LOGIN_CAPTCHA_MAX_FAIL_COUNT) {
                loginCaptchaMap.remove(captchaId);
            }
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Captcha error");
        }
        loginCaptchaMap.remove(captchaId);
    }

    @Override
    public boolean sendRegisterEmailCode(String userEmail, String ip) {
        String normalizedEmail = normalizeEmail(userEmail);
        validateEmailFormat(normalizedEmail);
        if (isEmailRegistered(normalizedEmail)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Email already registered");
        }
        checkEmailSendRate(normalizedEmail, ip);

        String code = randomNumberCode(6);
        long now = System.currentTimeMillis();
        emailCodeMap.put(normalizedEmail,
                new EmailCodeRecord(code, now + EMAIL_CODE_EXPIRE_MILLIS, now));
        sendEmailCode(normalizedEmail, code);
        return true;
    }

    @Override
    public void validateEmailRegisterCode(String userEmail, String emailCode) {
        String normalizedEmail = normalizeEmail(userEmail);
        validateEmailFormat(normalizedEmail);
        if (StringUtils.isBlank(emailCode)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Please enter email code");
        }
        EmailCodeRecord record = emailCodeMap.get(normalizedEmail);
        if (record == null || record.isExpired()) {
            emailCodeMap.remove(normalizedEmail);
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Email code expired");
        }
        if (!StringUtils.equals(record.getCode(), StringUtils.trim(emailCode))) {
            record.increaseFailCount();
            if (record.getFailCount() >= EMAIL_CODE_MAX_FAIL_COUNT) {
                emailCodeMap.remove(normalizedEmail);
            }
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Email code error");
        }
    }

    @Override
    public void invalidateEmailRegisterCode(String userEmail) {
        String normalizedEmail = normalizeEmail(userEmail);
        if (StringUtils.isNotBlank(normalizedEmail)) {
            emailCodeMap.remove(normalizedEmail);
        }
    }

    private void checkEmailSendRate(String email, String ip) {
        EmailCodeRecord oldRecord = emailCodeMap.get(email);
        long now = System.currentTimeMillis();
        if (oldRecord != null && now - oldRecord.getLastSentAt() < EMAIL_SEND_INTERVAL_MILLIS) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Send too frequently");
        }
        increaseDailyCounter(emailDailyCounterMap, "email:" + email, EMAIL_DAILY_LIMIT, "Email daily limit reached");
        increaseDailyCounter(ipDailyCounterMap, "ip:" + StringUtils.defaultIfBlank(ip, "unknown"),
                IP_DAILY_LIMIT, "IP daily limit reached");
    }

    private void increaseDailyCounter(Map<String, DailyCounter> counterMap, String key, int limit, String message) {
        LocalDate today = LocalDate.now();
        DailyCounter counter = counterMap.compute(key, (ignored, oldCounter) -> {
            if (oldCounter == null || !today.equals(oldCounter.getDate())) {
                DailyCounter newCounter = new DailyCounter(today);
                newCounter.setCount(1);
                return newCounter;
            }
            oldCounter.setCount(oldCounter.getCount() + 1);
            return oldCounter;
        });
        if (counter.getCount() > limit) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, message);
        }
    }

    private void sendEmailCode(String email, String code) {
        if (javaMailSender == null || StringUtils.isBlank(mailFrom)) {
            log.warn("SMTP not configured, register email code for {} is {}", email, code);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(email);
            message.setSubject("OwnAI registration verification code");
            message.setText("Your OwnAI registration verification code is: " + code
                    + "\nThis code expires in 10 minutes. If you did not request it, ignore this email.");
            javaMailSender.send(message);
        } catch (Exception e) {
            log.error("send register email code failed, email={}", email, e);
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "Email send failed");
        }
    }

    private boolean isEmailRegistered(String email) {
        return userService.count(new QueryWrapper<User>().eq("userEmail", email).or().eq("userAccount", email)) > 0;
    }

    private void validateEmailFormat(String email) {
        if (StringUtils.isBlank(email) || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid email");
        }
    }

    private String normalizeEmail(String email) {
        return StringUtils.trimToEmpty(email).toLowerCase(Locale.ROOT);
    }

    private String randomCode(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(CAPTCHA_CHARS[random.nextInt(CAPTCHA_CHARS.length)]);
        }
        return builder.toString();
    }

    private String randomNumberCode(int length) {
        StringBuilder builder = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            builder.append(random.nextInt(10));
        }
        return builder.toString();
    }

    private String createCaptchaImageBase64(String code) {
        int width = 160;
        int height = 52;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            graphics.setColor(new Color(246, 248, 252));
            graphics.fillRect(0, 0, width, height);
            for (int i = 0; i < 8; i++) {
                graphics.setColor(randomColor(130, 230));
                graphics.setStroke(new BasicStroke(1.2f));
                graphics.drawLine(random.nextInt(width), random.nextInt(height),
                        random.nextInt(width), random.nextInt(height));
            }
            graphics.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 30));
            for (int i = 0; i < code.length(); i++) {
                graphics.setColor(randomColor(30, 120));
                int x = 20 + i * 26;
                int y = 34 + random.nextInt(8);
                int angle = random.nextInt(25) - 12;
                graphics.rotate(Math.toRadians(angle), x, y);
                graphics.drawString(String.valueOf(code.charAt(i)), x, y);
                graphics.rotate(Math.toRadians(-angle), x, y);
            }
            for (int i = 0; i < 40; i++) {
                graphics.setColor(randomColor(120, 240));
                graphics.fillOval(random.nextInt(width), random.nextInt(height), 2, 2);
            }
        } finally {
            graphics.dispose();
        }
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", outputStream);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(outputStream.toByteArray());
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "Captcha generate failed");
        }
    }

    private Color randomColor(int min, int max) {
        int bound = Math.max(max - min, 1);
        int red = min + random.nextInt(bound);
        int green = min + random.nextInt(bound);
        int blue = min + random.nextInt(bound);
        return new Color(Math.min(red, 255), Math.min(green, 255), Math.min(blue, 255));
    }

    private void cleanExpiredCodes() {
        loginCaptchaMap.entrySet().removeIf(entry -> entry.getValue().isExpired());
        emailCodeMap.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    @Data
    private static class CodeRecord {

        private final String code;

        private final long expireAt;

        private int failCount;

        private boolean isExpired() {
            return System.currentTimeMillis() > expireAt;
        }

        private void increaseFailCount() {
            failCount++;
        }
    }

    @Data
    private static class EmailCodeRecord {

        private final String code;

        private final long expireAt;

        private final long lastSentAt;

        private int failCount;

        private boolean isExpired() {
            return System.currentTimeMillis() > expireAt;
        }

        private void increaseFailCount() {
            failCount++;
        }
    }

    @Data
    private static class DailyCounter {

        private final LocalDate date;

        private int count;
    }
}
