package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import java.util.List;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAddRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetFavoriteRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetQueryRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetUpdateRequest;
import com.yupi.springbootinit.model.entity.PromptAsset;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetImageSyncResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetImportResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetVO;
import org.springframework.web.multipart.MultipartFile;

public interface PromptAssetService extends IService<PromptAsset> {

    Page<PromptAssetVO> listPromptAssetVOByPage(PromptAssetQueryRequest request);

    Page<PromptAssetVO> listPublishedPromptAssetVOByPage(PromptAssetQueryRequest request);

    Page<PromptAssetVO> listPublishedPromptAssetVOByPage(PromptAssetQueryRequest request, User loginUser);

    PromptAssetVO getPromptAssetVO(Long id);

    PromptAssetVO getPublishedPromptAssetVO(Long id, User loginUser);

    Boolean addFavorite(PromptAssetFavoriteRequest request, User loginUser);

    Boolean cancelFavorite(PromptAssetFavoriteRequest request, User loginUser);

    Boolean isFavorited(Long promptAssetId, User loginUser);

    Page<PromptAssetVO> listMyFavoritePromptAssetVOByPage(PromptAssetQueryRequest request, User loginUser);

    Long addPromptAsset(PromptAssetAddRequest request);

    Boolean updatePromptAsset(PromptAssetUpdateRequest request);

    Boolean updatePromptAssetTags(PromptAssetUpdateRequest request);

    Boolean deletePromptAsset(Long id);

    Boolean deletePromptAssetBatch(List<Long> ids);

    Boolean publishPromptAssetBatch(List<Long> ids);

    PromptAssetImageSyncResultVO syncImagesToCos(List<Long> ids);

    PromptAssetImportResultVO importVisualPromptLibrary(MultipartFile file, Boolean dryRun, String assetTypeFilter,
            Long categoryId, Boolean syncTagsToCategory, Boolean uploadImagesToCos);
}
