package com.yupi.springbootinit.model.vo.videobackground;

import com.yupi.springbootinit.model.vo.CategoryVO;
import com.yupi.springbootinit.model.vo.TagVO;
import java.io.Serializable;
import java.util.Date;
import java.util.List;
import lombok.Data;

@Data
public class VideoBackgroundVO implements Serializable {
    private Long id;
    private String title;
    private String summary;
    private String promptContent;
    private String coverUrl;
    private String previewVideoUrl;
    private String sourceVideoUrl;
    private Long categoryId;
    private CategoryVO category;
    private List<TagVO> tagList;
    private Integer memberOnly;
    private Integer status;
    private Integer videoWidth;
    private Integer videoHeight;
    private Double videoAspectRatio;
    private Long durationMs;
    private Long fileSize;
    private String videoFormat;
    private Integer sort;
    private Boolean canAccess;
    private Integer favoriteCount;
    private Boolean favorited;
    private Date createTime;
    private Date updateTime;
    private static final long serialVersionUID = 1L;
}
