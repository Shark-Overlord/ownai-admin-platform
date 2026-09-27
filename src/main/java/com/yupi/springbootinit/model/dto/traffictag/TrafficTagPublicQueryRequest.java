package com.yupi.springbootinit.model.dto.traffictag;

import java.io.Serializable;
import lombok.Data;

@Data
public class TrafficTagPublicQueryRequest implements Serializable {

    private String platform;
    private String category;
    private String status;
    private String sort;

    private static final long serialVersionUID = 1L;
}
