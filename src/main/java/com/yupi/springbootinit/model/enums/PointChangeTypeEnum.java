package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

public enum PointChangeTypeEnum {

    PURCHASE_REWARD("购买返积分", "purchase_reward"),
    REDEEM_CONSUME("积分兑换消耗", "redeem_consume"),
    IMAGE_GENERATE_FREEZE("图片生成冻结", "image_generate_freeze"),
    IMAGE_GENERATE_REFUND("图片生成退款", "image_generate_refund"),
    CHECK_IN_REWARD("每日签到奖励", "check_in_reward"),
    MANUAL_ADJUST("后台调整", "manual_adjust");

    private final String text;

    private final String value;

    PointChangeTypeEnum(String text, String value) {
        this.text = text;
        this.value = value;
    }

    public static PointChangeTypeEnum getEnumByValue(String value) {
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
