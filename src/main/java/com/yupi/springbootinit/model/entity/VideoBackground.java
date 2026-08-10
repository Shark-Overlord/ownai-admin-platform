package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

@TableName(value = "video_background")
@Data
public class VideoBackground implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    private String title;
    private String summary;
    private String promptContent;
    private String coverUrl;
    private String previewVideoUrl;
    private String sourceVideoUrl;
    private Long categoryId;
    private Integer memberOnly;
    private Integer status;
    private Integer videoWidth;
    private Integer videoHeight;
    private Long durationMs;
    private Long fileSize;
    private String videoFormat;
    private Long userId;
    private Integer sort;
    private Date createTime;
    private Date updateTime;

    @TableLogic
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}
