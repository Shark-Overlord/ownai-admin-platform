package com.yupi.springbootinit.model.dto.artwork;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import lombok.Data;

@Data
public class ArtworkAddRequest implements Serializable {

    private String title;

    private String summary;

    private String description;

    private String coverUrl;

    private String videoUrl;

    private String promptContent;

    private Long categoryId;

    private BigDecimal cashPrice;

    private Integer pointsPrice;

    private Integer memberOnly;

    private Integer status;

    private Integer sort;

    private String htmlUrl;

    private List<Long> tagIdList;

    private String apiSecret;

    private static final long serialVersionUID = 1L;
}
