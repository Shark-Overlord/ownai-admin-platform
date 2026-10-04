package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogCreateRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogImportRequest;
import com.yupi.springbootinit.model.dto.imagecatalog.ImageCatalogVersionActionRequest;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogImportResultVO;
import com.yupi.springbootinit.model.vo.imagecatalog.ImageCatalogVO;
import java.util.Map;

public interface ImageCatalogService {
    Map<String, Object> ensureSchema();
    Map<String, Object> preflight(Long categoryId, String assetType);
    ImageCatalogVO getActiveCatalog(Long categoryId, String assetType);
    ImageCatalogVO getVersion(Long versionId);
    Long createVersion(ImageCatalogCreateRequest request, Long userId);
    ImageCatalogImportResultVO importMembers(ImageCatalogImportRequest request, Long userId);
    ImageCatalogVO reviewVersion(ImageCatalogVersionActionRequest request, Long userId);
    ImageCatalogVO activateVersion(ImageCatalogVersionActionRequest request, Long userId);
    ImageCatalogVO deactivateVersion(ImageCatalogVersionActionRequest request, Long userId);
}
