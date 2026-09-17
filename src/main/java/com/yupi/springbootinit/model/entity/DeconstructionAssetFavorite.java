package com.yupi.springbootinit.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

/**
 * 作品解构资产细粒度收藏
 */
@TableName(value = "deconstruction_asset_favorite")
@Data
public class DeconstructionAssetFavorite implements Serializable {

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 作品ID
     */
    private Long artworkId;

    /**
     * 资产类型: prompt | component | icon
     */
    private String assetType;

    /**
     * 作品内资产唯一键: 如 full, partId, iconName
     */
    private String assetKey;

    /**
     * 资产标题
     */
    private String title;

    /**
     * 标签或分类
     */
    private String tag;

    /**
     * 资产描述信息
     */
    private String description;

    /**
     * 核心内容(Prompt Markdown / 组件源码 / 图标SVG或代码)
     */
    private String content;

    /**
     * 扩展元数据JSON
     */
    private String metaData;

    /**
     * 创建时间
     */
    private Date createTime;

    /**
     * 更新时间
     */
    private Date updateTime;

    /**
     * 逻辑删除: 0-未删除, 1-已删除
     */
    private Integer isDelete;

    @TableField(exist = false)
    private static final long serialVersionUID = 1L;
}