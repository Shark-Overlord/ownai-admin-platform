package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum OrderStatusEnum {

    PENDING("待支付", "pending"),
    PAID("已支付", "paid"),
    COMPLETED("已完成", "completed"),
    CANCELLED("已取消", "cancelled");

    private final String text;

    private final String value;

    OrderStatusEnum(String text, String value) {
        this.text = text;
        this.value = value;
    }

    public static OrderStatusEnum getEnumByValue(String value) {
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
