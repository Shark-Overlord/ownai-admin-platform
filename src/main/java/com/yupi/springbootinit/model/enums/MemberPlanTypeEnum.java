package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum MemberPlanTypeEnum {

    MONTH("month", 30),
    YEAR("year", 365),
    LIFETIME("lifetime", null);

    private final String value;
    private final Integer durationDays;

    MemberPlanTypeEnum(String value, Integer durationDays) {
        this.value = value;
        this.durationDays = durationDays;
    }

    public static MemberPlanTypeEnum getEnumByValue(String value) {
        if (StringUtils.isBlank(value)) {
            return null;
        }
        return Arrays.stream(values())
                .filter(item -> item.value.equalsIgnoreCase(value.trim()))
                .findFirst()
                .orElse(null);
    }

    public String getValue() {
        return value;
    }

    public Integer getDurationDays() {
        return durationDays;
    }

    public boolean isLifetime() {
        return this == LIFETIME;
    }
}
