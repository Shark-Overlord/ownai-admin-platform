package com.yupi.springbootinit.model.enums;

import java.util.Arrays;

public enum ArtworkStatusEnum {

    DRAFT("草稿", 0),
    PUBLISHED("已发布", 1);

    private final String text;

    private final Integer value;

    ArtworkStatusEnum(String text, Integer value) {
        this.text = text;
        this.value = value;
    }

    public static ArtworkStatusEnum getEnumByValue(Integer value) {
        if (value == null) {
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

    public Integer getValue() {
        return value;
    }
}
