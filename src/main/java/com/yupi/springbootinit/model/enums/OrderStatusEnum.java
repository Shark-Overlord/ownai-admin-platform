package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum OrderStatusEnum {

    PENDING("Pending payment", "pending"),
    PAID("Paid", "paid"),
    COMPLETED("Completed", "completed"),
    CANCELLED("Cancelled", "cancelled"),
    EXPIRED("Expired", "expired"),
    FAILED("Failed", "failed");

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
