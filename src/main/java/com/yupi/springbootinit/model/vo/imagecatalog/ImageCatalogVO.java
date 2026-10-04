package com.yupi.springbootinit.model.vo.imagecatalog;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class ImageCatalogVO implements Serializable {
    private Long versionId;
    private Long categoryId;
    private String assetType;
    private String name;
    private String status;
    private String sourceSha256;
    private Integer expectedAssetCount;
    private Long importedAssetCount;
    private List<ImageChannelVO> channels = new ArrayList<>();
    private static final long serialVersionUID = 1L;
}
