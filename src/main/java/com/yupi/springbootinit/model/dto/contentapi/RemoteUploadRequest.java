package com.yupi.springbootinit.model.dto.contentapi;

import java.io.Serializable;
import lombok.Data;

@Data
public class RemoteUploadRequest implements Serializable {

    /**
     * 远程图片地址（仅支持公开 HTTPS）
     */
    private String url;

    /**
     * 上传业务类型（如 artwork_cover, prompt_asset_cover, video_background_cover, blog_image）
     */
    private String biz;

    private static final long serialVersionUID = 1L;
}
