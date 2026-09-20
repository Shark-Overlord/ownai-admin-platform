package com.yupi.springbootinit.model.dto.artwork;

import java.io.Serializable;
import lombok.Data;

/**
 * 取消解构资产收藏请求
 */
@Data
public class DeconstructionAssetFavoriteCancelRequest implements Serializable {

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

    private static final long serialVersionUID = 1L;
}