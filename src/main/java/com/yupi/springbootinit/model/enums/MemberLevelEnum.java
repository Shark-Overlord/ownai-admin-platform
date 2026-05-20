package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum MemberLevelEnum {

    NORMAL("普通会员", "normal", 1.0D, false),
    PLUS("Plus 会员", "plus", 1.2D, true),
    PRO("Pro 会员", "pro", 1.5D, true);

    private final String text;

    private final String value;

    private final double pointMultiplier;

    private final boolean canAccessMemberContent;

    MemberLevelEnum(String text, String value, double pointMultiplier, boolean canAccessMemberContent) {
        this.text = text;
        this.value = value;
        this.pointMultiplier = pointMultiplier;
        this.canAccessMemberContent = canAccessMemberContent;
    }

    public static MemberLevelEnum getEnumByValue(String value) {
        if (StringUtils.isBlank(value)) {
            return null;
        }
        return Arrays.stream(values())
                .filter(item -> item.value.equals(value))
                .findFirst()
                .orElse(null);
    }

    public String getText() {
        return text;
    }

    public String getValue() {
        return value;
    }

    public double getPointMultiplier() {
        return pointMultiplier;
    }

    public boolean canAccessMemberContent() {
        return canAccessMemberContent;
    }
}
