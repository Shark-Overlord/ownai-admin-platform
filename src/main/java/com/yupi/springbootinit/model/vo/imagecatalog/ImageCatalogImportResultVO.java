package com.yupi.springbootinit.model.vo.imagecatalog;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageCatalogImportResultVO implements Serializable {
    private Long batchId;
    private Integer recordCount;
    private Integer relationCount;
    private Boolean idempotentReplay;
    private static final long serialVersionUID = 1L;
}
