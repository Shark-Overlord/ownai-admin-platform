package com.yupi.springbootinit.model.dto.imagecatalog;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class ImageCatalogCreateRequest implements Serializable {
    private Long categoryId;
    private String assetType;
    private String name;
    private String sourceSha256;
    private Integer expectedAssetCount;
    private List<ChannelInput> channels;

    @Data
    public static class ChannelInput implements Serializable {
        private String code;
        private String name;
        private Integer sort;
        private static final long serialVersionUID = 1L;
    }

    private static final long serialVersionUID = 1L;
}
