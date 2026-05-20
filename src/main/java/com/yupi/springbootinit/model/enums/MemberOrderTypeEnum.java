package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum MemberOrderTypeEnum {

    CASH("现金开通", "cash"),
    POINTS("积分开通", "points"),
    ADMIN_GRANT("后台发放", "admin_grant");

    private final String text;

    private final String value;

    MemberOrderTypeEnum(String text, String value) {
        this.text = text;
        this.value = value;
    }

    public static MemberOrderTypeEnum getEnumByValue(String value) {
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
}
