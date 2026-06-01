package com.yupi.springbootinit.model.enums;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.apache.commons.lang3.ObjectUtils;

public enum FileUploadBizEnum {

    USER_AVATAR("用户头像", "user_avatar"),
    ARTWORK_COVER("作品封面", "artwork_cover"),
    PROMPT_ASSET_COVER("Prompt 资产封面", "prompt_asset_cover"),
    IMAGE_GENERATION_RESULT("图片生成结果", "image_generation_result"),
    ARTWORK_VIDEO("作品视频", "artwork_video"),
    ARTWORK_PROMPT("作品 Prompt", "artwork_prompt");

    private final String text;

    private final String value;

    FileUploadBizEnum(String text, String value) {
        this.text = text;
        this.value = value;
    }

    public static List<String> getValues() {
        return Arrays.stream(values()).map(item -> item.value).collect(Collectors.toList());
    }

    public static FileUploadBizEnum getEnumByValue(String value) {
        if (ObjectUtils.isEmpty(value)) {
            return null;
        }
        for (FileUploadBizEnum anEnum : FileUploadBizEnum.values()) {
            if (anEnum.value.equals(value)) {
                return anEnum;
            }
        }
        return null;
    }

    public String getValue() {
        return value;
    }

    public String getText() {
        return text;
    }
}
