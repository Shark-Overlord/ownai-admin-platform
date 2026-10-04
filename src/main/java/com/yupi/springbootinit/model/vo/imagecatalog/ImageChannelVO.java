package com.yupi.springbootinit.model.vo.imagecatalog;

import java.io.Serializable;
import lombok.Data;

@Data
public class ImageChannelVO implements Serializable {
    private Long id;
    private String code;
    private String name;
    private Integer sort;
    private Long publishedCount;
    private static final long serialVersionUID = 1L;
}
