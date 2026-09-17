package com.yupi.springbootinit.model.dto.artwork;

import java.io.Serializable;
import lombok.Data;

/**
 * 添加解构资产收藏请求
 */
@Data
public class DeconstructionAssetFavoriteAddRequest implements Serializable {

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

    private static final long serialVersionUID = 1L;
}