package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum OrderTypeEnum {

    CASH("现金支付", "cash"),
    POINTS("积分兑换", "points");

    private final String text;

    private final String value;

    OrderTypeEnum(String text, String value) {
        this.text = text;
        this.value = value;
    }

    public static OrderTypeEnum getEnumByValue(String value) {
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
