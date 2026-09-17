package com.yupi.springbootinit.model.dto.artwork;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 分页查询解构资产收藏请求
 */
@EqualsAndHashCode(callSuper = true)
@Data
public class DeconstructionAssetFavoriteQueryRequest extends PageRequest implements Serializable {

    /**
     * 作品ID (可选过滤)
     */
    private Long artworkId;

    /**
     * 资产类型: prompt | component | icon (可选过滤)
     */
    private String assetType;

    /**
     * 搜索文本 (标题、标签或描述)
     */
    private String searchText;

    private static final long serialVersionUID = 1L;
}