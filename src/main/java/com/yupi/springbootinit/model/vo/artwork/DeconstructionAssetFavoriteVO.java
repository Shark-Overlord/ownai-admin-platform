package com.yupi.springbootinit.model.vo.artwork;

import java.io.Serializable;
import java.util.Date;
import lombok.Data;

/**
 * 解构资产收藏展示 VO
 */
@Data
public class DeconstructionAssetFavoriteVO implements Serializable {

    private Long id;

    private Long userId;

    private Long artworkId;

    /**
     * 作品标题（可选展示）
     */
    private String artworkTitle;

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

    private static final long serialVersionUID = 1L;
}