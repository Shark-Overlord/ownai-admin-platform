package com.yupi.springbootinit.model.vo.artwork;

import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.model.vo.TagVO;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class ArtworkVO implements Serializable {

    private Long id;

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

    private Integer viewCount;

    private Integer sort;

    private CategoryVO category;

    private List<TagVO> tagList;

    private Boolean canAccessPrompt;

    private String htmlUrl;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
