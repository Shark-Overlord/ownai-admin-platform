package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum MemberLevelEnum {

    NORMAL("Normal", "normal", 1.0D, false),
    MEMBER("Member", "member", 1.0D, true);

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
                .filter(item -> item.value.equalsIgnoreCase(value.trim()))
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
