package com.yupi.springbootinit.model.dto.imagecatalog;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageCatalogVersionActionRequest implements Serializable {
    private Long catalogVersionId;
    private Long expectedActiveVersionId;
    private static final long serialVersionUID = 1L;
}
